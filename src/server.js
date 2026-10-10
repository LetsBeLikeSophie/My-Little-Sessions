'use strict';
// Local-only HTTP server: receives hook events from Claude Code, streams office state to the
// window, and answers permission requests when the person clicks approve or deny.
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Office } = require('./sessions');
const hooksConfig = require('./hooks-config');

const DEFAULT_PORT = 47821;
const MAX_BODY = 32 * 1024 * 1024;
const HOLD_MS = (600 - 15) * 1000;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8' };
const SKINS = ['auto', 'human', 'cat', 'dog', 'bear', 'rabbit'];

const decisionBody = behavior => JSON.stringify({
  hookSpecificOutput: {
    hookEventName: 'PermissionRequest',
    decision: behavior === 'allow' ? { behavior: 'allow' } : { behavior: 'deny', message: 'Denied by the user in My Little Sessions.' }
  }
});

function safeEqual(a, b) {
  const x = Buffer.from(String(a)), y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function loadConfig(file) {
  let saved = {};
  try { saved = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { /* first run */ }
  return {
    hookToken: /^[a-f0-9]{32}$/.test(saved.hookToken) ? saved.hookToken : crypto.randomBytes(16).toString('hex'),
    skin: SKINS.includes(saved.skin) ? saved.skin : 'auto',
    approvals: saved.approvals !== false,
    onTop: saved.onTop === true
  };
}

function createServer(options = {}) {
  const port = options.port ?? DEFAULT_PORT;
  const configDir = options.configDir;
  const configFile = path.join(configDir, 'config.json');
  const sessionsFile = path.join(configDir, 'sessions.json');
  const uiDir = options.uiDir || path.join(__dirname, 'ui');
  const settingsFile = options.settingsFile || hooksConfig.settingsPath();
  const platform = options.platform || process.platform;
  const office = new Office();
  const uiKey = crypto.randomBytes(16).toString('hex');
  const held = new Map();      // pending id -> { res, timer }
  const streams = new Set();   // open event streams to the window
  let config = null;
  let server = null;
  let boundPort = port;
  let timers = [];
  let queued = false;
  let saveTimer = null;
  let scan = null, rescan = false;
  let watcher = null, watchTimer = null;
  const seen = new Map();   // file name -> { mtimeMs, size, rec }: unchanged files are not read again
  // Claude Code keeps one small file per running process here, including its Remote Control id.
  const claudeSessionsDir = options.claudeSessionsDir || path.join(path.dirname(settingsFile), 'sessions');

  const saveConfig = () => { fs.mkdirSync(configDir, { recursive: true }); fs.writeFileSync(configFile, JSON.stringify(config, null, 2) + '\n'); };

  const snapshot = () => ({
    version: options.version || '0.0.0',
    hooks: { ...hooksConfig.status(settingsFile, boundPort, config.hookToken), path: settingsFile },
    settings: { skin: config.skin, approvals: config.approvals, onTop: config.onTop },
    desktop: options.desktop === true,
    canNew: typeof options.onNew === 'function',
    sessions: office.snapshot()
  });

  function broadcast() {
    if (queued) return;
    queued = true;
    setTimeout(() => {
      queued = false;
      const frame = `data: ${JSON.stringify(snapshot())}\n\n`;
      for (const res of streams) res.write(frame);
    }, 20);
  }

  function reply(pendingId, body) {
    const entry = held.get(pendingId);
    if (!entry) return false;
    held.delete(pendingId);
    clearTimeout(entry.timer);
    entry.res.writeHead(200, body ? { 'Content-Type': 'application/json' } : {});
    entry.res.end(body);
    return true;
  }

  // Remember who is in the office, so reopening the app shows the same sessions.
  const saveSessions = () => { try { fs.writeFileSync(sessionsFile, JSON.stringify(office.export())); } catch (e) { /* not worth failing over */ } };
  office.on('change', () => { clearTimeout(saveTimer); saveTimer = setTimeout(saveSessions, 500); });
  office.on('change', broadcast);
  office.on('release', id => reply(id, ''));

  const alive = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code !== 'ESRCH'; } };

  // Which sessions have Remote Control connected, from Claude Code's per-process session files.
  // A file only says so once Remote Control was turned on or off in that process; until then the
  // session is left out and its hooks decide.
  function scanRemote() {
    if (scan) { rescan = true; return scan; }   // a change seen mid-scan gets another pass
    scan = (async () => { do { rescan = false; await scanOnce(); } while (rescan); })().finally(() => { scan = null; });
    return scan;
  }

  async function scanOnce() {
    const found = new Map();   // session id -> { remote, at }
    let names = [];
    try { names = (await fs.promises.readdir(claudeSessionsDir)).filter(n => /^\d+\.json$/.test(n)); } catch (e) { /* no folder yet */ }
    for (const name of [...seen.keys()]) if (!names.includes(name)) seen.delete(name);
    for (const name of names) {
      const file = path.join(claudeSessionsDir, name);
      let rec;
      try {
        const st = await fs.promises.stat(file);
        const memo = seen.get(name);
        if (memo && memo.mtimeMs === st.mtimeMs && memo.size === st.size) rec = memo.rec;
        else {
          rec = st.size > 256 * 1024 ? null : JSON.parse(await fs.promises.readFile(file, 'utf8'));
          seen.set(name, { mtimeMs: st.mtimeMs, size: st.size, rec });
        }
      } catch (e) { continue; }   // removed or half-written; the next change brings it back
      if (!rec || typeof rec.sessionId !== 'string' || !('bridgeSessionId' in rec)) continue;
      if (Number.isInteger(rec.pid) && !alive(rec.pid)) continue;
      const at = Number(rec.updatedAt) || 0;
      const prev = found.get(rec.sessionId);
      if (!prev || at >= prev.at) found.set(rec.sessionId, { remote: typeof rec.bridgeSessionId === 'string' && rec.bridgeSessionId !== '', at });
    }
    office.setFileRemote(new Map([...found].map(([id, v]) => [id, v.remote])));
  }

  // React to changes in Claude Code's session folder instead of polling it; a slow timer covers
  // the folder appearing later and any change the watcher misses.
  function watchSessions() {
    if (watcher) return;
    try {
      watcher = fs.watch(claudeSessionsDir, () => {
        clearTimeout(watchTimer);
        watchTimer = setTimeout(() => scanRemote().catch(() => {}), 150);
      });
      watcher.on('error', () => { try { watcher.close(); } catch (e) { /* already closed */ } watcher = null; });
    } catch (e) { watcher = null; }
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const chunks = []; let size = 0;
      req.on('data', c => { size += c.length; if (size <= MAX_BODY) chunks.push(c); });
      req.on('end', () => size > MAX_BODY ? reject(new Error('too large')) : resolve(Buffer.concat(chunks).toString('utf8')));
      req.on('error', reject);
    });
  }

  const send = (res, code, body, type) => { res.writeHead(code, type ? { 'Content-Type': type } : {}); res.end(body || ''); };
  const json = (res, code, obj) => send(res, code, JSON.stringify(obj), 'application/json');

  async function onHook(req, res, token, url) {
    if (!safeEqual(token, config.hookToken)) return send(res, 404);
    let evt;
    try { evt = JSON.parse(await readBody(req)); } catch (e) { return send(res, 200); }
    // "rc" is the Remote Control id when connected; empty or an unexpanded %NAME% means it is off.
    const rc = url.searchParams.get('rc');
    const remote = rc === null ? undefined : rc !== '' && !rc.includes('%');
    const known = office.sessions.has(evt && evt.session_id);
    const pending = office.handle(evt, { canDecide: config.approvals, remote });
    if (!known) scanRemote().catch(() => {});   // a newcomer should arrive with its headset already right
    // Anything written back is read by Claude Code, so stay silent unless this is a decision.
    if (!pending || !pending.canDecide) return send(res, 200);
    const timer = setTimeout(() => { if (reply(pending.id, '')) office.settle(pending.id, null); }, HOLD_MS);
    held.set(pending.id, { res, timer });
    res.on('close', () => {
      if (!held.has(pending.id)) return;
      held.delete(pending.id); clearTimeout(timer);
      office.settle(pending.id, null);   // answered in Claude itself, or the session went away
    });
    if (options.onAttention) options.onAttention();
  }

  async function onApi(req, res, url) {
    const origin = req.headers.origin;
    if (origin && origin !== `http://127.0.0.1:${boundPort}` && origin !== `http://localhost:${boundPort}`) return send(res, 403);
    const key = req.headers['x-mls-key'] || url.searchParams.get('k') || '';
    if (!safeEqual(key, uiKey)) return send(res, 403);

    if (url.pathname === '/api/events' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-store', Connection: 'keep-alive' });
      res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
      streams.add(res);
      req.on('close', () => streams.delete(res));
      return;
    }
    if (req.method !== 'POST') return send(res, 405);
    let body;
    try { body = JSON.parse(await readBody(req) || '{}'); } catch (e) { return send(res, 400); }

    switch (url.pathname) {
      case '/api/decide': {
        const outcome = ['allow', 'deny', 'pass'].includes(body.decision) ? body.decision : null;
        if (!outcome || !held.has(String(body.pending))) return json(res, 409, { ok: false });
        reply(String(body.pending), outcome === 'pass' ? '' : decisionBody(outcome));
        office.settle(String(body.pending), outcome === 'pass' ? null : outcome);
        return json(res, 200, { ok: true });
      }
      case '/api/dismiss':
        return json(res, 200, { ok: office.dismiss(String(body.session)) });
      case '/api/new': {
        // Only for a project that already has a session in the office.
        const s = office.snapshot().find(x => x.team === String(body.team));
        if (!s || !s.project || !options.onNew) return json(res, 200, { ok: false });
        try { await options.onNew(s.project); return json(res, 200, { ok: true }); }
        catch (e) { return json(res, 200, { ok: false }); }
      }
      case '/api/hooks':
        try {
          if (body.action === 'install') hooksConfig.install(settingsFile, boundPort, config.hookToken, platform);
          else if (body.action === 'uninstall') hooksConfig.uninstall(settingsFile);
          else return send(res, 400);
        } catch (e) { broadcast(); return json(res, 200, { ok: false, message: e.message }); }
        broadcast();
        return json(res, 200, { ok: true });
      case '/api/settings':
        if (SKINS.includes(body.skin)) config.skin = body.skin;
        if (typeof body.approvals === 'boolean') config.approvals = body.approvals;
        if (typeof body.onTop === 'boolean') config.onTop = body.onTop;
        saveConfig();
        if (options.onSettings) options.onSettings({ ...config });
        broadcast();
        return json(res, 200, { ok: true });
      default:
        return send(res, 404);
    }
  }

  function onStatic(req, res, url) {
    const rel = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(uiDir, rel);
    if (!/^[\w./-]+$/.test(rel) || rel.includes('..') || !file.startsWith(uiDir + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return send(res, 404);
    res.writeHead(200, {
      'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'self'; img-src 'self' data:; frame-ancestors 'none'",
      'X-Content-Type-Options': 'nosniff'
    });
    fs.createReadStream(file).pipe(res);
  }

  function onRequest(req, res) {
    // Only this machine may talk to the server, and only by its loopback name.
    const host = req.headers.host || '';
    if (host !== `127.0.0.1:${boundPort}` && host !== `localhost:${boundPort}`) return send(res, 403);
    const url = new URL(req.url, `http://127.0.0.1:${boundPort}`);
    const done = p => Promise.resolve(p).catch(() => { if (!res.headersSent) send(res, 500); });
    if (req.method === 'POST' && url.pathname.startsWith(hooksConfig.MARK)) return done(onHook(req, res, url.pathname.slice(hooksConfig.MARK.length), url));
    if (url.pathname.startsWith('/api/')) return done(onApi(req, res, url));
    if (url.pathname === '/health') return json(res, 200, { app: 'my-little-sessions', version: options.version || '0.0.0' });
    if (req.method === 'GET') return onStatic(req, res, url);
    send(res, 405);
  }

  function start() {
    config = loadConfig(configFile);
    saveConfig();
    try { office.restore(JSON.parse(fs.readFileSync(sessionsFile, 'utf8'))); } catch (e) { /* nothing saved yet */ }
    return new Promise((resolve, reject) => {
      server = http.createServer(onRequest);
      server.once('error', reject);
      server.listen(port, '127.0.0.1', () => {
        boundPort = server.address().port;
        timers = [
          setInterval(() => { for (const res of streams) res.write(': keep-alive\n\n'); }, 25000),
          setInterval(() => { office.sweep(); broadcast(); }, 60000),   // also notices outside edits to settings.json
          setInterval(() => { watchSessions(); scanRemote().catch(() => {}); }, 15000)
        ];
        watchSessions();
        scanRemote().catch(() => {});
        timers.forEach(t => t.unref());
        resolve(api);
      });
    });
  }

  function stop() {
    timers.forEach(clearInterval);
    clearTimeout(watchTimer);
    if (watcher) { watcher.close(); watcher = null; }
    clearTimeout(saveTimer);
    if (config) saveSessions();
    for (const id of [...held.keys()]) reply(id, '');
    for (const res of streams) res.end();
    streams.clear();
    return new Promise(resolve => { if (!server) return resolve(); server.close(() => resolve()); server.closeAllConnections(); });
  }

  const api = {
    start, stop, office, uiKey, scanRemote,
    get port() { return boundPort; },
    get url() { return `http://127.0.0.1:${boundPort}`; },
    get hookUrl() { return hooksConfig.hookUrl(boundPort, config.hookToken); },
    get config() { return { ...config }; },
    get settingsFile() { return settingsFile; }
  };
  return api;
}

module.exports = { createServer, DEFAULT_PORT };

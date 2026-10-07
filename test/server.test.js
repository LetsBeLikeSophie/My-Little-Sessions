'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createServer } = require('../src/server');

const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, label) {
  for (let i = 0; i < 200; i++) { const v = await fn(); if (v) return v; await sleep(10); }
  throw new Error('timed out waiting for ' + label);
}

async function boot(t, extra = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mls-srv-'));
  const srv = createServer({ port: 0, configDir: dir, settingsFile: path.join(dir, 'claude', 'settings.json'), version: '9.9.9', ...extra });
  await srv.start();
  t.after(() => srv.stop());
  const hook = (evt, opts = {}) => fetch(srv.hookUrl, { method: 'POST', body: JSON.stringify({ session_id: 's1', cwd: '/home/sophie/blog-api', ...evt }), ...opts });
  const api = (p, body, headers = { 'x-mls-key': srv.uiKey }) => fetch(srv.url + p, { method: 'POST', headers, body: JSON.stringify(body) });
  const pending = () => { const s = srv.office.snapshot()[0]; return s && s.pending[0]; };
  return { srv, dir, hook, api, pending };
}

test('hook events need the right token and never write anything back', async t => {
  const { srv, hook } = await boot(t);
  const bad = await fetch(srv.url + '/mls-hook/' + '0'.repeat(32), { method: 'POST', body: '{}' });
  assert.equal(bad.status, 404);
  for (const name of ['SessionStart', 'UserPromptSubmit', 'PreToolUse', 'Stop']) {
    const res = await hook({ hook_event_name: name, tool_name: 'Bash', tool_input: { command: 'ls' } });
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '', name + ' must reply with an empty body');
  }
  const junk = await fetch(srv.hookUrl, { method: 'POST', body: 'not json' });
  assert.equal(junk.status, 200);
  assert.equal(srv.office.snapshot()[0].name, 'blog-api');
});

test('the window API rejects callers without the key, other origins and other host names', async t => {
  const { srv, api } = await boot(t);
  assert.equal((await api('/api/settings', { skin: 'cat' }, {})).status, 403);
  assert.equal((await api('/api/settings', { skin: 'cat' }, { 'x-mls-key': srv.uiKey, Origin: 'https://evil.example' })).status, 403);
  assert.equal((await fetch(srv.url + '/api/events')).status, 403);
  const viaOtherHost = await new Promise(resolve => {
    http.get({ host: '127.0.0.1', port: srv.port, path: '/health', headers: { Host: 'evil.example' } }, res => { res.resume(); resolve(res.statusCode); });
  });
  assert.equal(viaOtherHost, 403);
  assert.equal(srv.config.skin, 'auto');
  assert.equal((await api('/api/settings', { skin: 'cat', onTop: true })).status, 200);
  assert.equal(srv.config.skin, 'cat');
  assert.equal(srv.config.onTop, true);
});

test('the event stream sends the office state and updates on each hook', async t => {
  const { srv, hook } = await boot(t);
  const res = await fetch(`${srv.url}/api/events?k=${srv.uiKey}`);
  const reader = res.body.getReader();
  const frames = [];
  (async () => {
    let buf = '';
    for (;;) {
      const { value, done } = await reader.read().catch(() => ({ done: true }));
      if (done) return;
      buf += Buffer.from(value).toString();
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) { const f = buf.slice(0, i); buf = buf.slice(i + 2); if (f.startsWith('data: ')) frames.push(JSON.parse(f.slice(6))); }
    }
  })();
  const first = await until(() => frames[0], 'first frame');
  assert.equal(first.version, '9.9.9');
  assert.deepEqual(first.sessions, []);
  assert.equal(first.hooks.state, 'none');
  await hook({ hook_event_name: 'UserPromptSubmit' });
  const next = await until(() => frames.find(f => f.sessions.length), 'session frame');
  assert.equal(next.sessions[0].state, 'working');
  await reader.cancel();
});

test('approve, deny and pass answer the held permission request', async t => {
  const { srv, hook, api, pending } = await boot(t);
  const ask = () => hook({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'git push' } });

  let waiting = ask();
  let p = await until(pending, 'pending approval');
  assert.equal(p.canDecide, true);
  assert.equal((await api('/api/decide', { pending: p.id, decision: 'allow' })).status, 200);
  assert.deepEqual(await (await waiting).json(), { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
  assert.equal(srv.office.snapshot()[0].state, 'working');

  waiting = ask();
  p = await until(pending, 'pending approval');
  await api('/api/decide', { pending: p.id, decision: 'deny' });
  const denied = await (await waiting).json();
  assert.equal(denied.hookSpecificOutput.decision.behavior, 'deny');
  assert.equal(typeof denied.hookSpecificOutput.decision.message, 'string');

  waiting = ask();
  p = await until(pending, 'pending approval');
  await api('/api/decide', { pending: p.id, decision: 'pass' });
  assert.equal(await (await waiting).text(), '');
  assert.equal(pending(), undefined);

  assert.equal((await api('/api/decide', { pending: p.id, decision: 'allow' })).status, 409);
});

test('a request answered elsewhere is released: aborted call, later tool result, session end', async t => {
  const { hook, pending, srv } = await boot(t);
  const ask = opts => hook({ hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'npm publish' } }, opts);

  const ac = new AbortController();
  const aborted = ask({ signal: ac.signal }).catch(e => e.name);
  await until(pending, 'pending approval');
  ac.abort();
  assert.equal(await aborted, 'AbortError');
  await until(() => !pending(), 'pending cleared after abort');

  let waiting = ask();
  await until(pending, 'pending approval');
  await hook({ hook_event_name: 'PostToolUse', tool_name: 'Bash' });
  assert.equal(await (await waiting).text(), '');

  waiting = ask();
  await until(pending, 'pending approval');
  await hook({ hook_event_name: 'SessionEnd', reason: 'other' });
  assert.equal(await (await waiting).text(), '');
  assert.equal(srv.office.snapshot().length, 0);
});

test('with approvals turned off the request is not held', async t => {
  const { hook, api, pending } = await boot(t);
  await api('/api/settings', { approvals: false });
  const res = await hook({ hook_event_name: 'PermissionRequest', tool_name: 'Edit', tool_input: { file_path: '/a/.env' } });
  assert.equal(await res.text(), '');
  assert.equal(pending().canDecide, false);
});

test('connect and disconnect edit the Claude Code settings file', async t => {
  const { srv, api } = await boot(t);
  assert.deepEqual(await (await api('/api/hooks', { action: 'install' })).json(), { ok: true });
  const settings = JSON.parse(fs.readFileSync(srv.settingsFile, 'utf8'));
  assert.ok(JSON.stringify(settings.hooks.Stop).includes(srv.hookUrl));
  await api('/api/hooks', { action: 'uninstall' });
  assert.deepEqual(JSON.parse(fs.readFileSync(srv.settingsFile, 'utf8')), {});
});

test('dismiss removes a session', async t => {
  const { srv, hook, api } = await boot(t);
  await hook({ hook_event_name: 'SessionStart' });
  assert.equal((await api('/api/open', { session: 's1' })).status, 404);
  assert.deepEqual(await (await api('/api/dismiss', { session: 's1' })).json(), { ok: true });
  assert.equal(srv.office.snapshot().length, 0);
});

test('the page and health check are served, other paths are not', async t => {
  const { srv } = await boot(t);
  const page = await fetch(srv.url + '/');
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-type'), /text\/html/);
  assert.deepEqual(await (await fetch(srv.url + '/health')).json(), { app: 'my-little-sessions', version: '9.9.9' });
  assert.equal((await fetch(srv.url + '/..%2Fserver.js')).status, 404);
  assert.equal((await fetch(srv.url + '/nope.js')).status, 404);
});

test('the hook token and the sessions survive a restart', async t => {
  const { srv, dir, hook } = await boot(t);
  await hook({ hook_event_name: 'UserPromptSubmit' });
  const token = srv.hookUrl.split('/').pop();
  await srv.stop();
  const again = createServer({ port: 0, configDir: dir, settingsFile: path.join(dir, 'x.json') });
  await again.start();
  t.after(() => again.stop());
  assert.equal(again.hookUrl.split('/').pop(), token);
  assert.notEqual(again.uiKey, srv.uiKey);
  assert.deepEqual(again.office.snapshot().map(s => [s.name, s.state]), [['blog-api', 'waiting']]);
});

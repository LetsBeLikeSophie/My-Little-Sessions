'use strict';
// Turns Claude Code hook events into the state of each session ("employee") in the office.
const { EventEmitter } = require('events');

const STALE_MS = 12 * 60 * 60 * 1000;
const SLEEP_MS = 5 * 60 * 1000;   // a waiting session with no activity for this long dozes off
const KNOWN = new Set([
  'SessionStart', 'UserPromptSubmit', 'PreToolUse', 'PostToolUse', 'PostToolUseFailure',
  'PermissionRequest', 'PermissionDenied', 'Notification', 'SubagentStart', 'SubagentStop',
  'Stop', 'StopFailure', 'SessionEnd'
]);
// Notification types that mean "Claude is waiting for the person".
const NEEDS_PERSON = new Set(['permission_prompt', 'elicitation_dialog', 'elicitation_url_dialog', 'agent_needs_input']);

function baseName(cwd) {
  const parts = String(cwd || '').split(/[\\/]+/).filter(Boolean);
  return parts[parts.length - 1] || 'session';
}

// The project a session belongs to: its folder, or the main checkout when it runs in a worktree.
function projectRoot(cwd) {
  return String(cwd || '').replace(/[\\/]+$/, '').replace(/[\\/]\.claude[\\/]worktrees[\\/].*$/, '');
}

// Sessions with the same key sit at the same desk. Windows paths compare without regard to case.
function teamKey(project) {
  const p = project.replace(/\\/g, '/');
  return /^[a-zA-Z]:\//.test(p) || project.includes('\\') ? p.toLowerCase() : p;
}

function clip(text, max) {
  const s = String(text).replace(/\s+/g, ' ').trim();
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

// What a tool call is about, as text. `short` keeps it to a file name or the start of a command.
function describe(input, short) {
  if (!input || typeof input !== 'object') return '';
  const keys = ['command', 'file_path', 'notebook_path', 'path', 'pattern', 'url', 'query', 'description', 'prompt', 'skill'];
  const key = keys.find(k => typeof input[k] === 'string' && input[k]);
  if (!key) {
    const json = JSON.stringify(input);
    return json === '{}' ? '' : clip(json, short ? 48 : 600);
  }
  const value = input[key];
  if (short && (key === 'file_path' || key === 'notebook_path' || key === 'path')) return baseName(value);
  return clip(value, short ? 48 : 600);
}

class Office extends EventEmitter {
  constructor(options = {}) {
    super();
    this.now = options.now || Date.now;
    this.sessions = new Map();
    this.seq = 0;
  }

  // Returns the pending approval when the event is a permission request, otherwise null.
  handle(evt, options = {}) {
    const id = evt && evt.session_id;
    const name = evt && evt.hook_event_name;
    if (typeof id !== 'string' || !id || !KNOWN.has(name)) return null;

    if (name === 'SessionEnd') {
      const gone = this.sessions.get(id);
      if (gone) {
        gone.pending.forEach(p => this.emit('release', p.id));
        this.sessions.delete(id);
        this.emit('change');
      }
      return null;
    }

    let s = this.sessions.get(id);
    if (!s) {
      s = { id, name: '', title: '', cwd: '', base: 'waiting', ev: '', subagents: 0, pending: [], error: '', remote: null, startedAt: this.now(), lastAt: 0 };
      this.sessions.set(id, s);
    }
    s.lastAt = this.now();
    if (typeof options.remote === 'boolean') s.remote = options.remote;   // is Remote Control connected right now
    if (!s.cwd && typeof evt.cwd === 'string') s.cwd = evt.cwd;
    if (typeof evt.session_title === 'string' && evt.session_title) s.title = evt.session_title;
    s.name = s.title || baseName(s.cwd);

    const inSubagent = Boolean(evt.agent_id);
    const tool = typeof evt.tool_name === 'string' ? evt.tool_name : '';
    const label = (...parts) => parts.filter(Boolean).join(' ');
    let created = null;

    switch (name) {
      case 'SessionStart':
        s.base = 'waiting'; s.error = '';
        if (evt.source !== 'compact') s.subagents = 0;
        this.clearPending(s, () => true);
        s.ev = label('SessionStart ·', evt.source || 'startup');
        break;
      case 'UserPromptSubmit':
        s.base = 'working'; s.error = '';
        this.clearPending(s, p => !p.canDecide);
        s.ev = 'UserPromptSubmit';
        break;
      case 'PreToolUse':
        if (!inSubagent) { s.base = 'working'; this.clearPending(s, p => !p.canDecide); }
        s.ev = label('PreToolUse ·', tool, describe(evt.tool_input, true));
        break;
      case 'PostToolUse':
      case 'PostToolUseFailure':
      case 'PermissionDenied': {
        if (!inSubagent) s.base = 'working';
        const first = s.pending.find(p => !p.tool || p.tool === tool);
        if (first) this.clearPending(s, p => p === first);
        s.ev = label(name, '·', tool);
        break;
      }
      case 'PermissionRequest':
        created = { id: String(++this.seq), tool, text: describe(evt.tool_input, false), canDecide: Boolean(options.canDecide) };
        this.clearPending(s, p => !p.canDecide);
        s.pending.push(created);
        s.ev = label('PermissionRequest ·', tool, describe(evt.tool_input, true));
        break;
      case 'Notification': {
        const type = evt.notification_type;
        if (type === 'idle_prompt') { s.base = 'waiting'; s.ev = 'Notification · idle_prompt'; break; }
        if (!NEEDS_PERSON.has(type)) return null;
        if (!s.pending.length) s.pending.push({ id: String(++this.seq), tool: '', text: clip(evt.message || '', 600), canDecide: false });
        s.ev = label('Notification ·', type);
        break;
      }
      case 'SubagentStart':
        s.subagents += 1;
        s.ev = label('SubagentStart ·', evt.agent_type);
        break;
      case 'SubagentStop':
        s.subagents = Math.max(0, s.subagents - 1);
        s.ev = label('SubagentStop ·', evt.agent_type);
        break;
      case 'Stop':
        s.base = 'waiting';
        this.clearPending(s, () => true);
        s.ev = 'Stop';
        break;
      case 'StopFailure':
        s.base = 'waiting';
        s.error = String(evt.error_type || evt.error || 'error');
        this.clearPending(s, () => true);
        s.ev = label('StopFailure ·', s.error);
        break;
    }
    this.emit('change');
    return created;
  }

  clearPending(s, match) {
    const out = s.pending.filter(match);
    if (!out.length) return;
    s.pending = s.pending.filter(p => !out.includes(p));
    out.forEach(p => this.emit('release', p.id));
  }

  // The person answered (or passed on) a pending approval.
  settle(pendingId, outcome) {
    for (const s of this.sessions.values()) {
      const p = s.pending.find(x => x.id === pendingId);
      if (!p) continue;
      s.pending = s.pending.filter(x => x !== p);
      if (outcome) s.ev = `PermissionRequest → ${outcome}`;
      if (outcome === 'allow') s.base = 'working';
      this.emit('change');
      return true;
    }
    return false;
  }

  dismiss(id) {
    const s = this.sessions.get(id);
    if (!s) return false;
    s.pending.forEach(p => this.emit('release', p.id));
    this.sessions.delete(id);
    this.emit('change');
    return true;
  }

  // Sessions whose terminal was closed without a SessionEnd would sit forever; drop them after a long silence.
  sweep() {
    const cutoff = this.now() - STALE_MS;
    for (const s of [...this.sessions.values()]) if (s.lastAt < cutoff) this.dismiss(s.id);
  }

  // What is worth remembering across a restart of the app: who was here, not what they were doing.
  export() {
    return [...this.sessions.values()].map(s => ({ id: s.id, title: s.title, cwd: s.cwd, ev: s.ev, startedAt: s.startedAt, lastAt: s.lastAt }));
  }

  restore(list) {
    const cutoff = this.now() - STALE_MS;
    for (const r of Array.isArray(list) ? list : []) {
      if (!r || typeof r.id !== 'string' || !r.id || !(r.lastAt > cutoff) || this.sessions.has(r.id)) continue;
      const title = typeof r.title === 'string' ? r.title : '', cwd = typeof r.cwd === 'string' ? r.cwd : '';
      this.sessions.set(r.id, { id: r.id, name: title || baseName(cwd), title, cwd, base: 'waiting', ev: typeof r.ev === 'string' ? r.ev : '', subagents: 0, pending: [], error: '', remote: null, startedAt: Number(r.startedAt) || r.lastAt, lastAt: r.lastAt });
    }
  }

  snapshot() {
    return [...this.sessions.values()]
      .sort((a, b) => a.startedAt - b.startedAt)
      .map(s => ({ ...s, project: projectRoot(s.cwd) }))
      .map(s => ({
        id: s.id, name: s.name, cwd: s.cwd, ev: s.ev, error: s.error, remote: s.remote,
        project: s.project, projectName: baseName(s.project), team: teamKey(s.project),
        state: s.pending.length ? 'approval' : s.error ? 'error' : s.subagents > 0 ? 'subagent'
          : s.base === 'waiting' && this.now() - s.lastAt > SLEEP_MS ? 'sleeping' : s.base,
        pending: s.pending.map(p => ({ id: p.id, tool: p.tool, text: p.text, canDecide: p.canDecide }))
      }));
  }
}

module.exports = { Office, baseName, describe, projectRoot, teamKey, STALE_MS, SLEEP_MS };

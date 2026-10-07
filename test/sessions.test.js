'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { Office, describe, baseName, projectRoot, teamKey, STALE_MS, SLEEP_MS } = require('../src/sessions');

const ev = (name, extra = {}) => ({ session_id: 's1', cwd: 'C:\\Projects\\blog-api', hook_event_name: name, ...extra });
const only = office => office.snapshot()[0];

test('a session is named after its project folder and follows the turn', () => {
  const o = new Office();
  o.handle(ev('SessionStart', { source: 'startup' }));
  assert.equal(only(o).name, 'blog-api');
  assert.equal(only(o).state, 'waiting');
  o.handle(ev('UserPromptSubmit'));
  assert.equal(only(o).state, 'working');
  o.handle(ev('PreToolUse', { tool_name: 'Edit', tool_input: { file_path: 'C:\\Projects\\blog-api\\src\\posts.ts' } }));
  assert.equal(only(o).ev, 'PreToolUse · Edit posts.ts');
  o.handle(ev('Stop'));
  assert.equal(only(o).state, 'waiting');
  o.handle(ev('SessionEnd', { reason: 'other' }));
  assert.equal(o.snapshot().length, 0);
});

test('a session that was already running when the app opened still shows up', () => {
  const o = new Office();
  o.handle(ev('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'npm test' } }));
  assert.equal(only(o).state, 'working');
  assert.equal(only(o).ev, 'PreToolUse · Bash npm test');
});

test('a custom session title wins over the folder name', () => {
  const o = new Office();
  o.handle(ev('SessionStart', { session_title: 'auth refactor' }));
  assert.equal(only(o).name, 'auth refactor');
});

test('subagents show while they run, including after the main turn stops', () => {
  const o = new Office();
  o.handle(ev('UserPromptSubmit'));
  o.handle(ev('SubagentStart', { agent_type: 'Explore' }));
  assert.equal(only(o).state, 'subagent');
  o.handle(ev('PreToolUse', { agent_id: 'a1', tool_name: 'Grep', tool_input: { pattern: 'TODO' } }));
  o.handle(ev('Stop'));
  assert.equal(only(o).state, 'subagent');
  o.handle(ev('SubagentStop', { agent_type: 'Explore' }));
  assert.equal(only(o).state, 'waiting');
});

test('a permission request becomes a pending approval with the full command', () => {
  const o = new Office();
  const released = [];
  o.on('release', id => released.push(id));
  const p = o.handle(ev('PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'git push origin main' } }), { canDecide: true });
  assert.equal(only(o).state, 'approval');
  assert.deepEqual(only(o).pending, [{ id: p.id, tool: 'Bash', text: 'git push origin main', canDecide: true }]);
  assert.equal(o.settle(p.id, 'allow'), true);
  assert.equal(only(o).state, 'working');
  assert.equal(only(o).ev, 'PermissionRequest → allow');
  assert.deepEqual(released, []);
});

test('answering in Claude itself clears the bubble', () => {
  const o = new Office();
  const released = [];
  o.on('release', id => released.push(id));
  const p = o.handle(ev('PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'npm publish' } }), { canDecide: true });
  o.handle(ev('PostToolUse', { tool_name: 'Bash' }));
  assert.deepEqual(released, [p.id]);
  assert.equal(only(o).state, 'working');
});

test('with approvals off the request is shown but cannot be decided here', () => {
  const o = new Office();
  const p = o.handle(ev('PermissionRequest', { tool_name: 'Write', tool_input: { file_path: '/tmp/a.txt' } }), { canDecide: false });
  assert.equal(p.canDecide, false);
  assert.equal(only(o).state, 'approval');
  o.handle(ev('PreToolUse', { tool_name: 'Read', tool_input: { file_path: '/tmp/b.txt' } }));
  assert.equal(only(o).state, 'working');
});

test('a permission notification shows as needing the person', () => {
  const o = new Office();
  o.handle(ev('Notification', { notification_type: 'permission_prompt', message: 'Claude needs your permission to use Bash' }));
  assert.equal(only(o).state, 'approval');
  assert.equal(only(o).pending[0].canDecide, false);
  o.handle(ev('Stop'));
  assert.equal(only(o).pending.length, 0);
});

test('an API error shows as an error until the next prompt', () => {
  const o = new Office();
  o.handle(ev('StopFailure', { error_type: 'rate_limit' }));
  assert.equal(only(o).state, 'error');
  assert.equal(only(o).error, 'rate_limit');
  o.handle(ev('UserPromptSubmit'));
  assert.equal(only(o).state, 'working');
});

test('unrelated notifications and unknown events are ignored', () => {
  const o = new Office();
  assert.equal(o.handle(ev('Notification', { notification_type: 'auth_success' })), null);
  assert.equal(o.handle(ev('FileChanged')), null);
  assert.equal(o.handle({ hook_event_name: 'Stop' }), null);
  assert.equal(o.handle(null), null);
  assert.equal(o.snapshot().length <= 1, true);
});

test('silent sessions are swept after a long time, and can be dismissed by hand', () => {
  let now = 1000;
  const o = new Office({ now: () => now });
  o.handle(ev('SessionStart'));
  o.handle({ ...ev('SessionStart'), session_id: 's2' });
  assert.equal(o.dismiss('s2'), true);
  now += STALE_MS + 1;
  o.sweep();
  assert.equal(o.snapshot().length, 0);
});

test('describe and baseName handle both path styles', () => {
  assert.equal(baseName('/home/sophie/coding/recipe-app/'), 'recipe-app');
  assert.equal(baseName('C:\\Projects\\My-Little-Sessions'), 'My-Little-Sessions');
  assert.equal(describe({ file_path: 'C:\\a\\b\\chart.py', content: 'x' }, true), 'chart.py');
  assert.equal(describe({ command: 'a'.repeat(100) }, true).length, 48);
  assert.equal(describe({}, true), '');
  assert.equal(describe({ todos: [1] }, true), '{"todos":[1]}');
});

test('a waiting session dozes off after a quiet while and wakes on the next prompt', () => {
  let now = 1000;
  const o = new Office({ now: () => now });
  o.handle(ev('Stop'));
  assert.equal(only(o).state, 'waiting');
  now += SLEEP_MS + 1;
  assert.equal(only(o).state, 'sleeping');
  o.handle(ev('UserPromptSubmit'));
  assert.equal(only(o).state, 'working');
  now += SLEEP_MS + 1;
  assert.equal(only(o).state, 'working', 'a long-running turn is not asleep');
});

test('sessions survive a restart as waiting, without stale ones or old requests', () => {
  let now = STALE_MS * 2;
  const a = new Office({ now: () => now });
  a.handle(ev('UserPromptSubmit', { session_title: 'auth refactor' }));
  a.handle(ev('PermissionRequest', { tool_name: 'Bash', tool_input: { command: 'ls' } }), { canDecide: true });
  a.handle({ ...ev('Stop'), session_id: 'old' });
  a.sessions.get('old').lastAt = now - STALE_MS - 1;
  const b = new Office({ now: () => now });
  b.restore(JSON.parse(JSON.stringify(a.export())));
  b.restore([null, { id: 5 }, 'x']);
  assert.equal(b.snapshot().length, 1);
  assert.equal(only(b).name, 'auth refactor');
  assert.equal(only(b).state, 'waiting');
  assert.deepEqual(only(b).pending, []);
});

test('Remote Control is unknown until a hook reports it, then follows each report', () => {
  const o = new Office();
  o.handle(ev('SessionStart'));
  assert.equal(only(o).remote, null);
  o.handle(ev('UserPromptSubmit'), { remote: true });
  assert.equal(only(o).remote, true);
  o.handle(ev('Stop'));
  assert.equal(only(o).remote, true, 'an event without a report keeps the last known value');
  o.handle(ev('UserPromptSubmit'), { remote: false });
  assert.equal(only(o).remote, false);
  const again = new Office();
  again.restore(JSON.parse(JSON.stringify(o.export())));
  assert.equal(only(again).remote, null, 'not carried across a restart');
});

test('sessions of one project share a team, including worktrees and Windows casing', () => {
  const o = new Office();
  const start = (id, cwd) => o.handle({ session_id: id, cwd, hook_event_name: 'SessionStart' });
  start('a', 'C:\\Projects\\blog-api');
  start('b', 'c:\\projects\\Blog-API\\');
  start('c', 'C:\\Projects\\blog-api\\.claude\\worktrees\\fix-login');
  start('d', 'C:\\Projects\\recipe-app');
  const snap = o.snapshot();
  assert.equal(new Set(snap.slice(0, 3).map(s => s.team)).size, 1);
  assert.notEqual(snap[3].team, snap[0].team);
  assert.equal(snap[2].name, 'fix-login');
  assert.equal(snap[2].projectName, 'blog-api');
  assert.equal(snap[2].project, 'C:\\Projects\\blog-api');
  assert.equal(projectRoot('/home/sophie/app/.claude/worktrees/x/sub'), '/home/sophie/app');
  assert.notEqual(teamKey('/home/sophie/App'), teamKey('/home/sophie/app'), 'case matters outside Windows');
});

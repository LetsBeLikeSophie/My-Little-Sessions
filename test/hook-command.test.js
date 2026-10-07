'use strict';
// Runs the exact command that gets written into Claude Code's settings, the way Claude Code
// runs it: spawned directly with an argument list and the event JSON on stdin.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { createServer } = require('../src/server');
const { buildHooks, hookCommand } = require('../src/hooks-config');

function run(handler, input, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = spawn(handler.command, handler.args, { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true, env });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr += d; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, stdout, stderr }));
    child.stdin.end(JSON.stringify(input));
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function boot(t) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mls-cmd-'));
  const srv = createServer({ port: 0, configDir: dir, settingsFile: path.join(dir, 'settings.json') });
  await srv.start();
  t.after(() => srv.stop());
  return srv;
}

test('the installed command delivers an event and prints nothing', async t => {
  const srv = await boot(t);
  const hooks = buildHooks(srv.port, srv.hookUrl.split('/').pop());
  const evt = { session_id: 'abc', cwd: process.cwd(), hook_event_name: 'PreToolUse', tool_name: 'Bash', tool_input: { command: 'echo "quotes & ampersands | pipes" > out.txt' } };
  const out = await run(hooks.PreToolUse[0].hooks[0], evt);
  assert.deepEqual(out, { code: 0, stdout: '', stderr: '' });
  const s = srv.office.snapshot()[0];
  assert.equal(s.id, 'abc');
  assert.equal(s.ev, 'PreToolUse · Bash echo "quotes & ampersands | pipes" > out.txt');
});

test('a permission request waits for the click and prints the decision for Claude Code', async t => {
  const srv = await boot(t);
  const hooks = buildHooks(srv.port, srv.hookUrl.split('/').pop());
  const evt = { session_id: 'abc', cwd: process.cwd(), hook_event_name: 'PermissionRequest', tool_name: 'Bash', tool_input: { command: 'git push' } };
  const running = run(hooks.PermissionRequest[0].hooks[0], evt);
  let pending;
  for (let i = 0; i < 300 && !pending; i++) { await sleep(10); const s = srv.office.snapshot()[0]; pending = s && s.pending[0]; }
  assert.ok(pending, 'the request should be waiting in the office');
  const res = await fetch(srv.url + '/api/decide', { method: 'POST', headers: { 'x-mls-key': srv.uiKey }, body: JSON.stringify({ pending: pending.id, decision: 'allow' }) });
  assert.equal(res.status, 200);
  const out = await running;
  assert.equal(out.code, 0);
  assert.deepEqual(JSON.parse(out.stdout), { hookSpecificOutput: { hookEventName: 'PermissionRequest', decision: { behavior: 'allow' } } });
});

test('the command reports whether Remote Control is connected', async t => {
  const srv = await boot(t);
  const handler = buildHooks(srv.port, srv.hookUrl.split('/').pop()).Stop[0].hooks[0];
  const evt = { session_id: 'abc', cwd: process.cwd(), hook_event_name: 'Stop' };
  const off = { ...process.env }; delete off.CLAUDE_CODE_BRIDGE_SESSION_ID;
  assert.equal((await run(handler, evt, off)).code, 0);
  assert.equal(srv.office.snapshot()[0].remote, false);
  assert.equal((await run(handler, evt, { ...off, CLAUDE_CODE_BRIDGE_SESSION_ID: 'session_01ABCdef' })).code, 0);
  assert.equal(srv.office.snapshot()[0].remote, true);
  assert.equal((await run(handler, evt, off)).code, 0);
  assert.equal(srv.office.snapshot()[0].remote, false);
});

test('with the app closed the command exits 0 quickly and silently', async () => {
  const handler = hookCommand('http://127.0.0.1:9/mls-hook/' + 'a'.repeat(32), 3);
  const started = Date.now();
  const out = await run(handler, { session_id: 'abc', hook_event_name: 'Stop' });
  assert.deepEqual(out, { code: 0, stdout: '', stderr: '' });
  assert.ok(Date.now() - started < 1500, 'a closed app must not slow Claude Code down');
});

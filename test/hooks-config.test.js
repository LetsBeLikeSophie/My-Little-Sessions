'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const hooks = require('../src/hooks-config');

const tmpFile = () => path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mls-')), 'settings.json');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const TOKEN = 'a'.repeat(32);

test('install creates the file when there is none and reports connected', () => {
  const f = tmpFile();
  assert.equal(hooks.status(f, 47821, TOKEN).state, 'none');
  hooks.install(f, 47821, TOKEN, 'win32');
  const s = read(f);
  assert.deepEqual(Object.keys(s.hooks).sort(), Object.keys(hooks.EVENTS).sort());
  assert.equal(hooks.status(f, 47821, TOKEN).state, 'connected');
  const pr = s.hooks.PermissionRequest[0].hooks[0];
  assert.equal(pr.command, 'cmd.exe');
  assert.equal(pr.timeout, 600);
  assert.equal(pr.async, undefined);
  assert.match(pr.args[3], /^curl\.exe -s --connect-timeout 0\.3 -m 595 -X POST --data-binary @- http:\/\/127\.0\.0\.1:47821\/mls-hook\/a{32}\?rc=%CLAUDE_CODE_BRIDGE_SESSION_ID% & exit \/b 0$/);
  assert.equal(s.hooks.PreToolUse[0].hooks[0].async, true);
  assert.equal(s.hooks.SessionEnd[0].hooks[0].async, undefined);
});

test('install keeps existing settings and hooks, backs up once, and is repeatable', () => {
  const f = tmpFile();
  const original = {
    model: 'opus',
    permissions: { allow: ['Bash(npm test)'] },
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: 'echo mine' }] }],
      Stop: [{ hooks: [{ type: 'command', command: 'notify-send done' }] }]
    }
  };
  fs.writeFileSync(f, JSON.stringify(original));
  hooks.install(f, 47821, TOKEN, 'linux');
  hooks.install(f, 47821, TOKEN, 'linux');
  const s = read(f);
  assert.equal(s.model, 'opus');
  assert.deepEqual(s.permissions, original.permissions);
  assert.equal(s.hooks.PreToolUse.length, 2);
  assert.deepEqual(s.hooks.PreToolUse[0], original.hooks.PreToolUse[0]);
  assert.equal(s.hooks.PreToolUse[1].hooks[0].command, 'sh');
  assert.deepEqual(read(f + hooks.BACKUP_SUFFIX), original);

  hooks.uninstall(f);
  assert.deepEqual(read(f), original);
  assert.equal(hooks.status(f, 47821, TOKEN).state, 'none');
});

test('a changed token or port reports outdated and reinstalling fixes it', () => {
  const f = tmpFile();
  hooks.install(f, 47821, TOKEN, 'linux');
  assert.equal(hooks.status(f, 47821, 'b'.repeat(32)).state, 'outdated');
  assert.equal(hooks.status(f, 5000, TOKEN).state, 'outdated');
  hooks.install(f, 5000, 'b'.repeat(32), 'linux');
  assert.equal(hooks.status(f, 5000, 'b'.repeat(32)).state, 'connected');
  assert.equal(read(f).hooks.Stop.length, 1);
});

test('uninstall removes only our hooks and leaves an empty settings object clean', () => {
  const f = tmpFile();
  hooks.install(f, 47821, TOKEN, 'linux');
  hooks.uninstall(f);
  assert.deepEqual(read(f), {});
});

test('a settings file that is not valid JSON is never modified', () => {
  const f = tmpFile();
  fs.writeFileSync(f, '{ "model": "opus", // comment\n }');
  assert.throws(() => hooks.install(f, 47821, TOKEN, 'linux'), /left untouched/);
  assert.equal(fs.readFileSync(f, 'utf8'), '{ "model": "opus", // comment\n }');
  assert.equal(hooks.status(f, 47821, TOKEN).state, 'error');
});

test('hooks written by an older version report outdated', () => {
  const f = tmpFile();
  hooks.install(f, 47821, TOKEN, 'linux');
  const old = fs.readFileSync(f, 'utf8').split('?rc=${CLAUDE_CODE_BRIDGE_SESSION_ID}').join('');
  assert.notEqual(old, fs.readFileSync(f, 'utf8'));
  fs.writeFileSync(f, old);
  assert.equal(hooks.status(f, 47821, TOKEN).state, 'outdated');
  hooks.install(f, 47821, TOKEN, 'linux');
  assert.equal(hooks.status(f, 47821, TOKEN).state, 'connected');
  assert.equal(read(f).hooks.Stop.length, 1);
});

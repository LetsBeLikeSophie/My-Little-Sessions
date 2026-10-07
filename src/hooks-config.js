'use strict';
// Adds and removes the Claude Code hooks that report session activity to this app.
// Every hook is one short curl call to the local server. It always exits 0 and prints
// nothing unless the app answers a permission request, so Claude Code is unaffected
// while the app is closed.
const fs = require('fs');
const os = require('os');
const path = require('path');

const MARK = '/mls-hook/';
const BACKUP_SUFFIX = '.before-my-little-sessions';

// async: reported in the background. quick: SessionEnd has a short time budget.
// hold: the app may keep the request open until the person approves or denies.
const EVENTS = {
  SessionStart: 'async', UserPromptSubmit: 'async', PreToolUse: 'async', PostToolUse: 'async',
  PostToolUseFailure: 'async', PermissionDenied: 'async', Notification: 'async',
  SubagentStart: 'async', SubagentStop: 'async', Stop: 'async', StopFailure: 'async',
  SessionEnd: 'quick', PermissionRequest: 'hold'
};
const HOLD_SECONDS = 600;

function hookUrl(port, token) {
  return `http://127.0.0.1:${port}${MARK}${token}`;
}

// The short connect timeout matters when the app is closed: the server is on this machine, so a
// connection either opens at once or never will, and Windows otherwise retries for about 2 seconds.
function hookCommand(url, maxSeconds, platform = process.platform) {
  const curl = `-s --connect-timeout 0.3 -m ${maxSeconds} -X POST --data-binary @- ${url}`;
  if (platform === 'win32') return { command: 'cmd.exe', args: ['/d', '/s', '/c', `curl.exe ${curl} & exit /b 0`] };
  return { command: 'sh', args: ['-c', `curl ${curl}; exit 0`] };
}

function buildHooks(port, token, platform = process.platform) {
  const url = hookUrl(port, token);
  const hooks = {};
  for (const [event, mode] of Object.entries(EVENTS)) {
    const handler = { type: 'command' };
    if (mode === 'hold') {
      Object.assign(handler, hookCommand(url, HOLD_SECONDS - 5, platform), {
        timeout: HOLD_SECONDS,
        statusMessage: 'Waiting for your answer in My Little Sessions'
      });
    } else if (mode === 'quick') {
      Object.assign(handler, hookCommand(url, 1, platform));
    } else {
      Object.assign(handler, hookCommand(url, 3, platform), { async: true });
    }
    hooks[event] = [{ hooks: [handler] }];
  }
  return hooks;
}

function settingsPath() {
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
  return path.join(dir, 'settings.json');
}

const isOurs = handler => JSON.stringify(handler).includes(MARK);

function readSettings(file) {
  if (!fs.existsSync(file)) return {};
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  if (!text.trim()) return {};
  let parsed;
  try { parsed = JSON.parse(text); } catch (e) {
    throw new Error(`${file} is not valid JSON, so it was left untouched (${e.message})`);
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(`${file} does not contain a settings object, so it was left untouched`);
  return parsed;
}

// Returns a copy of the settings without any hook this app added. Everything else is kept as is.
function withoutOurs(settings) {
  const out = { ...settings };
  if (!out.hooks || typeof out.hooks !== 'object') return out;
  const hooks = {};
  for (const [event, groups] of Object.entries(out.hooks)) {
    if (!Array.isArray(groups)) { hooks[event] = groups; continue; }
    const kept = [];
    for (const group of groups) {
      if (!group || !Array.isArray(group.hooks)) { kept.push(group); continue; }
      const handlers = group.hooks.filter(h => !isOurs(h));
      if (handlers.length === group.hooks.length) kept.push(group);
      else if (handlers.length) kept.push({ ...group, hooks: handlers });
    }
    if (kept.length) hooks[event] = kept;
  }
  if (Object.keys(hooks).length) out.hooks = hooks; else delete out.hooks;
  return out;
}

function write(file, settings) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  if (fs.existsSync(file) && !fs.existsSync(file + BACKUP_SUFFIX)) fs.copyFileSync(file, file + BACKUP_SUFFIX);
  const tmp = file + '.mls-tmp';
  fs.writeFileSync(tmp, JSON.stringify(settings, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

function install(file, port, token, platform = process.platform) {
  const settings = withoutOurs(readSettings(file));
  const ours = buildHooks(port, token, platform);
  const hooks = { ...(settings.hooks || {}) };
  for (const [event, groups] of Object.entries(ours)) hooks[event] = [...(Array.isArray(hooks[event]) ? hooks[event] : []), ...groups];
  write(file, { ...settings, hooks });
}

function uninstall(file) {
  if (!fs.existsSync(file)) return;
  const before = readSettings(file);
  const after = withoutOurs(before);
  if (JSON.stringify(before) !== JSON.stringify(after)) write(file, after);
}

// 'connected' when every hook points at this app, 'outdated' when some of ours exist but not all, else 'none'.
function status(file, port, token) {
  let settings;
  try { settings = readSettings(file); } catch (e) { return { state: 'error', message: e.message }; }
  const url = hookUrl(port, token);
  const hooks = settings.hooks && typeof settings.hooks === 'object' ? settings.hooks : {};
  const text = JSON.stringify(hooks);
  if (!text.includes(MARK)) return { state: 'none' };
  const complete = Object.keys(EVENTS).every(event => JSON.stringify(hooks[event] || []).includes(url));
  return { state: complete ? 'connected' : 'outdated' };
}

module.exports = { MARK, EVENTS, BACKUP_SUFFIX, hookUrl, hookCommand, buildHooks, settingsPath, install, uninstall, status, withoutOurs };

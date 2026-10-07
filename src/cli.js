#!/usr/bin/env node
'use strict';
// Runs My Little Sessions without the desktop window: start it, then open the printed
// address in a browser. Useful on macOS and Linux, and while developing.
const os = require('os');
const path = require('path');
const { createServer, DEFAULT_PORT } = require('./server');
const { version } = require('../package.json');

const server = createServer({
  port: Number(process.env.MLS_PORT) || DEFAULT_PORT,
  configDir: process.env.MLS_CONFIG_DIR || path.join(os.homedir(), '.my-little-sessions'),
  version
});

server.start().then(() => {
  console.log(`My Little Sessions ${version}`);
  console.log(`Open ${server.url}/#${server.uiKey}`);
}).catch(e => {
  console.error(e.code === 'EADDRINUSE' ? `Port ${e.port} is already in use.` : e.message);
  process.exit(1);
});

for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => server.stop().then(() => process.exit(0)));

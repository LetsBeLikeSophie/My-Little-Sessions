'use strict';
// Desktop window for My Little Sessions. The window shows the page served by the local server.
const path = require('path');
const { app, BrowserWindow, Menu, shell, dialog } = require('electron');
const { createServer, DEFAULT_PORT } = require('./server');

let win = null;
let server = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(async () => {
    server = createServer({
      port: Number(process.env.MLS_PORT) || DEFAULT_PORT,
      configDir: app.getPath('userData'),
      version: app.getVersion(),
      desktop: true,
      // The empty chair at a team's desk: start a new Code session for that project in the Claude desktop app.
      onNew: project => shell.openExternal('claude://code/new?folder=' + encodeURIComponent(project)),
      onAttention: () => { if (win && !win.isFocused()) win.flashFrame(true); },
      onSettings: settings => { if (win) win.setAlwaysOnTop(Boolean(settings.onTop)); }
    });
    try {
      await server.start();
    } catch (e) {
      dialog.showErrorBox('My Little Sessions', e && e.code === 'EADDRINUSE'
        ? `Port ${Number(process.env.MLS_PORT) || DEFAULT_PORT} is already in use. Close the other program using it and start again.`
        : `Could not start: ${e && e.message}`);
      app.quit();
      return;
    }

    win = new BrowserWindow({
      width: 940, height: 860, minWidth: 420, minHeight: 480,
      title: 'My Little Sessions',
      backgroundColor: '#121920',
      autoHideMenuBar: true,
      alwaysOnTop: server.config.onTop,
      icon: path.join(__dirname, '..', 'assets', 'icon.png'),
      webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    Menu.setApplicationMenu(null);
    win.on('focus', () => win.flashFrame(false));
    win.on('closed', () => { win = null; });
    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('https://github.com/')) shell.openExternal(url);
      return { action: 'deny' };
    });
    win.webContents.on('will-navigate', (event, url) => { if (!url.startsWith(server.url)) event.preventDefault(); });
    win.loadURL(`${server.url}/#${server.uiKey}`);
  });

  app.on('window-all-closed', () => app.quit());
  app.on('before-quit', () => { if (server) server.stop(); });
}

import * as path from 'path';

import { app, BrowserWindow, ipcMain } from 'electron';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

import { Banks, PreloadType } from '../src/constants';
import { proverSetupHandler, provingHandler, cookiesHandler } from './handlers';
import { deleteTempDir } from './proverlib/environment';
import { getProverEnv } from './handlers/proverSetupHandler';

// global.share = { ipcMain };

let win: BrowserWindow | null = null;
const isDev = !app.isPackaged;

export const getWindow = () => win;

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      webviewTag: true,
      contextIsolation: false,
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:3000/index.html');
  } else {
    // 'build/index.html'
    win.loadURL(`file://${__dirname}/../index.html`);
  }

  // eslint-disable-next-line no-return-assign
  win.on('closed', () => win = null);

  // Hot Reloading
  if (isDev) {
    // 'node_modules/.bin/electronPath'
    // eslint-disable-next-line global-require, @typescript-eslint/no-var-requires
    require('electron-reload')(__dirname, {
      electron: path.join(__dirname, '..', '..', 'node_modules', '.bin', 'electron'),
      forceHardReset: true,
      hardResetMethod: 'exit',
    });
  }

  // DevTools
  installExtension(REACT_DEVELOPER_TOOLS)
    .then((name) => console.log(`Added Extension:  ${name}`))
    .catch((err) => console.log('An error occurred: ', err));

  if (isDev) {
    win.webContents.openDevTools();
  }
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  // clean up when closing the app
  const env = getProverEnv();
  deleteTempDir(env);
});

app.on('activate', () => {
  if (win === null) {
    createWindow();
  }
});

ipcMain.on('getPreloadPath', (event, preloadType: PreloadType, bank: Banks) => {
  let filePath = 'preloads/';

  // preload type
  if (preloadType === PreloadType.LOGIN) {
    filePath = filePath.concat('login/');
  }
  if (preloadType === PreloadType.TRANSACTIONS) {
    filePath = filePath.concat('transactions/');
  }

  // bank
  if (bank === Banks.ABN) {
    filePath = filePath.concat('abn.js');
  }
  if (bank === Banks.BUNQ) {
    filePath = filePath.concat('bunq.js');
  }

  // eslint-disable-next-line no-param-reassign
  event.returnValue = `file:${path.resolve(__dirname, filePath)}`;
});

proverSetupHandler();
provingHandler();
cookiesHandler();

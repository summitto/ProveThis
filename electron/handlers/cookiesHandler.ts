/* eslint-disable no-param-reassign */
import Electron, { ipcMain } from 'electron';

const cookiesHandler = () => {
  ipcMain.on('getCookies', async (event) => {
    const persistedSession = Electron.session.fromPartition('persist:bank');
    const persistedCookies = await persistedSession.cookies.get({ domain: 'abnamro.nl', name: 'SMSession' });

    const cookiesValues = persistedCookies.map((cookie) => `${cookie.name}=${cookie.value};`);

    const cookiesHeader = ['Cookie: '.concat(cookiesValues.join(' '))];

    event.returnValue = cookiesHeader;
  });
};

export default cookiesHandler;

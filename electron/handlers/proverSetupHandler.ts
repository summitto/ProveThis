/* eslint-disable no-param-reassign */
import { ipcMain } from 'electron';

import {
  testTools, prepareEnvironment, getUserDataDirectory, EnvironmentInfo,
} from '../proverlib/environment';

let env: EnvironmentInfo;

export const getProverEnv = () => env;

const proverSetupHandler = () => {
  let isRunning = false;

  ipcMain.on('setupProver', async (event, python: string, circom: string) => {
    if (isRunning) {
      return;
    }
    isRunning = true;

    const pythonBinaryPath = python || 'python3';
    const circomBinaryPath = circom || 'circom';

    try {
      await testTools({ python: pythonBinaryPath, circom: circomBinaryPath });

      env = await prepareEnvironment({ python: pythonBinaryPath, circom: circomBinaryPath }, getUserDataDirectory(), 'mpc');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        event.sender.send('proverSetup', { error: `${error.path} not found` });

        isRunning = false;
        return;
      }

      event.sender.send('proverSetup', { error: error.message });

      console.log('error setting up prover:', error);

      isRunning = false;
      return;
    }

    isRunning = false;
    event.sender.send('proverSetup', { success: true });
  });
};

export default proverSetupHandler;

import { fork } from 'node:child_process';
import { join } from 'node:path';

import { EnvironmentInfo } from './environment';

export type MpcConfig = {
  IP: string
  mpcIvPort: number
  mpcPoHPort: number
};

type MpcMessage = {
  error?: string
  mask?: string
}

export type ClientMpcResult = {
  tagMaskMask: string
  powersOfHMask: string
}

function launchMpcProcess(
  name: string,
  type: string,
  env: EnvironmentInfo,
  mpcConf: { IP: string; port: number },
  clientKeyShare: string,
  iv: string,
  abortSignal: AbortSignal,
  timeout: number,
): Promise<string> {
  console.log('Launching', name, 'subprocess...');
  const mpcSubProcess = fork(
    join(__dirname, 'mpc-child.js'),
    [type, env.mpcCircuitsDir, mpcConf.IP, mpcConf.port.toString(), clientKeyShare, iv],
    { signal: abortSignal, timeout },
  );

  let generatedMask = '';

  return new Promise((resolve, reject) => {
    // exit handler is executed in all cases except when the process was aborted with AbortController
    mpcSubProcess.on('exit', (code: number | null, exitSignal: NodeJS.Signals | null) => {
      if ((code !== null && code !== 0) || (exitSignal !== null)) {
        reject(new Error(`${name} subprocess exited with code=${code || 0} signal=${exitSignal || 'null'}`));
      }
      resolve(generatedMask);
    });

    mpcSubProcess.on('error', (e: Error) => {
      console.log('MPC subproccess ', e.name, e.message);
    });

    // process reporting logical errors and MPC masks
    mpcSubProcess.on('message', (message) => {
      const mpcMessage = message as MpcMessage;
      if (mpcMessage.error) {
        mpcSubProcess.kill();
        reject(new Error(mpcMessage.error));
      }
      if (mpcMessage.mask) {
        generatedMask = mpcMessage.mask || '';
      }
    });
  });
}

function runMpcMain(
  env: EnvironmentInfo,
  mpcConf: MpcConfig,
  clientKeyShare: string,
  iv: string,
  timeout: number = 10 * 60 * 1000,
): [AbortController, Promise<ClientMpcResult>] {
  // abort controller for manually aborting MPC, works like process.kill but emits a different error.
  // aborts both MPC subprocesses at the same time
  const controller = new AbortController();
  const { signal } = controller;

  return [
    controller,
    new Promise((resolve, reject) => {
      Promise.all([
        launchMpcProcess('Encrypted IV MPC', 'encryptedIv', env, { IP: mpcConf.IP, port: mpcConf.mpcIvPort }, clientKeyShare, iv, signal, timeout),
        launchMpcProcess('Powers of H MPC', 'powersOfH', env, { IP: mpcConf.IP, port: mpcConf.mpcPoHPort }, clientKeyShare, iv, signal, timeout),
      ])
        .then(([tagMaskMask, powersOfHMask]) => {
          if (!tagMaskMask || !powersOfHMask) {
            console.warn(`tagMaskMask=${tagMaskMask} powersOfHMask=${powersOfHMask}`);
            reject(new Error('AES MPC didn\'t produce one or more masks'));
            return;
          }
          resolve({ tagMaskMask, powersOfHMask });
        })
        .catch((e) => {
          controller.abort();
          reject(e);
        });
    }),
  ];
}

export default runMpcMain;

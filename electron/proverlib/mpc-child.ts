import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';

import mpc from 'aes-mpc-lib';

function runEncryptedIv(serverIP: string, serverPort: number, circuitsDir: string, clientKeyShare: string, iv: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting encrypted IV MPC...');
    try {
      const tagMaskMask = randomBytes(16).toString('hex');
      process.send?.({ mask: tagMaskMask });
      mpc.runMpcEncryptedIv(serverIP, serverPort, circuitsDir, clientKeyShare, iv, tagMaskMask);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

function runPowersOfH(serverIP: string, serverPort: number, circuitsDir: string, clientKeyShare: string): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('Starting powers of H MPC...');
    try {
      const powersOfHMask = randomBytes(3200).toString('hex');
      process.send?.({ mask: powersOfHMask });
      mpc.runMpcPowersOfH(serverIP, serverPort, circuitsDir, clientKeyShare, powersOfHMask);
      resolve();
    } catch (e) {
      reject(e);
    }
  });
}

async function main() {
  if (process.argv.length !== 8) {
    process.send?.({ error: 'incorrect number of arguments' });
    process.exit(1);
  }

  const type = process.argv[2];
  const circuitsDir = process.argv[3];
  const serverIP = process.argv[4];
  const serverPort = Number(process.argv[5]);
  const clientKeyShare = process.argv[6];
  const iv = process.argv[7];

  if (type !== 'encryptedIv' && type !== 'powersOfH') {
    process.send?.({ error: `unknown mpc type: ${type}` });
    process.exit(1);
  }

  if (!existsSync(circuitsDir)) {
    process.send?.({ error: `circuit dir ${circuitsDir} doesn't exist` });
    process.exit(1);
  }

  if (serverIP === '') {
    process.send?.({ error: 'server IP is empty' });
    process.exit(1);
  }

  if (serverPort === 0 || serverPort > 65535) {
    process.send?.({ error: `unexpected server port: ${serverPort}` });
    process.exit(1);
  }

  if (clientKeyShare === '') {
    process.send?.({ error: 'client key share is empty' });
    process.exit(1);
  }

  if (iv === '') {
    process.send?.({ error: 'IV is empty' });
    process.exit(1);
  }

  try {
    if (type === 'encryptedIv') {
      await runEncryptedIv(serverIP, serverPort, circuitsDir, clientKeyShare, iv);
    } else {
      await runPowersOfH(serverIP, serverPort, circuitsDir, clientKeyShare);
    }
  } catch (e: unknown) {
    process.send?.({ error: (e as Error)?.message || 'unknown MPC error' });
    process.exit(1);
  }
  process.exit(0);
}

main();

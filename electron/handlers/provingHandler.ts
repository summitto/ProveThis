/* eslint-disable no-param-reassign */
import { join } from 'node:path';
import http from 'node:http';
import crypto from 'node:crypto';
import fs from 'fs';

import { ipcMain, dialog, net } from 'electron';

import {
  prepareMainCircuit, compileMainCircuit, prepareCircomInput,
  generateWitness, createProof, verifyProof, saveProof, saveVerificationKey,
} from '../proverlib/circom';
import runNotarize from '../proverlib/notarization';
import type { NotarySettings } from '../proverlib/notarization';
import { getProverEnv } from './proverSetupHandler';
import { b64decode, ba2str } from '../proverlib/pagesigner/core/utils';
import { Banks } from '../../src/constants';
import runMpcMain, { MpcConfig } from '../proverlib/mpc-main';
import {
  prepareTagVerification, requestTagVerification, pollTagVerification, verifyTag,
} from '../proverlib/tag-verification';
import { getWindow } from '../main';

type Transaction = {
  counterAccountNumber: string
  amount: number
  csvString: string
}

type getKeysResponse = {
  pk: string
  vk: string
  size: number
  error?: string
}

const notary: NotarySettings = {
  notaryIP: '51.89.97.117',
  notaryPort: 10011,
  otPort: 12345,
  sessionOptions: {
    maxFragmentLength: 2048,
    mustVerifyCert: true,
  },
  useNotaryNoSandbox: true,
};
const mpcServerConfig: MpcConfig = {
  IP: '51.89.97.117',
  mpcIvPort: 10020,
  mpcPoHPort: 10030,
};

const onScriptError = (data: { code: number|null; errorBuffer: string }) => {
  const { code, errorBuffer } = data;
  const win = getWindow();
  win?.webContents?.send('scriptError', { code, errorBuffer });
};

const provingHandler = () => {
  let isRunning = false;
  let isUserCanceled = false;
  let signature: string;
  let decodedProvenCleartext: string;

  let abortController: AbortController | undefined;

  const isCanceled = () => {
    if (!isUserCanceled) return;

    isRunning = false;
    isUserCanceled = false;
    abortController?.abort('user cancelled');

    throw new Error('User cancelled');
  };

  const downloadKeys = (
    request: http.ClientRequest,
    event: Electron.IpcMainEvent,
    aesBlocksToReveal: number,
  ): Promise<getKeysResponse> => new Promise((resolve, reject) => {
    request.on('error', (err: Error) => {
      console.log(err);
      reject(new Error(`Failed to download ZK keys. Reason: ${err.message}`));
    });

    request.on('response', (response) => {
      if (response.statusCode === 404) {
        reject(new Error(`No keys of size ${aesBlocksToReveal}. Contact server administrator to generate required keys.`));
      }
      if (response.statusCode !== 200) {
        reject(new Error('Keys request failed'));
      }

      let downloadedSize = 0;
      const totalSize = Number(response.headers['x-content-length']);
      const buffer = Buffer.alloc(totalSize);

      let progress = 0;

      response.on('data', (chunk: Buffer) => {
        chunk.copy(buffer, downloadedSize);
        downloadedSize += chunk.length;

        const currentProgress = +((downloadedSize / totalSize) * 100).toFixed(0);
        if (progress < currentProgress) {
          progress = currentProgress;
          event.sender.send('provingStatus', { status: `Downloading keys ${progress}%` });
        }
      });

      response.on('end', () => {
        console.log('Download complete!');
        try {
          resolve(JSON.parse(buffer.toString()));
        } catch (error) {
          reject(new Error(`Error parsing keys ${error}`));
        }
      });
    });
  });

  async function verifySignature(sig: string, ciphertext: number[]): Promise<boolean> {
    const signatureBytes = Buffer.from(sig, 'hex');

    const signingPubKeyResponse = await net.fetch(`http://${notary.notaryIP}:${notary.notaryPort}/signing-key.pem`);
    const signingKeyPem = await signingPubKeyResponse.text();

    const publicKey = crypto.createPublicKey(signingKeyPem);
    return crypto.createVerify('SHA256').update(Uint8Array.from(ciphertext)).verify(publicKey, signatureBytes);
  }

  ipcMain.on('cancel', () => {
    isUserCanceled = true;
    abortController?.abort('user cancelled');
  });

  ipcMain.on('createProof', async (event, bank: Banks, server: string, url: string, transaction: Transaction) => {
    if (isRunning) {
      return;
    }
    isUserCanceled = false;

    console.log('Creating proof for', bank);

    console.time('Elapsed time');

    isRunning = true;
    console.log('Notarizing...');

    const env = getProverEnv();

    let proofPath: string[] | undefined;

    console.time('Notarized in');

    abortController = new AbortController();

    try {
      const result = await runNotarize(
        env,
        notary,
        server,
        url,
      );

      console.timeEnd('Notarized in');

      event.sender.send('provingStatus', { status: 'Notarization succeeded' });
      isCanceled();

      console.log('amount of records:', result.plaintext.length);

      let startingIndex = 0;
      let plaintextBytesToReveal = 0;
      let aesBlocksToReveal = 0;
      let tlsRecord = 0;
      let indexOffset = 0;

      for (let i = 0; i < result.plaintext.length; i++) {
        console.log('checking ', i, ' record');

        tlsRecord = i;

        console.log('record length');
        console.log(result.plaintext[tlsRecord].length);
        console.log('record data');
        console.log(ba2str(result.plaintext[tlsRecord]));

        const recordString = ba2str(result.plaintext[tlsRecord]);

        if (bank === Banks.ABN) {
          const accountStart = recordString.indexOf('counterAccountNumber":');
          // if there is no transactions in the current block - move to next one, untill we find first transaction
          if (accountStart === -1) {
            continue;
          }

          const accountEndIndex = recordString.indexOf(',', accountStart);

          // 24 is the length of empty counterAccountNumber, meaning counterParty is unknown
          if ((accountEndIndex - accountStart) === 24) {
            console.log('no account');
            event.sender.send('provingStatus', { error: 'transaction have no counterParty' });
            isRunning = false;

            return;
          }

          const amountStart = recordString.indexOf('"amount":');
          const amountEnd = recordString.indexOf(',', amountStart);

          indexOffset = accountStart % 16;
          plaintextBytesToReveal = amountEnd - accountStart + indexOffset;

          // begining of the accountStart block
          startingIndex = accountStart - (accountStart % 16);

          aesBlocksToReveal = Math.ceil((amountEnd - startingIndex) / 16);
        }

        if (bank === Banks.BUNQ) {
          const txLineStart = recordString.indexOf(transaction.csvString);
          if (txLineStart === -1) {
            continue;
          }

          const csvFormatedAmount = new Intl.NumberFormat('nl-NL', {
            style: 'currency', currency: 'EUR',
          }).format(transaction.amount).slice(2);

          const amountStart = recordString.indexOf(csvFormatedAmount, txLineStart);
          const counterAccountStart = recordString.indexOf(transaction.counterAccountNumber, amountStart);
          const counterAccountEnd = recordString.indexOf(',', counterAccountStart);

          indexOffset = amountStart % 16;
          plaintextBytesToReveal = counterAccountEnd - amountStart + indexOffset;
          startingIndex = amountStart - (amountStart % 16);

          aesBlocksToReveal = Math.ceil((counterAccountEnd - startingIndex) / 16);
        }

        break;
      }

      if (startingIndex === 0 || plaintextBytesToReveal === 0 || aesBlocksToReveal === 0) {
        console.log('error calculating amount of aes blocks');
        console.log('index:', startingIndex, ', bytesToReveal:', plaintextBytesToReveal, ', aesBlocks:', aesBlocksToReveal);
        event.sender.send('provingStatus', { error: 'error calculating amount of aes blocks to reveal' });
        isRunning = false;

        return;
      }
      isCanceled();

      console.log('bytes to reveal: ', plaintextBytesToReveal);
      console.log('blocks to reveal: ', aesBlocksToReveal);
      console.log('offset to beggining of the block: ', indexOffset);

      console.time('Circom circuit compiled in');

      const mainCircuit = await prepareMainCircuit(env, aesBlocksToReveal);

      isCanceled();
      event.sender.send('provingStatus', { status: 'Compiling main circuit' });
      const [constraintSystemPath, witnessProgramPath] = await compileMainCircuit(env, mainCircuit, onScriptError, abortController.signal);

      console.timeEnd('Circom circuit compiled in');

      isCanceled();
      event.sender.send('provingStatus', { status: 'Downloading keys' });
      const request = http.get(`http://${notary.notaryIP}:${notary.notaryPort}/zkey?size=${aesBlocksToReveal}`, {
        signal: abortController.signal,
      });

      isCanceled();
      const keys = await downloadKeys(request, event, aesBlocksToReveal);

      const { pk, vk, size } = keys;
      isCanceled();
      if (size !== aesBlocksToReveal) {
        throw new Error(`Keys size do not match block size. Requested size: ${aesBlocksToReveal}, key size: ${size}`);
      }

      isCanceled();
      const provingKey = b64decode(pk);
      const verificationKey = JSON.parse(ba2str(b64decode(vk))) as object;

      isCanceled();
      console.log('saving proving key');
      const zkeyPath = `${env.cacheDir}/provingKey.zkey`;
      console.log('zkeyPath', zkeyPath);
      fs.writeFileSync(zkeyPath, provingKey);

      isCanceled();

      console.time('Tag verification MPC time');

      event.sender.send('provingStatus', { status: 'Performing MPC for AES tag verification' });
      const mpcIV = `${result.tagIvList[tlsRecord]}00000001`;

      console.log('result.clientServerWriteKeyShare:', result.clientServerWriteKeyShare);
      console.log('mpcIV:', mpcIV);

      const mpcPromise = runMpcMain(env, mpcServerConfig, result.clientServerWriteKeyShare, mpcIV);

      isCanceled();
      try {
        event.sender.send('provingStatus', { status: 'Requesting tag verification MPC' });
        // request MPC on the server
        await requestTagVerification(notary, result.mpcId, result.clientSivShare, result.records[tlsRecord]);
      } catch (e) {
        console.log('AES tag verification MPC error', e);

        let isRequestFailed = true;
        let counter = 1;

        while (isRequestFailed === true) {
          console.log('requesting #', counter);

          isCanceled();
          try {
            event.sender.send('provingStatus', { status: `Requesting tag verification. Server is busy, retrying. Attempt #${counter}` });
            await requestTagVerification(notary, result.mpcId, result.clientSivShare, result.records[tlsRecord]);
            console.log('requested', counter);

            isRequestFailed = false;
          } catch (error) {
            console.log('error in while', error);

            // wait a few seconds before retrying
            // eslint-disable-next-line no-promise-executor-return
            await new Promise((resolve) => setTimeout(resolve, 3000));

            counter++;
          }
        }
      }

      event.sender.send('provingStatus', { status: 'Waiting for tag verification MPC to complete' });
      await pollTagVerification(notary, result.mpcId, isCanceled);
      console.log('mpc done');

      isCanceled();
      const mpcMasks = await mpcPromise;

      console.timeEnd('Tag verification MPC time');

      isCanceled();
      const [privateInputPath, inputPath] = await prepareCircomInput(
        env,
        result.inputsList[tlsRecord],
        result.aadList[tlsRecord],
        startingIndex,
        plaintextBytesToReveal,
        aesBlocksToReveal,
        result.notaryServerWriteKeyShare,
        onScriptError,
      );

      console.time('Witness generation time');

      isCanceled();
      event.sender.send('provingStatus', { status: 'Generating Witness' });
      const generatedWitnessPath = await generateWitness(env, witnessProgramPath, privateInputPath);

      console.timeEnd('Witness generation time');

      isCanceled();
      event.sender.send('provingStatus', { status: 'Creating proof' });
      const [proof, publicInputs] = await createProof(zkeyPath, generatedWitnessPath);

      isCanceled();
      event.sender.send('provingStatus', { status: 'Verifying proof' });
      const success = await verifyProof(proof, publicInputs, verificationKey);
      if (success) {
        console.log('Proof verified');
        event.sender.send('provingStatus', { status: 'Proof Verified' });
      } else {
        throw new Error('Proof verification failed');
      }

      // find the end of revealed plaintext
      const plaintextEnd = indexOffset + plaintextBytesToReveal;
      // find the end of total plaintext in publicInputs
      const blockEnd = aesBlocksToReveal * 16;
      // get the slice of proven cleartext from publicInputs
      const provenCleartext = (publicInputs as string[]).slice(0, blockEnd);
      console.log('Proven cleartext:', provenCleartext);
      // decode chars from plaintext bytes, skip hidden bytes
      decodedProvenCleartext = provenCleartext.slice(indexOffset, plaintextEnd).map((s) => String.fromCharCode(parseInt(s, 10))).join('');
      console.log('Decoded proven cleartext:', decodedProvenCleartext);

      console.time('Prepared tag in');

      isCanceled();
      event.sender.send('provingStatus', { status: 'Preparing tag verification' });
      const tagShare = await prepareTagVerification(
        env,
        result.clientServerWriteKeyShare,
        mpcIV,
        inputPath,
        result.aadList[tlsRecord],
        mpcMasks,
        onScriptError,
      );
      console.log('Tag verification share:', tagShare);

      console.timeEnd('Prepared tag in');

      console.time('Verified tag in');

      isCanceled();
      event.sender.send('provingStatus', { status: 'Verifying tag' });
      const verifyTagResult = await verifyTag(notary, result.mpcId, result.inputsList[tlsRecord], result.aadList[tlsRecord], tagShare);
      signature = verifyTagResult.signature;

      console.timeEnd('Verified tag in');

      event.sender.send('provingStatus', { status: 'Verifying tag signature' });

      const witnessObj = JSON.parse(result.inputsList[tlsRecord]) as { ciphertext: string[] };
      const ciphertext = witnessObj.ciphertext.map((s) => parseInt(s, 10));

      const verified = await verifySignature(signature, ciphertext);
      if (!verified) throw new Error('Failed to verify tag signature');

      event.sender.send('provingStatus', { status: 'Saving proof' });
      proofPath = dialog.showOpenDialogSync({ message: 'Select where to save proof', properties: ['createDirectory', 'openDirectory'] });

      if (!proofPath) {
        throw new Error('Unable to save proof');
      }
      const ciphertextBuffer = Buffer.from(ciphertext);
      fs.writeFileSync(`${proofPath[0]}/ciphertext.bin`, ciphertextBuffer);

      await saveProof(proof, join(proofPath[0], 'proof.json'), publicInputs, join(proofPath[0], 'publicInputs.json'));
      await saveVerificationKey(verificationKey, join(proofPath[0], 'verifyingKey.json'));
    } catch (error: any) {
      console.log('Proving error:', error);
      event.sender.send('provingStatus', { error: error.message || error });

      isRunning = false;
      isUserCanceled = false;

      abortController.abort();

      return;
    }

    isRunning = false;

    console.timeEnd('Elapsed time');

    event.sender.send('provingStatus', {
      status: 'Finished 🥳', path: proofPath, signature, decodedProvenCleartext,
    });
  });
};

export default provingHandler;

/* eslint-disable @typescript-eslint/no-empty-function */
import { join } from 'node:path';
import { spawn } from 'node:child_process';

import { net } from 'electron';

import { b64encode } from './pagesigner/core/utils';
import type { EnvironmentInfo } from './environment';
import type { ClientMpcResult } from './mpc-main';
import type { NotarySettings } from './notarization';

/**
 * @return A string representation of a tag verification share big integer
 */
function prepareTagVerification(
  env: EnvironmentInfo,
  clientKeyShare: string,
  iv: string,
  inputFile: string,
  aad: string,
  mpcMasks: ClientMpcResult,
  onScriptError: (data: { code: number|null; errorBuffer: string }) => void = () => {},
): Promise<string> {
  // prep_tag_verification.py path
  const scriptPath = join(env.cacheDir, 'prep_tag_verification.py');

  const scriptProcess = spawn(
    env.tools.python,
    [
      scriptPath,
      mpcMasks.powersOfHMask,
      clientKeyShare,
      iv,
      mpcMasks.tagMaskMask,
      inputFile,
      aad,
    ],
    { shell: process.env.SHELL || true },
  );

  return new Promise((resolve, reject) => {
    let errorBuffer = '';
    let outputBuffer = '';
    scriptProcess.stderr.on('data', (data: string) => { errorBuffer += data; });
    scriptProcess.stdout.on('data', (data: string) => { outputBuffer += data; });

    scriptProcess.on('error', (err) => {
      console.error(err);
      reject(new Error('failed to prepare tag verification'));
    });

    scriptProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error('prep_tag_verification.py error log\n', errorBuffer);

        onScriptError({ code, errorBuffer });
        reject(new Error('preparing tag verification returned an error'));
        return;
      }

      try {
        const tagShareParty1 = BigInt(outputBuffer.replaceAll('\n', ''));
        resolve(tagShareParty1.toString());
      } catch (e) {
        console.error();
        reject(new Error('preparing tag verification produced unexpected result'));
      }
    });
  });
}

async function requestTagVerification(notary: NotarySettings, sessionId: string, clientIvShare: Uint8Array, record: Uint8Array) {
  if (record.length < 8) {
    throw new Error('invalid TLS record cannot be used to create tag verification');
  }
  // first 8 bytes is a part of a record nonce, which backend needs to recreate for tag verification
  const recordIV = record.slice(0, 8);
  const response = await net.fetch(
    `http://${notary.notaryIP}:${notary.notaryPort}/prepTagVerification?${sessionId}`,
    {
      method: 'POST',
      mode: 'cors',
      keepalive: true,
      body: JSON.stringify({ clientIvShare: b64encode(clientIvShare), recordIv: b64encode(recordIV) }),
    },
  );
  if (response.status !== 200) {
    throw new Error('unexpected response status code');
  }
  let body: { error?: string } = {};
  try {
    body = await response.json() as object;
  } catch (_) {
    // no body means no error
    return;
  }
  if (body.error) {
    throw new Error(body.error);
  }
}

type PollResponse = {
  busy: boolean
  complete: boolean
  error?: string
}

async function pollTagVerification(notary: NotarySettings, sessionId: string, isCancelled: () => void) {
  for (let attempt = 0; attempt < 60; attempt++) {
    isCancelled();

    const response = await net.fetch(
      `http://${notary.notaryIP}:${notary.notaryPort}/pollTagVerification?${sessionId}`,
      {
        method: 'POST',
        mode: 'cors',
      },
    );

    const body = await response.json() as PollResponse;
    if (body.busy) {
      await new Promise((resolve) => { setTimeout(resolve, 10 * 1000); });
      continue;
    }

    if (body.error) {
      throw new Error(body.error);
    }

    if (!body.complete) {
      throw new Error('Tag verification MPC didn\'t complete');
    }

    return;
  }
}

async function verifyTag(
  notary: NotarySettings,
  sessionId: string,
  witnessString: string,
  aad: string,
  tagShare: string,
): Promise<{ ciphertext: string[]; signature: string }> {
  const witness = JSON.parse(witnessString) as { ciphertext: string[] };
  const response = await net.fetch(
    `http://${notary.notaryIP}:${notary.notaryPort}/tagVerification?${sessionId}`,
    {
      method: 'POST',
      mode: 'cors',
      keepalive: true,
      body: JSON.stringify({
        ciphertext: witness.ciphertext,
        aad,
        tagShare,
      }),
    },
  );

  if (response.status !== 200) {
    throw new Error('unexpected response status code');
  }

  let body: { error?: string; status?: string; signature?: string; ciphertext?: string[] } = {};
  try {
    body = await response.json() as object;
  } catch {
    throw new Error('unexpected tag verification response');
  }

  if (body.error) {
    throw new Error(body.error);
  }

  if (body.status === 'verified') {
    const { ciphertext, signature } = body as { ciphertext: string[]; signature: string };
    return { ciphertext, signature };
  } if (body.status === 'failed') {
    let errorString = 'tag verification failed';
    if (body.error) {
      errorString += `, reason - ${body.error}`;
    }
    throw new Error(errorString);
  } else {
    throw new Error(`unknown tag verification status: ${body.status || 'unknown'}`);
  }
}

export {
  prepareTagVerification,
  pollTagVerification,
  requestTagVerification,
  verifyTag,
};

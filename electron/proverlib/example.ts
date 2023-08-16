/* eslint-disable max-len */

import { join } from 'node:path';
import crypto from 'node:crypto';
import { writeFileSync } from 'node:fs';

import { fetch, request, Dispatcher } from 'undici';

import {
  prepareEnvironment, deleteTempDir, testTools, getUserDataDirectory, EnvironmentInfo,
} from './environment';
import {
  prepareMainCircuit, compileMainCircuit,
  prepareCircomInput, generateWitness, createProof, verifyProof, saveProof, saveVerificationKey,
} from './circom';
import runNotarize from './notarization';
import { ba2str, b64decode } from './pagesigner/core/utils';
import type { NotarySettings } from './notarization';
import runMpcMain, { ClientMpcResult, MpcConfig } from './mpc-main';
import {
  pollTagVerification,
  prepareTagVerification, requestTagVerification, verifyTag,
} from './tag-verification';

async function verifySignatureExample(notary: NotarySettings, signature: string, witness: string): Promise<boolean> {
  const signatureBytes = Buffer.from(signature, 'hex');
  const witnessObj = JSON.parse(witness) as { ciphertext: string[] };
  const ciphertext = witnessObj.ciphertext.map((s) => parseInt(s, 10));

  const signingPubKeyResponse = await fetch(`http://${notary.notaryIP}:${notary.notaryPort}/signing-key.pem`);
  const signingKeyPem = await signingPubKeyResponse.text();

  const publicKey = crypto.createPublicKey(signingKeyPem);
  return crypto.createVerify('SHA256').update(Uint8Array.from(ciphertext)).verify(publicKey, signatureBytes);
}

async function exit(env: EnvironmentInfo, code: number): Promise<void> {
  await deleteTempDir(env);
  process.exit(code);
}

type getKeysResponse = {
  pk: string
  vk: string
  size: number
  error?: string
}

const downloadKeys = (response: Dispatcher.ResponseData): Promise<getKeysResponse> => new Promise((resolve) => {
  let downloadedSize = 0;
  const totalSize = Number(response.headers['x-content-length']);
  const buffer = Buffer.alloc(totalSize);

  let progress = 0;

  response.body.on('data', (chunk: Buffer) => {
    chunk.copy(buffer, downloadedSize);
    downloadedSize += chunk.length;

    const currentProgress = +((downloadedSize / totalSize) * 100).toFixed(0);
    if (progress < currentProgress) {
      progress = currentProgress;
      console.log(`Downloading keys ${progress}%`);
    }
  });

  response.body.on('end', () => {
    console.log('\nDownload complete!');
    resolve(JSON.parse(buffer.toString()));
  });
});

async function main() {
  // paths for tools can be provided by a config
  const pythonBinaryPath = 'python3';
  const circomBinaryPath = 'circom';
  // app config
  const notary: NotarySettings = {
    notaryIP: '127.0.0.1',
    notaryPort: 10011,
    sessionOptions: {
      maxFragmentLength: 2048,
      mustVerifyCert: true,
    },
    useNotaryNoSandbox: true,
  };
  const mpcServerConfig: MpcConfig = {
    IP: '127.0.0.1',
    mpcIvPort: 10020,
    mpcPoHPort: 10030,
  };

  const toolsConfig = { python: pythonBinaryPath, circom: circomBinaryPath };

  await testTools(toolsConfig);

  const env = await prepareEnvironment(toolsConfig, getUserDataDirectory(), 'prove-this-client-');

  const result = await runNotarize(env, notary, 'google.com', 'GET / HTTP/1.1\r\nHost: www.google.com\r\nUser-Agent: curl/7.74.0\r\nAccept: */*\r\n');
  console.log('NOTARIZATION SUCCESS\n');

  // Do the next block after knowing how many blocks we need
  const tlsRecord = 0;
  const aesBlocksToReveal = 1;

  /// //////////////////////////////////////////////////////// Circom setup
  const mainCircuit = await prepareMainCircuit(env, aesBlocksToReveal);

  // Compile main circuit
  const [constraintSystemPath, witnessProgramPath] = await compileMainCircuit(env, mainCircuit);
  console.log(`Main circuit compiled\n\t- ${constraintSystemPath}\n\t- ${witnessProgramPath}\n`);

  const response = await request(
    `http://${notary.notaryIP}:${notary.notaryPort}/zkey?size=${aesBlocksToReveal}`,
  );

  if (response.statusCode === 404) {
    throw new Error(`No keys of size ${aesBlocksToReveal}. Contact server administrator to generate required keys.`);
  }
  if (response.statusCode !== 200) {
    throw new Error('Keys request failed');
  }
  const keys = await downloadKeys(response);

  const { pk, vk } = keys;

  const provingKey = b64decode(pk);
  const verificationKey = JSON.parse(ba2str(b64decode(vk))) as object;

  console.log('saving proving key');
  const zkeyPath = `${env.cacheDir}/provingKey.zkey`;
  console.log('zkeyPath', zkeyPath);
  writeFileSync(zkeyPath, provingKey);

  // IMPORTANT: use IV in this form
  const mpcIV = `${result.tagIvList[tlsRecord]}00000001`;

  /// //////////////////////////////////////////////////////// Circom setup done

  /// //////////////////////////////////////////////////////// MPC stage
  // start the client part
  const [controller, mpcPromise] = runMpcMain(env, mpcServerConfig, result.clientServerWriteKeyShare, mpcIV);
  try {
    // request MPC on the server
    await requestTagVerification(notary, result.mpcId, result.clientSivShare, result.records[tlsRecord]);
  } catch (e) {
    console.log('requesting AES tag verification MPC error', e);
    controller.abort();
    throw e;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    await pollTagVerification(notary, result.mpcId, () => {});
  } catch (e) {
    console.log('AES tag verification MPC error', e);
    controller.abort();
    throw e;
  }
  // controller.abort(); // cancelling MPC operation
  let mpcMasks: ClientMpcResult;
  try {
    mpcMasks = await mpcPromise;
  } catch (e) {
    console.log('MPC error', e);
    await exit(env, 1);
    return;
  }
  /// //////////////////////////////////////////////////////// MPC stage done

  // ///////////////////////////////////////////////////////// Proving AES stage

  const startingindex = 0;
  const plaintextBytesToReveal = 10;

  const [privateInputPath, inputPath] = await prepareCircomInput(
    env,
    result.inputsList[tlsRecord],
    result.aadList[tlsRecord],
    startingindex,
    plaintextBytesToReveal,
    aesBlocksToReveal,
    result.clientServerWriteKeyShare,
    result.notaryServerWriteKeyShare,
  );

  const generatedWitnessPath = await generateWitness(env, witnessProgramPath, privateInputPath);

  const [proof, publicInputs] = await createProof(zkeyPath, generatedWitnessPath);

  console.log('Created proof:\n', proof);
  console.log('Public inputs:\n', publicInputs);

  // find the end of revealed plaintext
  const plaintextEnd = startingindex + plaintextBytesToReveal;
  // find the end of total plaintext in publicInputs
  const blockEnd = Math.ceil(plaintextEnd / 16) * 16;
  // get the slice of proven cleartext from publicInputs
  const provenCleartext = (publicInputs as string[]).slice(0, blockEnd);
  console.log('Proven cleartext:', provenCleartext);
  // decode chars from plaintext bytes, skip hidden bytes
  const decodedProvenCleartext = provenCleartext.slice(startingindex, plaintextEnd).map((s) => String.fromCharCode(parseInt(s, 10)));
  console.log('Decoded proven cleartext:', decodedProvenCleartext);

  const success = await verifyProof(proof, publicInputs, verificationKey);
  if (success) {
    console.log('Proof verified');
  } else {
    console.error('Proof verification failed');
  }

  // Can ask the user where to save this stuff
  await saveProof(proof, join(env.circomBuildDir, 'proof.json'), publicInputs, join(env.circomBuildDir, 'public.json'));
  await saveVerificationKey(verificationKey, join(env.circomBuildDir, 'verify.json'));

  // Tag verification
  const tagShare = await prepareTagVerification(env, result.clientServerWriteKeyShare, mpcIV, inputPath, result.aadList[tlsRecord], mpcMasks);

  try {
    const { signature } = await verifyTag(notary, result.mpcId, result.inputsList[tlsRecord], result.aadList[tlsRecord], tagShare);
    console.log('Tag verification signature:', signature);
    const verified = await verifySignatureExample(notary, signature, result.inputsList[tlsRecord]);
    console.log('Tag verification signature verified:', verified);
    await exit(env, verified ? 0 : 1);
  } catch (e) {
    console.error('tag verification', e);
    await exit(env, 1);
  }
}

main();

/* eslint-disable @typescript-eslint/no-empty-function */
import { join, parse as parsePath } from 'node:path';
import * as fs from 'node:fs';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';

import { groth16, zKey } from 'snarkjs';
import { utils } from 'ffjavascript';
import bfj from 'bfj';

import witnessBuilder from './witness_calculator';
import { EnvironmentInfo } from './environment';

const { stringifyBigInts } = utils;

const fsCopyFile = promisify(fs.copyFile);
const fsExists = promisify(fs.exists);
const fsWriteFile = promisify(fs.writeFile);
const fsReadFile = promisify(fs.readFile);

enum CircomOptimizeLevel {
  NO = 'O0',
  SIMPLE = 'O1',
  FULL = 'O2',
}

function createMainCircuit(numBlocksToReveal: number): string {
  return `pragma circom 2.0.0;

include "aes.circom";
include "bitify.circom";
include "key_shares.circom";

template Main(maxBlocksToReveal) {
  var keyLength = 16;
  var hashLength = 32;
  var nonceLength = 12;
  var ciphertextlen = maxBlocksToReveal*16;

  signal input ciphertext[ciphertextlen];
  signal input client_key_share[keyLength];
  signal input client_key_share_commitment[hashLength];
  signal input notary_key_share[keyLength];
  signal input nonce[nonceLength];
  signal input starting_aes_block;
  signal input bytes_to_reveal[ciphertextlen];
  signal output plaintext[ciphertextlen];

  component aes = aes(ciphertextlen, keyLength*8);

  component Num2BitsCiphertext[ciphertextlen];
  for (var i = 0; i < ciphertextlen; i++) {
    Num2BitsCiphertext[i] = Num2Bits(8);
    Num2BitsCiphertext[i].in <== ciphertext[i];
    for (var j = 0; j < 8; j++) {
      aes.ciphertext[i][j] <== Num2BitsCiphertext[i].out[7 - j];
    }
  }

  component keyCommitment = CheckKeySharesCommitment();
  for (var i = 0; i < keyLength; i++) {
    keyCommitment.client_key_share[i] <== client_key_share[i];
    keyCommitment.notary_key_share[i] <== notary_key_share[i];
  }
  for (var i = 0; i < hashLength; i++) {
    keyCommitment.hash[i] <== client_key_share_commitment[i];
  }
  for (var i = 0; i < keyLength; i++) {
    for (var j = 0; j < 8; j++) {
      aes.key[8*i + j] <== keyCommitment.out[i][7 - j];
    }
  }

  for (var i = 0; i < 12; i++) {
    aes.nonce[i] <== nonce[i];
  }
  aes.starting_aes_block <== starting_aes_block;

  // Converting back to bytes and revealing only those bytes as noted in bytes_to_reveal
  signal totalPlaintext[ciphertextlen];
  component Bits2Num[ciphertextlen];
  component SelectPlaintextToReveal[ciphertextlen];
  for (var i = 0; i < ciphertextlen; i++) {
    Bits2Num[i] = Bits2Num(8);
    for (var k = 0; k < 8; k++) {
      Bits2Num[i].in[7 - k] <== aes.plaintext[i][k];
    }
    totalPlaintext[i] <== Bits2Num[i].out;
    SelectPlaintextToReveal[i]  = select2();
    SelectPlaintextToReveal[i].values[1] <== 0;
    SelectPlaintextToReveal[i].values[0] <== totalPlaintext[i];
    SelectPlaintextToReveal[i].bits[0] <== bytes_to_reveal[i];
    plaintext[i] <== SelectPlaintextToReveal[i].out;
    log(plaintext[i]);
  }
}

// NOTE: a requirement for succesful proof creation/validation is that all output variables are set (and potentially tested)
// NOTE: according to DECO nonce/IV is public (see appendix B.2)
component main {public [ ciphertext, client_key_share, client_key_share_commitment, nonce, starting_aes_block, bytes_to_reveal ]} = Main(${numBlocksToReveal});
`;
}

async function prepareMainCircuit(env: EnvironmentInfo, blocksToReveal: number): Promise<string> {
  const mainCircuitPath = join(env.circomCircuitsDir, `main_${blocksToReveal}.circom`);
  // if (await fsExists(mainCircuitPath)) {
  //   return mainCircuitPath;
  // }

  await fsWriteFile(mainCircuitPath, createMainCircuit(blocksToReveal));
  return mainCircuitPath;
}

async function compileMainCircuit(
  env: EnvironmentInfo,
  mainCircuitPath: string,
  onScriptError: (data: { code: number|null; errorBuffer: string }) => void = () => {},
  abortSignal: AbortSignal|undefined = undefined,
  optimizeLevel = CircomOptimizeLevel.SIMPLE,
): Promise<[constraintSystem: string, witness: string]> {
  const mainPath = parsePath(mainCircuitPath);
  const tempMain = join(mainPath.dir, 'main.circom');
  // move main_<N>.circom to main.circom temporarily so that it's easier to work with it
  await fsCopyFile(mainCircuitPath, tempMain);

  console.log('Compiling circom circuit...');

  // compile
  const circom = spawn(
    env.tools.circom,
    ['--r1cs', '--wasm', `--${optimizeLevel}`, '--output', env.circomBuildDir, tempMain],
    {
      timeout: 5 * 60 * 1000,
      shell: process.env.SHELL || true,
      signal: abortSignal,
    },
  );
  circom.stderr.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let errorBuffer = '';
    circom.on('error', (err) => reject(err));

    circom.stderr.on('data', (data: string) => { errorBuffer += data; });

    circom.on('exit', (code) => {
      if (code !== 0) {
        console.error('Circom compilation log\n', errorBuffer);

        onScriptError({ code, errorBuffer });
        reject(new Error('Failed to compile circom circuits'));
        return;
      }

      const constraintSystem = join(env.circomBuildDir, 'main.r1cs');
      const witness = join(env.circomBuildDir, 'main_js/main.wasm');

      console.log('Circom circuit compiled');
      resolve([constraintSystem, witness]);
    });
  });
}

async function generateProvingKey(env: EnvironmentInfo, constraintSystemPath: string): Promise<string> {
  const keyPath = join(env.circomBuildDir, 'main.zkey');

  console.log('Generating proving key...');
  console.time('Generated proving key');
  await zKey.newZKey(constraintSystemPath, env.ptauPath, keyPath, undefined);
  console.timeEnd('Generated proving key');
  return keyPath;
}

async function exportVerificationKey(env: EnvironmentInfo, zkeyPath: string): Promise<object> {
  // const verificationKeyPath = join(env.circomBuildDir, 'main_verify.json');
  console.time('Exported verification key');
  const verificationKey = await zKey.exportVerificationKey(zkeyPath, undefined);
  console.timeEnd('Exported verification key');

  return verificationKey;
}

/**
 * @param env Environment
 * @param input Notarization witness (@see {@link NotarizationResult#inputsList})
 * @param aad Additional authenticated data from notarization (@see {@link NotarizationResult#aadList})
 * @param startingIndex Starting index in response for decryption (relative to the TLS record)
 * @param plaintextLen Number of bytes to decrypt in response
 * @param maxBlocksToReveal Maxiumum number of AES blocks to reveal (must be the same as in {@link prepareMainCircuit})
 * @param serverKeyShare AES key share of the server
 * @return Generated circom input file path
 */
async function prepareCircomInput(
  env: EnvironmentInfo,
  input: string,
  aad: string,
  startingIndex: number,
  plaintextLen: number,
  maxBlocksToReveal: number,
  serverKeyShare: string,
  onScriptError: (data: { code: number|null; errorBuffer: string }) => void = () => {},
): Promise<[circomInputPath: string, witnessInputPath: string]> {
  // create_circom_files.py expects input to be a file so we need to create it first
  const hash = createHash('sha1');
  hash.update(input);
  const witnessInputFileName = hash.digest('hex');
  let witnessInputPath: string;
  try {
    witnessInputPath = join(env.tempDir, `${witnessInputFileName}.json`);
    await fsWriteFile(witnessInputPath, input);
  } catch (e) {
    console.error(e);
    throw new Error('failed to prepare circom input files!');
  }

  // create_circom_files.py path
  const scriptPath = join(env.cacheDir, 'create_circom_files.py');

  // create paths for the output of create_circom_files.py
  const circomInputPath = join(env.tempDir, `${witnessInputFileName}-input.json`);

  const scriptProcess = spawn(
    env.tools.python,
    [
      scriptPath,
      witnessInputPath,
      aad,
      startingIndex.toString(),
      plaintextLen.toString(),
      maxBlocksToReveal.toString(),
      serverKeyShare,
      circomInputPath,
    ],
    { shell: process.env.SHELL || true },
  );

  return new Promise((resolve, reject) => {
    let errorBuffer = '';
    scriptProcess.stderr.on('data', (data: string) => { errorBuffer += data; });

    scriptProcess.on('error', (err) => {
      console.error(err);
      reject(new Error('failed to prepare circom input files!'));
    });

    scriptProcess.on('exit', (code) => {
      if (code !== 0) {
        console.error('create_circom_files.py error log\n', errorBuffer);

        onScriptError({ code, errorBuffer });
        reject(new Error('creating circom input files returned an error'));
        return;
      }

      console.log(`created circom input files at:\n\t- ${circomInputPath}`);
      resolve([circomInputPath, witnessInputPath]);
    });
  });
}

async function generateWitness(env: EnvironmentInfo, witnessProgramPath: string, inputPath: string): Promise<string> {
  const outputPath = join(env.tempDir, 'witness.wtns');
  const [witnessProgram, input] = await Promise.all([
    fsReadFile(witnessProgramPath),
    fsReadFile(inputPath, { encoding: 'utf8' }),
  ]);
  const witnessCalculator = await witnessBuilder(witnessProgram);
  const calculatedWitness = await witnessCalculator.calculateWTNSBin(JSON.parse(input) as object, false);

  await fsWriteFile(outputPath, calculatedWitness);
  return outputPath;
}

async function createProof(
  zkeyPath: string,
  generatedWitnessPath: string,
): Promise<[proof: object, publicInputs: object]> {
  console.log('Creating proof...');
  console.time('Created proof');
  const { proof, publicSignals } = await groth16.prove(zkeyPath, generatedWitnessPath, undefined);
  console.timeEnd('Created proof');

  return [proof, publicSignals];
}

function saveProof(proof: object, proofOutputPath: string, publicInputs: object, publicInputsOutputPath: string): Promise<void> {
  return Promise.all([
    bfj.write(proofOutputPath, stringifyBigInts(proof), { space: 1 }),
    bfj.write(publicInputsOutputPath, stringifyBigInts(publicInputs), { space: 1 }),
  ])
    .then(() => Promise.resolve())
    .catch((e) => Promise.reject(e));
}

async function verifyProof(proof: object, publicInputs: object, verificationKey: object): Promise<boolean> {
  console.log('Verifying proof...');
  console.time('Verified proof');
  const success = await groth16.verify(verificationKey, publicInputs, proof, undefined);
  console.timeEnd('Verified proof');
  return success;
}

function saveVerificationKey(verificationKey: object, verificationKeyPath: string): Promise<void> {
  return bfj.write(verificationKeyPath, stringifyBigInts(verificationKey), { space: 1 });
}

export {
  prepareMainCircuit,
  compileMainCircuit,
  generateProvingKey,
  exportVerificationKey,
  generateWitness,
  createProof,
  prepareCircomInput,
  saveProof,
  verifyProof,
  saveVerificationKey,

  CircomOptimizeLevel,
};

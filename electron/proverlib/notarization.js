/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable import/first */
/* eslint-disable import/order */

import { join } from 'path';
import http from 'http';
import fs from 'fs';

import jsdom from 'jsdom';

import CBOR from 'cbor-js';

import { promisify } from 'util';

const fsWriteFile = promisify(fs.writeFile);

global.sodium = require('libsodium-wrappers-sumo');
global.nacl = require('tweetnacl');
global.ECSimple = require('simple-js-ec-math');

import fastsha256 from 'fast-sha256';

import { net } from 'electron';

// eslint-disable-next-line @typescript-eslint/unbound-method
global.fetch = net.fetch;

import { assert, b64decode, b64encode } from './pagesigner/core/utils';
import { parse_certs as parseCerts } from './pagesigner/core/verifychain';
import { verifyNotary, getURLFetcherDoc } from './pagesigner/core/oracles';
import * as COSE from './pagesigner/core/third-party/coseverify';
import SocketNode from './socket-dropin';
import mWorker from './worker-dropin';
import { EnvironmentInfo } from './environment';
//
global.bcuNode = require('bigint-crypto-utils');
// this must be imported dynamically after global.bcuNode becomes available
import { TLSNotarySession } from './pagesigner/core/TLSNotarySession';
import { Main } from './pagesigner/core/Main';

const { Crypto } = require('@peculiar/webcrypto');
const pkijs = require('pkijs');

const crypto = new Crypto();
global.crypto = crypto;

pkijs.setEngine('newEngine', crypto, new pkijs.CryptoEngine({ name: 'newEngine', crypto, subtle: crypto.subtle }));

/**
 * @param {string} pagesignerCacheDir
 */
function setup(pagesignerCacheDir) {
  global.CBOR = CBOR;
  global.COSE = COSE;
  global.keepAliveAgent = new http.Agent({ keepAlive: true });
  global.DOMParser = new jsdom.JSDOM().window.DOMParser;
  global.fs = fs;

  global.fastsha256 = fastsha256;
  global.performance = { now() { return 0; } };
  global.chrome = {
    extension: {
      getURL: (/** @type {string} */ url) => join(pagesignerCacheDir, url),
    },
  };

  global.SocketNode = SocketNode;
  global.Worker = mWorker;
}

/**
 * @typedef {object} NotaryObject
 * @property {string} IP
 * @property {string} pubkeyPEM
 * @property {Uint8Array} URLFetcherDoc
 */

/**
 * @typedef {object} NotarizationSessionOptions
 * @property {512|1024|2048|4096} maxFragmentLength
 * @property {boolean} mustVerifyCert
 */

/**
 * @typedef {object} NotarySettings
 * @property {string} notaryIP
 * @property {number} notaryPort
 * @property {number} otPort
 * @property {boolean} useNotaryNoSandbox
 * @property {NotarizationSessionOptions} sessionOptions
 */

/**
 * @param {string} cacheDir
 * @param {NotarySettings} notary
 * @returns {Promise<NotaryObject>}
 */
async function setupNotary(cacheDir, notary) {
  const tnPath = join(cacheDir, 'trustedNotary');
  if (fs.existsSync(tnPath)) {
    // load notary from disk
    /** @type {string} */ const notaryCache = fs.readFileSync(tnPath, { encoding: 'utf8' });
    const obj = JSON.parse(notaryCache);
    obj.URLFetcherDoc = b64decode(obj.URLFetcherDoc);
    console.log('Using cached notary from ', tnPath);
    console.log('Notary IP address: ', obj.IP);
    console.log('Notary port: ', obj.port);
    return obj;
  }
  // fetch and verify the URLFetcher doc
  const URLFetcherDoc = await getURLFetcherDoc(notary.notaryIP, notary.notaryPort);
  const trustedPubkeyPEM = await verifyNotary(URLFetcherDoc);
  assert(trustedPubkeyPEM !== undefined);
  const obj = {
    IP: notary.notaryIP,
    port: notary.notaryPort,
    otPort: notary.otPort,
    pubkeyPEM: trustedPubkeyPEM,
    URLFetcherDoc,
  };
  // save the notary to disk
  const objSave = {
    IP: obj.IP,
    port: obj.notaryPort,
    otPort: notary.otPort,
    pubkeyPEM: obj.pubkeyPEM,
    URLFetcherDoc: b64encode(obj.URLFetcherDoc),
  };
  fs.writeFileSync(tnPath, Buffer.from(JSON.stringify(objSave)));
  return obj;
}

/**
 * @typedef {object} Circuit
 *
 * @property {number} gatesCount
 * @property {number} wiresCount
 * @property {number} notaryInputSize
 * @property {number} clientInputSize
 * @property {number} outputSize
 * @property {number} andGateCount
 * @property {Uint8Array} gatesBlob
 */

/**
 * @typedef {object} NotarizationResult
 * @property {string} host
 * @property {string} request
 * @property {string} response
 * @property {number} timestamp
 * @property {Uint8Array[]} plaintext
 * @property {string[]} inputsList
 * @property {string[]} tagIvList
 * @property {string[]} aadList
 * @property {string} notaryServerWriteKeyShare
 * @property {string} clientServerWriteKeyShare
 * @property {Uint8Array} clientSivShare
 * @property {Uint8Array[]} records
 */

/**
 * @param {string} pagesignerCacheDir
 * @param {NotarySettings} notary
 * @param {string} server
 * @param {string} headers
 * @returns {Promise<NotarizationResult>}
 */
async function notarize(pagesignerCacheDir, notary, server, headers) {
  const psPath = join(pagesignerCacheDir, 'notaryCircuits.json');

  // load serialized circuits
  /** @type {string} */ const circuitsCache = fs.readFileSync(psPath, { encoding: 'utf8' });
  /** @type {Map<string, Circuit>} */ const circuits = JSON.parse(circuitsCache);

  for (const [k, circuit] of Object.entries(circuits)) {
    circuits[k].gatesBlob = b64decode(circuit.gatesBlob);
  }

  // prepare root store certificates
  const rootStorePath = join(pagesignerCacheDir, 'certs.txt');
  await parseCerts(fs.readFileSync(rootStorePath).toString());

  // split into lines keeping the delimiter at the end of each line
  /** @type {Array<string>} */ const headerLines = headers.split(/(?<=\r\n|\n)/);
  let parsedHeaders = '';
  let blankLineWasFound = false;
  for (let i = 0; i < headerLines.length; i++) {
    if (blankLineWasFound) { // keep request body as it is
      parsedHeaders += `${headerLines[i].split(/\r\n|\n/)[0]}\r\n`;
      parsedHeaders += '\r\n';
      parsedHeaders += '\r\n';
    } else if (i > 0 && ['\r\n', '\n'].includes(headerLines[i])) { // a blank line was found
      blankLineWasFound = true;
      parsedHeaders += '\r\n';
    } else { // replace whatever delimiter is at the end with /r/n
      parsedHeaders += `${headerLines[i].split(/\r\n|\n/)[0]}\r\n`;
    }
  }
  if (!blankLineWasFound) {
    parsedHeaders += '\r\n';
  }

  if (notary.sessionOptions.maxFragmentLength !== undefined && parsedHeaders.length >= notary.sessionOptions.maxFragmentLength) {
    throw new Error(`request is bigger than maximum TLS fragment length ${notary.sessionOptions.maxFragmentLength}`);
  }

  const m = new Main();
  if (notary.useNotaryNoSandbox) {
    m.trustedOracle = await m.queryNotaryNoSandbox(notary.notaryIP, notary.notaryPort);
    m.trustedOracle.otPort = notary.otPort;
  } else {
    m.trustedOracle = await setupNotary(pagesignerCacheDir, notary);
  }
  // start the actual notarization
  const session = new TLSNotarySession(server, 443, parsedHeaders, m.trustedOracle, notary.sessionOptions, circuits, null);
  const obj = await session.start();
  obj.title = 'PageSigner notarization file';
  obj.version = 6;
  if (!notary.useNotaryNoSandbox) {
    obj['URLFetcher attestation'] = m.trustedOracle.URLFetcherDoc;
  }
  const {
    host, request, response, timestamp, plaintext, ciphertext, inputsList, tagIvList, aadList,
  } = await m.verifyPgsgV6(obj, notary.useNotaryNoSandbox);
  /** @type {Uint8Array} */ const notaryShare = obj['notary server_write_key share'];
  const notaryServerWriteKeyShare = Buffer.from(notaryShare).toString('hex');
  /** @type {Uint8Array} */ const clientShare = obj['client server_write_key share'];
  const clientServerWriteKeyShare = Buffer.from(clientShare).toString('hex');
  const clientSivShare = obj['client server_write_iv share'];

  return {
    host,
    request,
    response,
    timestamp,
    plaintext,
    ciphertext,
    inputsList,
    tagIvList,
    aadList,
    notaryServerWriteKeyShare,
    clientServerWriteKeyShare,
    mpcId: obj.mpcId,
    records: obj['server response records'],
    notarizationDocument: obj,
    clientSivShare,
  };
}

/**
 * @param {EnvironmentInfo} env
 * @param {NotarySettings} notary
 * @param {string} server
 * @param {string} headers
 * @returns {Promise<NotarizationResult>}
 */
async function runNotarize(env, notary, server, headers) {
  console.log('Setting up notarization...');
  setup(env.pagesignerCacheDir);
  console.log(`Notarizing ${server}...`);
  return notarize(env.pagesignerCacheDir, notary, server, headers);
}

export async function saveNotarizationDocument(document, path) {
  // {
  //   'notary PMS share': notaryPMSShare,
  //   'client PMS share': pmsShare,
  //   'client random': cr,
  //   'server random': sr,
  //   'notary client_write_key share': notaryCwkShare,
  //   'notary client_write_iv share': notaryCivShare,
  //   'notary server_write_key share': notarySwkShare,
  //   'notary server_write_iv share': notarySivShare,
  //   'client client_write_key share commitment': cwkShareHash,
  //   'client client_write_iv share commitment': civShareHash,
  //   'client server_write_key share commitment': swkShareHash,
  //   'client server_write_iv share commitment': sivShareHash,
  //   mpcId: this.twopc.uid,
  // }

  // the fields above are not needed to verify the session signature and the ZK proof.
  // adding notary's shares to the saved document will allow restoring the decryption key
  // and reading the whole ciphertext, which we don't want.
  const notarizationDocumentSave = {
    certificates: document.certificates,
    'notarization time': document['notarization time'],
    'server RSA sig': document['server RSA sig'],
    'server pubkey for ECDHE': document['server pubkey for ECDHE'],
    'client request ciphertext': document['client request ciphertext'],
    'server response records': document['server response records'],
    'session signature': document['session signature'],
    'ephemeral pubkey': document['ephemeral pubkey'],
    'ephemeral valid from': document['ephemeral valid from'],
    'ephemeral valid until': document['ephemeral valid until'],
    'ephemeral signed by master key': document['ephemeral signed by master key'],
    'client client_write_key share': document['client client_write_key share'],
    'client client_write_iv share': document['client client_write_iv share'],
    'client server_write_key share': document['client server_write_key share'],
    'client server_write_iv share': document['client server_write_iv share'],
  };

  await fsWriteFile(path, JSON.stringify(notarizationDocumentSave));
}

export default runNotarize;

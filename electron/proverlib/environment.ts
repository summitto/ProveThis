import * as fs from 'node:fs';
import { constants as fsConstants } from 'node:fs';
import { join, resolve as resolvePath } from 'node:path';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { promisify } from 'node:util';

import {
  gte as versionGreaterOrEqual, coerce as versionParse, SemVer,
} from 'semver';

import { name } from '../../package.json';

const fsExists = promisify(fs.exists);
const fsMkdir = promisify(fs.mkdir);
const fsAccess = promisify(fs.access);
const fsMkdtemp = promisify(fs.mkdtemp);
const fsRm = promisify(fs.rm);
const fsStat = promisify(fs.stat);
const fsCopyFile = promisify(fs.copyFile);

const fsCopy = (source: string | URL, destination: string | URL, opts: fs.CopyOptions): Promise<void> => new Promise((resolve, reject) => {
  fs.cp(source, destination, opts, (err: NodeJS.ErrnoException | null) => {
    if (err) {
      reject(err);
      return;
    }

    resolve();
  });
});

type EnvironmentInfo = {
  cacheDir: string
  circomBuildDir: string
  circomCircuitsDir: string
  mpcCircuitsDir: string
  pagesignerCacheDir: string
  ptauPath: string
  tempDir: string
  tools: ToolsConfig
}

type ToolsConfig = {
  // path to python3 executable
  python: string
  // path to circom compiler executable
  circom: string
}

const PYTHON_MIN_VERSION = '3.6.0';
const CIRCOM_MIN_VERSION = '2.1.5';

async function prepareCacheDir(cacheDir: string): Promise<string> {
  const cacheDirPath = resolvePath(cacheDir);
  if (!await fsExists(cacheDirPath)) {
    // create a directory with default permissions
    try {
      await fsMkdir(cacheDirPath, { recursive: true });
      return cacheDirPath;
    } catch (e) {
      console.log(e);
      throw new Error('failed to create cache directory');
    }
  } else {
    // if the directory exists, check that it has correct permissions
    try {
      const { R_OK, W_OK, X_OK } = fsConstants;
      await fsAccess(cacheDirPath, R_OK | W_OK | X_OK);
      return cacheDirPath;
    } catch (e) {
      console.log(e);
      throw new Error(`cache directory ${cacheDirPath} doesn't have read/write/execute permissions`);
    }
  }
}

async function prepateTempDir(tempPrefix: string): Promise<string> {
  try {
    const tempDir = await fsMkdtemp(join(tmpdir(), tempPrefix));
    return tempDir;
  } catch (e) {
    console.log(e);
    throw new Error('failed to create temp directory');
  }
}

async function prepareCircomBuildDir(circomBuildDir: string) {
  // clean circom output dir if it exists
  if (await fsExists(circomBuildDir)) {
    await fsRm(circomBuildDir, { recursive: true });
  }
  await fsMkdir(circomBuildDir);
}

async function copyPtauFile(cacheDir: string, bundledStaticDir: string, ptauFileName: string): Promise<string> {
  const bundledPtauPath = join(bundledStaticDir, ptauFileName);
  const targetPtauPath = join(cacheDir, ptauFileName);

  const targetExists = await fsExists(targetPtauPath);
  let needToCopy = true;
  if (targetExists) {
    const [targetPtauStats, bundledPtauStats] = await Promise.all([fsStat(targetPtauPath), fsStat(bundledPtauPath)]);
    if (targetPtauStats.size === bundledPtauStats.size) {
      needToCopy = false;
    }
  }

  if (needToCopy) {
    await fsCopyFile(bundledPtauPath, targetPtauPath);
  }

  return targetPtauPath;
}

async function prepareEnvironment(toolsConf: ToolsConfig, cacheDir: string, tempDirPrefix: string, ptauFileName?: string): Promise<EnvironmentInfo> {
  const cacheDirPath = await prepareCacheDir(cacheDir);
  console.log('Using cache directory', cacheDirPath);

  const tempDir = await prepateTempDir(tempDirPrefix);
  console.log('Using temp directory', tempDir);

  const bundledStaticDir = resolvePath(__dirname, '../static');

  const circomBuildDir = join(cacheDirPath, 'circom');
  const circomCacheDir = join(cacheDirPath, 'circom_circuits');
  const mpcCacheDir = join(cacheDirPath, 'mpc_circuits');
  const pagesignerCacheDir = join(cacheDirPath, 'pagesigner');

  const copyOptions = { recursive: true, force: true, dereference: true };

  await Promise.all([
    // create a clean dir for circom circuit build output
    prepareCircomBuildDir(circomBuildDir),
    // copy bundled circom circuits to cache
    fsCopy(join(bundledStaticDir, 'circom_circuits'), circomCacheDir, copyOptions),
    // copy bundled AES MPC circuits to cache
    fsCopy(join(bundledStaticDir, 'mpc_circuits'), mpcCacheDir, copyOptions),
    // copy bundled pagesigner misc files to cache
    fsCopy(join(bundledStaticDir, 'pagesigner'), pagesignerCacheDir, copyOptions),
    // copy bundled custom version of tlslite-ng python library
    fsCopy(join(bundledStaticDir, 'tlslite-ng'), join(cacheDirPath, 'tlslite-ng'), copyOptions),
    // copy python script for generating circom input
    fsCopy(join(bundledStaticDir, 'create_circom_files.py'), join(cacheDirPath, 'create_circom_files.py'), copyOptions),
    // copy python script for preparing AES tag verification on the client's side
    fsCopy(join(bundledStaticDir, 'prep_tag_verification.py'), join(cacheDirPath, 'prep_tag_verification.py'), copyOptions),
  ]);

  // copy bundled PTAU file to cache
  let cachedPtauFilePath = '';
  if (ptauFileName) {
    cachedPtauFilePath = await copyPtauFile(cacheDir, bundledStaticDir, ptauFileName);
  }
  console.log('Environment ready\n');

  return {
    cacheDir: cacheDirPath,
    circomBuildDir,
    circomCircuitsDir: circomCacheDir,
    mpcCircuitsDir: mpcCacheDir,
    pagesignerCacheDir,
    ptauPath: cachedPtauFilePath,
    tempDir,
    tools: toolsConf,
  };
}

async function deleteTempDir(env: EnvironmentInfo) {
  try {
    await fsRm(env.tempDir, { recursive: true });
  } catch (e) {
    console.warn(`failed to clean up temporary directory: ${env.tempDir}`);
  }
}

function detectToolVersion(toolName: string, toolBin: string, versionArg: string, transform: (arg: string) => string): Promise<SemVer> {
  console.log(`Checking ${toolName} version...`);
  console.log(`Path: ${toolBin}`);
  const tool = spawn(toolBin, [versionArg], { timeout: 1000, shell: process.env.SHELL || true });

  return new Promise((resolve, reject) => {
    tool.on('error', (err) => reject(err));

    tool.stderr.on('data', (data: Buffer) => {
      reject(new Error(`unexpected output in stderr when detecting ${toolName} version\n----------\n${data.toString('utf8')}\n----------`));
    });

    tool.stdout.on('data', (data: Buffer) => {
      const stdoutString = data.toString('utf8');
      // apply all transform functions to stdoutString, passing the result of the previous transform function into the next one
      const version = transform(stdoutString);
      const parsedVersion = versionParse(version);
      if (!parsedVersion) {
        reject(new Error(`failed to parse ${toolName} version, version command output is - "${stdoutString}", found - "${version}"`));
        return;
      }
      resolve(parsedVersion);
    });
  });
}

function detectPythonVersion(pythonBin: string): Promise<SemVer> {
  return detectToolVersion('python', pythonBin, '--version', (arg: string) => arg.replace('Python ', ''));
}

function detectCircomVersion(circomBin: string): Promise<SemVer> {
  return detectToolVersion('circom', circomBin, '--version', (arg: string) => arg.replace('circom compiler ', ''));
}

/**
 * Checks that all the required executable tools exist and satisfy version requirements.
 * Can throw an error.
 */
async function testTools(conf: ToolsConfig) {
  const pythonVersion = await detectPythonVersion(conf.python);
  const pythonVersionOk = versionGreaterOrEqual(pythonVersion, PYTHON_MIN_VERSION);
  if (!pythonVersionOk) {
    throw new Error(`python version requirement is not satisfied, minimum required is ${PYTHON_MIN_VERSION}, found ${pythonVersion.version}`);
  }
  console.log('Detected python', pythonVersion.version);

  const circomVersion = await detectCircomVersion(conf.circom);
  const circomVersionOk = versionGreaterOrEqual(circomVersion, CIRCOM_MIN_VERSION);
  if (!circomVersionOk) {
    throw new Error(`circom version requirement is not satisfied, minimum required is ${PYTHON_MIN_VERSION}, found ${circomVersion.version}`);
  }
  console.log('Detected circom', circomVersion.version);
}

/**
 * @returns {string} System-dependant user data directory with the name of this package appended
 * @example getUserDataDirectory() // output on OS X: /Users/{user name}/Library/Preferences/{package name}
 * @example getUserDataDirectory() // output on Linux: /home/{user name}/.local/share/{package name}
 * @example getUserDataDirectory() // output on Windows: C:\Users\{user name}\AppData\Roaming\{package name}
 */
function getUserDataDirectory(): string {
  const appName = name;
  if (process.env.APPDATA) {
    return join(process.env.APPDATA, appName);
  }

  const home: string = process.env.HOME || '';
  if (process.platform === 'darwin') {
    return join(home, '/Library/Preferences', appName);
  }
  return join(home, '/.local/share', appName);
}

export {
  prepareEnvironment,
  deleteTempDir,
  testTools,
  getUserDataDirectory,
  EnvironmentInfo,
  ToolsConfig,
};

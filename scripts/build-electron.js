const path = require('path');
const { cpSync } = require('fs');
const { spawnSync } = require('child_process');


function build() {
  console.log('Building electron main...');
  const rootDir = process.cwd();

  const tsc = spawnSync('npx', ['tsc', '-p', 'electron'], { encoding: 'utf8' });
  if (tsc.error) {
    console.error(tsc.error);
    process.exit(1);
  }

  if (tsc.status !== 0) {
    console.log(tsc.stderr);
    console.log(tsc.stdout);
    process.exit(tsc.status);
  }

  cpSync(path.join(rootDir, 'electron/static'), path.join(rootDir, 'build/electron/static'), { dereference: true, force: true, recursive: true });
  cpSync(path.join(rootDir, 'electron/preloads'), path.join(rootDir, 'build/electron/preloads'), { dereference: true, force: true, recursive: true });
  console.log('Finished building electron main!');
}

build();

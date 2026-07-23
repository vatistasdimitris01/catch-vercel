#!/usr/bin/env node
import { execSync } from 'child_process';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import React from 'react';
import { render } from 'ink';
import App from './App.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

function getLocalVersion(): string {
  try {
    const pkg = JSON.parse(readFileSync(resolve(__dirname, '../../package.json'), 'utf-8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

function runUpdate() {
  const pkg = 'catch-vercel';
  console.log('\x1b[36m  catching update...\x1b[0m\n');

  try {
    console.log(`\x1b[33m  current version: \x1b[0m${getLocalVersion()}`);
    console.log(`\x1b[33m  checking npm...\x1b[0m\n`);

    const result = execSync(`npm view ${pkg} version`, { encoding: 'utf-8' }).trim();
    console.log(`\x1b[33m  latest version:  \x1b[0m\x1b[32m${result}\x1b[0m\n`);

    if (result === getLocalVersion()) {
      console.log('\x1b[32m  already up to date\x1b[0m\n');
      process.exit(0);
    }

    console.log('\x1b[36m  installing...\x1b[0m\n');
    execSync(`npm install -g ${pkg}@latest`, { stdio: 'inherit' });
    console.log('\n\x1b[32m  updated\x1b[0m\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\n\x1b[31m  update failed:', err.message || err, '\x1b[0m\n');
    process.exit(1);
  }
}

if (process.argv.includes('update')) {
  runUpdate();
}

process.stdout.write('\x1b[?1049h');

const instance = render(React.createElement(App), {
  exitOnCtrlC: true,
});

instance.waitUntilExit().then(() => {
  process.stdout.write('\x1b[?1049l');
  process.exit(0);
});

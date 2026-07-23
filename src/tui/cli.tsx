#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import App from './App.js';

process.stdout.write('\x1b[?1049h');

const instance = render(React.createElement(App), {
  exitOnCtrlC: true,
});

instance.waitUntilExit().then(() => {
  process.stdout.write('\x1b[?1049l');
  process.exit(0);
});

#!/usr/bin/env node

// Node.js version check
const [major] = process.versions.node.split('.').map(Number);
if (major < 18) {
  console.error(`\x1b[31mOpenCERN requires Node.js >= 18. You have ${process.versions.node}.\x1b[0m`);
  console.error('Please upgrade: https://nodejs.org');
  process.exit(1);
}

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse initial flags before handing off to React/Ink
const args = process.argv.slice(2);
const showVersion = args.includes('--version') || args.includes('-v');
const showHelp = args.includes('--help') || args.includes('-h');
const debugMode = args.includes('--debug');

if (showVersion) {
  const require = createRequire(import.meta.url);
  const pkg = require('../package.json');
  console.log(`opencern v${pkg.version}`);
  process.exit(0);
}

if (showHelp) {
  console.log(`
opencern — AI-powered particle physics analysis

Usage:
  opencern [flags]

Flags:
  --version, -v    Show version number
  --help, -h       Show this help message
  --debug          Enable verbose debug output

Interactive Commands (type inside the CLI):
  /download        Download CERN Open Data datasets
  /process         Process ROOT files with C++ engine
  /ask             Ask AI about your data
  /open            Inspect ROOT or JSON files
  /opask           Open file + AI analysis split view
  /quantum         Run quantum computing classification
  /viz             Launch 3D particle visualization
  /status          Show system status
  /config          Configure API keys and settings
  /login           Sign in to OpenCERN
  /logout          Sign out
  /doctor          Diagnose and fix issues
  /update          Update CLI and Docker images
  /help            Show in-app help
  /exit            Exit the CLI
`);
  process.exit(0);
}

if (debugMode) {
  process.env.OPENCERN_DEBUG = '1';
}

// Launch the React/Ink app
try {
  const { startApp } = await import('../dist/app.js');
  await startApp();
} catch (err) {
  if (err.code === 'ERR_MODULE_NOT_FOUND' || err.code === 'MODULE_NOT_FOUND') {
    console.error('\x1b[31mError: CLI not built. Run: npm run build\x1b[0m');
    process.exit(1);
  }
  console.error('\x1b[31mFatal error:\x1b[0m', err.message);
  if (debugMode) console.error(err.stack);
  process.exit(1);
}

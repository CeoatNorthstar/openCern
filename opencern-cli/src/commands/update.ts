import { execSync } from 'child_process';
import axios from 'axios';
import { docker } from '../services/docker.js';
import { createRequire } from 'module';

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
}

export async function checkForUpdates(): Promise<UpdateInfo> {
  let currentVersion = '0.0.0';
  let latestVersion = '0.0.0';

  try {
    const require = createRequire(import.meta.url);
    currentVersion = (require('../../package.json') as { version: string }).version;
  } catch { /* ignore */ }

  try {
    const res = await axios.get('https://registry.npmjs.org/@opencern/cli/latest', { timeout: 5000 });
    latestVersion = (res.data as { version: string }).version || currentVersion;
  } catch { /* offline */ }

  return {
    currentVersion,
    latestVersion,
    hasUpdate: latestVersion !== currentVersion && latestVersion !== '0.0.0',
  };
}

export async function updateDockerImages(onProgress: (image: string) => void): Promise<void> {
  if (!docker.isDockerRunning()) {
    throw new Error('Docker is not running. Start Docker first.');
  }

  const images = [
    'opencernhq/api:latest',
    'opencernhq/xrootd:latest',
    'opencernhq/streamer:latest',
  ];

  for (const image of images) {
    onProgress(image);
    execSync(`docker pull ${image}`, { stdio: 'inherit' });
  }
}

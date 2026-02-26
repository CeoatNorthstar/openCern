import { execSync } from 'child_process';
import axios from 'axios';
import { docker } from '../services/docker.js';
import { createRequire } from 'module';
export async function checkForUpdates() {
    let currentVersion = '0.0.0';
    let latestVersion = '0.0.0';
    try {
        const require = createRequire(import.meta.url);
        currentVersion = require('../../package.json').version;
    }
    catch { /* ignore */ }
    try {
        const res = await axios.get('https://registry.npmjs.org/@opencern/cli/latest', { timeout: 5000 });
        latestVersion = res.data.version || currentVersion;
    }
    catch { /* offline */ }
    return {
        currentVersion,
        latestVersion,
        hasUpdate: latestVersion !== currentVersion && latestVersion !== '0.0.0',
    };
}
export async function updateDockerImages(onProgress) {
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
//# sourceMappingURL=update.js.map
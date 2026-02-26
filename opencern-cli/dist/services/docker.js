import { execSync } from 'child_process';
import { existsSync, writeFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import axios from 'axios';
import { config } from '../utils/config.js';
const COMPOSE_FILE = join(homedir(), '.opencern', 'docker-compose.yml');
const DOCKER_COMPOSE_TEMPLATE = `version: '3.8'
services:
  api:
    image: opencernhq/api:latest
    container_name: opencern-api
    ports:
      - "8080:8080"
    volumes:
      - ~/opencern-datasets:/data
    restart: unless-stopped

  xrootd:
    image: opencernhq/xrootd:latest
    container_name: opencern-xrootd
    ports:
      - "8081:8081"
    restart: unless-stopped

  streamer:
    image: opencernhq/streamer:latest
    container_name: opencern-streamer
    ports:
      - "9001:9001"
      - "9002:9002"
    restart: unless-stopped
`;
const QUANTUM_SERVICE = `
  quantum:
    image: opencernhq/quantum:latest
    container_name: opencern-quantum
    ports:
      - "8082:8082"
    restart: unless-stopped
`;
function ensureComposeFile(includeQuantum = false) {
    const content = DOCKER_COMPOSE_TEMPLATE + (includeQuantum ? QUANTUM_SERVICE : '');
    writeFileSync(COMPOSE_FILE, content);
}
function dockerCmd(args) {
    try {
        return execSync(['docker', ...args].join(' '), { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] });
    }
    catch {
        return '';
    }
}
function composeCmd(args) {
    if (!existsSync(COMPOSE_FILE))
        ensureComposeFile();
    return dockerCmd(['compose', '-f', COMPOSE_FILE, ...args]);
}
export const docker = {
    isDockerRunning() {
        try {
            execSync('docker info 2>/dev/null', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    },
    async pullImages(includeQuantum = false) {
        const images = [
            'opencernhq/api:latest',
            'opencernhq/xrootd:latest',
            'opencernhq/streamer:latest',
            ...(includeQuantum ? ['opencernhq/quantum:latest'] : []),
        ];
        for (const image of images) {
            execSync(`docker pull ${image}`, { stdio: 'inherit' });
        }
    },
    async startContainers(includeQuantum = false) {
        ensureComposeFile(includeQuantum);
        execSync(`docker compose -f ${COMPOSE_FILE} up -d`, { stdio: 'inherit' });
    },
    async stopContainers() {
        if (!existsSync(COMPOSE_FILE))
            return;
        execSync(`docker compose -f ${COMPOSE_FILE} stop`, { stdio: 'inherit' });
    },
    getStatus() {
        const containers = ['opencern-api', 'opencern-xrootd', 'opencern-streamer', 'opencern-quantum'];
        const result = {};
        for (const name of containers) {
            try {
                const out = dockerCmd(['inspect', '--format', '{{.State.Status}}', name]);
                const status = out.trim();
                result[name] = { running: status === 'running', status: status || 'not found' };
            }
            catch {
                result[name] = { running: false, status: 'not found' };
            }
        }
        return result;
    },
    async isApiReady() {
        try {
            const baseURL = config.get('apiBaseUrl');
            const res = await axios.get(`${baseURL}/health`, { timeout: 3000 });
            return res.status === 200;
        }
        catch {
            return false;
        }
    },
    async isQuantumReady() {
        try {
            const res = await axios.get('http://localhost:8082/health', { timeout: 3000 });
            return res.status === 200;
        }
        catch {
            return false;
        }
    },
    getLogs(service) {
        return composeCmd(['logs', '--tail=50', service]);
    },
    getComposeFile() {
        return COMPOSE_FILE;
    },
    ensureComposeFile,
};
export default docker;
//# sourceMappingURL=docker.js.map
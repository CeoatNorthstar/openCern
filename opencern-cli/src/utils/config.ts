import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

export interface OpenCERNConfig {
  dataDir: string;
  defaultModel: string;
  quantumBackend: 'local' | 'ibm' | 'braket';
  theme: 'dark' | 'light';
  autoStartDocker: boolean;
  maxEvents: number;
  apiBaseUrl: string;
  quantumShots: number;
  debug: boolean;
}

const DEFAULTS: OpenCERNConfig = {
  dataDir: join(homedir(), 'opencern-datasets'),
  defaultModel: 'claude-sonnet-4-6',
  quantumBackend: 'local',
  theme: 'dark',
  autoStartDocker: true,
  maxEvents: 5000,
  apiBaseUrl: 'http://localhost:8080',
  quantumShots: 1000,
  debug: false,
};

function getConfigDir(): string {
  return join(homedir(), '.opencern');
}

function getConfigPath(): string {
  return join(getConfigDir(), 'config.json');
}

function ensureConfigDir(): void {
  const dir = getConfigDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

let _config: OpenCERNConfig | null = null;

function load(): OpenCERNConfig {
  ensureConfigDir();
  const path = getConfigPath();
  if (!existsSync(path)) {
    _config = { ...DEFAULTS };
    save(_config);
    return _config;
  }
  try {
    const raw = readFileSync(path, 'utf-8');
    const parsed: OpenCERNConfig = { ...DEFAULTS, ...JSON.parse(raw) as Partial<OpenCERNConfig> };
    _config = parsed;
    return parsed;
  } catch {
    const fallback: OpenCERNConfig = { ...DEFAULTS };
    _config = fallback;
    return fallback;
  }
}

function save(cfg: OpenCERNConfig): void {
  ensureConfigDir();
  writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
  _config = cfg;
}

function get<K extends keyof OpenCERNConfig>(key: K): OpenCERNConfig[K] {
  const cfg = _config ?? load();
  return cfg[key];
}

function set<K extends keyof OpenCERNConfig>(key: K, value: OpenCERNConfig[K]): void {
  const cfg = _config ?? load();
  cfg[key] = value;
  save(cfg);
}

function reset(): void {
  _config = { ...DEFAULTS };
  save(_config);
}

function isFirstRun(): boolean {
  return !existsSync(getConfigPath());
}

export const config = { load, save, get, set, reset, getConfigPath, getConfigDir, isFirstRun };
export default config;

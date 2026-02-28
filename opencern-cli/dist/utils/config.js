import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
const DEFAULTS = {
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
function getConfigDir() {
    return join(homedir(), '.opencern');
}
function getConfigPath() {
    return join(getConfigDir(), 'config.json');
}
function ensureConfigDir() {
    const dir = getConfigDir();
    if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
    }
}
let _config = null;
function load() {
    ensureConfigDir();
    const path = getConfigPath();
    if (!existsSync(path)) {
        _config = { ...DEFAULTS };
        save(_config);
        return _config;
    }
    try {
        const raw = readFileSync(path, 'utf-8');
        const parsed = { ...DEFAULTS, ...JSON.parse(raw) };
        _config = parsed;
        return parsed;
    }
    catch {
        const fallback = { ...DEFAULTS };
        _config = fallback;
        return fallback;
    }
}
function save(cfg) {
    ensureConfigDir();
    writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
    _config = cfg;
}
function get(key) {
    const cfg = _config ?? load();
    return cfg[key];
}
function set(key, value) {
    const cfg = _config ?? load();
    cfg[key] = value;
    save(cfg);
}
function reset() {
    _config = { ...DEFAULTS };
    save(_config);
}
function isFirstRun() {
    return !existsSync(getConfigPath());
}
export const config = { load, save, get, set, reset, getConfigPath, getConfigDir, isFirstRun };
export default config;
//# sourceMappingURL=config.js.map
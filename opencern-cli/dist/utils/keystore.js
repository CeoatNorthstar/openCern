import { execSync, spawnSync } from 'child_process';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir, platform } from 'os';
const KEYSTORE_FILE = join(homedir(), '.opencern', 'keystore.enc');
const PASSPHRASE = 'opencern-local-keystore-v1';
function deriveKey() {
    return scryptSync(PASSPHRASE, 'opencern-salt-v1', 32);
}
function encryptFile(data) {
    const key = deriveKey();
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-cbc', key, iv);
    const json = JSON.stringify(data);
    const encrypted = Buffer.concat([cipher.update(json, 'utf-8'), cipher.final()]);
    writeFileSync(KEYSTORE_FILE, JSON.stringify({ iv: iv.toString('hex'), data: encrypted.toString('hex') }));
}
function decryptFile() {
    if (!existsSync(KEYSTORE_FILE))
        return {};
    try {
        const raw = JSON.parse(readFileSync(KEYSTORE_FILE, 'utf-8'));
        const key = deriveKey();
        const iv = Buffer.from(raw.iv, 'hex');
        const decipher = createDecipheriv('aes-256-cbc', key, iv);
        const decrypted = Buffer.concat([decipher.update(Buffer.from(raw.data, 'hex')), decipher.final()]);
        return JSON.parse(decrypted.toString('utf-8'));
    }
    catch {
        return {};
    }
}
function isMacOS() {
    return platform() === 'darwin';
}
function isLinux() {
    return platform() === 'linux';
}
function hasSecretTool() {
    const result = spawnSync('which', ['secret-tool'], { stdio: 'ignore' });
    return result.status === 0;
}
function macSetKey(service, key) {
    const label = `opencern-${service}`;
    try {
        execSync(`security delete-generic-password -s "${label}" 2>/dev/null`, { stdio: 'ignore' });
    }
    catch { /* ignore */ }
    execSync(`security add-generic-password -s "${label}" -a "opencern" -w ${JSON.stringify(key)}`);
}
function macGetKey(service) {
    try {
        const label = `opencern-${service}`;
        const result = execSync(`security find-generic-password -s "${label}" -w 2>/dev/null`).toString().trim();
        return result || null;
    }
    catch {
        return null;
    }
}
function macDeleteKey(service) {
    try {
        execSync(`security delete-generic-password -s "opencern-${service}" 2>/dev/null`, { stdio: 'ignore' });
    }
    catch { /* ignore */ }
}
function linuxSetKey(service, key) {
    const proc = spawnSync('secret-tool', ['store', '--label', `opencern-${service}`, 'service', 'opencern', 'account', service], {
        input: key,
        encoding: 'utf-8',
    });
    if (proc.status !== 0)
        throw new Error('secret-tool store failed');
}
function linuxGetKey(service) {
    try {
        const result = execSync(`secret-tool lookup service opencern account "${service}" 2>/dev/null`).toString().trim();
        return result || null;
    }
    catch {
        return null;
    }
}
function linuxDeleteKey(service) {
    try {
        execSync(`secret-tool clear service opencern account "${service}" 2>/dev/null`, { stdio: 'ignore' });
    }
    catch { /* ignore */ }
}
export function setKey(service, key) {
    if (isMacOS()) {
        try {
            macSetKey(service, key);
            return;
        }
        catch { /* fallthrough */ }
    }
    if (isLinux() && hasSecretTool()) {
        try {
            linuxSetKey(service, key);
            return;
        }
        catch { /* fallthrough */ }
    }
    fileSetKey(service, key);
}
export function getKey(service) {
    if (isMacOS()) {
        const val = macGetKey(service);
        if (val !== null)
            return val;
    }
    if (isLinux() && hasSecretTool()) {
        const val = linuxGetKey(service);
        if (val !== null)
            return val;
    }
    return fileGetKey(service);
}
export function deleteKey(service) {
    if (isMacOS())
        macDeleteKey(service);
    if (isLinux() && hasSecretTool())
        linuxDeleteKey(service);
    fileDeleteKey(service);
}
export function hasKey(service) {
    return getKey(service) !== null;
}
export function maskKey(key) {
    if (!key || key.length < 8)
        return '****';
    return `${key.slice(0, 6)}...${key.slice(-4)}`;
}
function fileSetKey(service, key) {
    const store = decryptFile();
    store[service] = key;
    encryptFile(store);
}
function fileGetKey(service) {
    const store = decryptFile();
    return store[service] || null;
}
function fileDeleteKey(service) {
    const store = decryptFile();
    delete store[service];
    encryptFile(store);
}
export const keystore = { setKey, getKey, deleteKey, hasKey, maskKey };
export default keystore;
//# sourceMappingURL=keystore.js.map
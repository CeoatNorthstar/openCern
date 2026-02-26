import { execSync } from 'child_process';
import { docker } from '../services/docker.js';
import { isAuthenticated } from '../utils/auth.js';
import { existsSync, statfsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
export async function runDoctorChecks() {
    const checks = [];
    // Node.js version
    const [major] = process.versions.node.split('.').map(Number);
    checks.push({
        name: 'Node.js version',
        status: major >= 18 ? 'ok' : 'error',
        message: `Node.js ${process.versions.node}`,
        fix: major < 18 ? 'Install Node.js 18+: https://nodejs.org' : undefined,
    });
    // Docker installed
    let dockerInstalled = false;
    try {
        execSync('docker --version', { stdio: 'ignore' });
        dockerInstalled = true;
    }
    catch { /* not installed */ }
    checks.push({
        name: 'Docker installed',
        status: dockerInstalled ? 'ok' : 'error',
        message: dockerInstalled ? 'Docker found' : 'Docker not installed',
        fix: !dockerInstalled ? 'Install Docker Desktop: https://docker.com/get-started' : undefined,
    });
    // Docker running
    const dockerRunning = dockerInstalled && docker.isDockerRunning();
    checks.push({
        name: 'Docker daemon',
        status: dockerRunning ? 'ok' : dockerInstalled ? 'warning' : 'error',
        message: dockerRunning ? 'Docker daemon running' : 'Docker daemon not running',
        fix: !dockerRunning && dockerInstalled
            ? 'Start Docker Desktop, or run: sudo systemctl start docker'
            : undefined,
    });
    // API reachable
    const apiReady = dockerRunning ? await docker.isApiReady() : false;
    checks.push({
        name: 'OpenCERN API',
        status: apiReady ? 'ok' : dockerRunning ? 'warning' : 'error',
        message: apiReady ? 'API reachable at :8080' : 'API not reachable',
        fix: !apiReady ? 'Start containers: run /status or let opencern auto-start them' : undefined,
    });
    // Authentication
    const authenticated = isAuthenticated();
    checks.push({
        name: 'Authentication',
        status: authenticated ? 'ok' : 'warning',
        message: authenticated ? 'Signed in' : 'Not signed in',
        fix: !authenticated ? 'Run: /login' : undefined,
    });
    // Disk space
    try {
        const dir = join(homedir(), 'opencern-datasets');
        const checkDir = existsSync(dir) ? dir : homedir();
        const stats = statfsSync(checkDir);
        const freeGB = (stats.bfree * stats.bsize) / 1e9;
        checks.push({
            name: 'Disk space',
            status: freeGB > 5 ? 'ok' : freeGB > 1 ? 'warning' : 'error',
            message: `${freeGB.toFixed(1)} GB free`,
            fix: freeGB < 1 ? 'Free up disk space — ROOT files can be several GB each' : undefined,
        });
    }
    catch { /* ignore */ }
    return checks;
}
export function formatDoctorResults(checks) {
    const lines = ['', '  OpenCERN Doctor', '  ─────────────────────────────────────'];
    let hasIssues = false;
    for (const check of checks) {
        const icon = check.status === 'ok' ? '✓' : check.status === 'warning' ? '⚠' : '✗';
        lines.push(`  ${icon} ${check.name.padEnd(22)} ${check.message}`);
        if (check.fix) {
            lines.push(`      → ${check.fix}`);
            hasIssues = true;
        }
    }
    if (!hasIssues) {
        lines.push('', '  All checks passed!');
    }
    lines.push('');
    return lines;
}
//# sourceMappingURL=doctor.js.map
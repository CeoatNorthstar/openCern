// SPDX-License-Identifier: MIT
// Copyright (c) 2026 OpenCERN Contributors
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { platform } from 'os';
export function checkDesktopApp() {
    if (platform() === 'darwin') {
        return existsSync('/Applications/OpenCERN.app');
    }
    if (platform() === 'linux') {
        try {
            execSync('which opencern-desktop', { stdio: 'ignore' });
            return true;
        }
        catch {
            return false;
        }
    }
    return false;
}
function openURL(url) {
    const p = platform();
    if (p === 'darwin')
        execSync(`open "${url}"`, { stdio: 'ignore' });
    else if (p === 'win32')
        execSync(`start "" "${url}"`, { stdio: 'ignore' });
    else
        execSync(`xdg-open "${url}"`, { stdio: 'ignore' });
}
export function openViz(filePath, forceBrowser = false) {
    const absPath = filePath.startsWith('/') ? filePath : `${process.cwd()}/${filePath}`;
    if (!forceBrowser && checkDesktopApp()) {
        try {
            openURL(`opencern://viz?file=${encodeURIComponent(absPath)}`);
            return { method: 'desktop', message: 'Opening in OpenCERN desktop app...' };
        }
        catch { /* fallthrough */ }
    }
    try {
        openURL(`http://localhost:3000/viz?file=${encodeURIComponent(absPath)}`);
        return { method: 'browser', message: 'Opening in browser at http://localhost:3000/viz' };
    }
    catch { /* fallthrough */ }
    return { method: 'ascii', message: 'Showing ASCII visualization (install desktop app for 3D view)' };
}
export function renderASCII(filePath) {
    const lines = [
        '',
        '  Particle Track Projection (2D)',
        '  ─────────────────────────────',
    ];
    try {
        const data = JSON.parse(readFileSync(filePath, 'utf-8'));
        const events = (data.events || data.particles || []).slice(0, 10);
        for (const e of events) {
            const type = String(e.type || e.particle_type || 'particle');
            const pt = Number(e.pt || 0).toFixed(1);
            const eta = Number(e.eta || 0).toFixed(2);
            const phi = Number(e.phi || 0);
            // Map phi [-π, π] to track position [0, 16]
            const pos = Math.round(((phi + Math.PI) / (2 * Math.PI)) * 14);
            const track = ' '.repeat(pos) + '●' + ' '.repeat(14 - pos);
            lines.push(`  [${track}]  ${type.padEnd(10)} pT=${pt} GeV  η=${eta}`);
        }
        if (events.length === 0)
            lines.push('  No events to display');
    }
    catch {
        lines.push('  Could not parse event data');
    }
    lines.push('');
    lines.push('  Install the OpenCERN desktop app for interactive 3D:');
    lines.push('  https://opencern.io/download');
    lines.push('');
    return lines;
}
//# sourceMappingURL=viz.js.map
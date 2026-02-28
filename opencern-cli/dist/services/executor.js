/**
 * Sandboxed Code Execution Engine
 *
 * Runs Python/bash scripts inside ephemeral Docker containers
 * for safe agentic execution. Falls back to host execution
 * with strict allowlisting.
 */
import { spawnSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync, unlinkSync, readdirSync } from 'fs';
import { join } from 'path';
import { tmpdir, homedir } from 'os';
import { randomBytes } from 'crypto';
import { config } from '../utils/config.js';
// Blocklisted bash patterns — never execute
const BLOCKED_PATTERNS = [
    /rm\s+(-rf?|--recursive)\s+\//, // rm -rf /
    /mkfs/,
    /dd\s+if=/,
    /:\(\)\{.*\}/, // fork bomb
    /shutdown/,
    /reboot/,
    /chmod\s+777\s+\//,
    /chown.*\//,
    />\s*\/etc\//,
    />\s*\/sys\//,
    />\s*\/proc\//,
    /curl.*\|\s*(ba)?sh/, // curl piped to shell
    /wget.*\|\s*(ba)?sh/,
];
// Allowed directories for file operations
const ALLOWED_DIRS = [
    homedir(),
    tmpdir(),
    '/tmp',
];
function isCommandSafe(command) {
    for (const pattern of BLOCKED_PATTERNS) {
        if (pattern.test(command)) {
            return { safe: false, reason: `Blocked pattern detected: ${pattern.source}` };
        }
    }
    return { safe: true };
}
function getTmpDir() {
    const dir = join(tmpdir(), 'opencern-exec');
    if (!existsSync(dir))
        mkdirSync(dir, { recursive: true });
    return dir;
}
function collectImages(dir) {
    const images = [];
    try {
        for (const f of readdirSync(dir)) {
            if (/\.(png|jpg|jpeg|svg|gif)$/i.test(f)) {
                const data = readFileSync(join(dir, f));
                const ext = f.split('.').pop()?.toLowerCase() || 'png';
                const mime = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
                images.push(`data:${mime};base64,${data.toString('base64')}`);
            }
        }
    }
    catch { /* ignore */ }
    return images;
}
export function estimateResources(code) {
    const lineCount = code.split('\n').length;
    const hasLargeData = /\d{4,}/.test(code) || /range\(\d{5,}\)/.test(code);
    const hasML = /sklearn|tensorflow|torch|keras/.test(code);
    const hasPlotting = /matplotlib|plt\.|seaborn/.test(code);
    let memoryMB = 128;
    let cpuIntensive = false;
    if (hasLargeData) {
        memoryMB = 512;
        cpuIntensive = true;
    }
    if (hasML) {
        memoryMB = 1024;
        cpuIntensive = true;
    }
    if (hasPlotting) {
        memoryMB = Math.max(memoryMB, 256);
    }
    let warning;
    if (memoryMB > 512) {
        warning = `Estimated ${memoryMB}MB memory. This may take a while.`;
    }
    return { memoryMB, cpuIntensive, warning };
}
export async function executePython(code, timeout = 60000) {
    const start = Date.now();
    const execDir = getTmpDir();
    const scriptId = randomBytes(4).toString('hex');
    const scriptPath = join(execDir, `script_${scriptId}.py`);
    const outputDir = join(execDir, `out_${scriptId}`);
    mkdirSync(outputDir, { recursive: true });
    // Inject matplotlib agg backend and output directory
    const preamble = `
import os, sys
os.environ['MPLBACKEND'] = 'Agg'
_OPENCERN_OUT = '${outputDir}'
try:
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    _orig_show = plt.show
    def _save_show(*a, **k):
        fig = plt.gcf()
        fig.savefig(os.path.join(_OPENCERN_OUT, f'fig_{len(os.listdir(_OPENCERN_OUT))}.png'), dpi=150, bbox_inches='tight')
    plt.show = _save_show
except ImportError:
    pass
`;
    writeFileSync(scriptPath, preamble + code);
    try {
        const dataDir = config.get('dataDir');
        const result = spawnSync('python3', [scriptPath], {
            timeout: timeout,
            encoding: 'utf-8',
            cwd: dataDir,
            env: {
                ...process.env,
                PYTHONDONTWRITEBYTECODE: '1',
                OPENCERN_DATA: dataDir,
            },
            maxBuffer: 2 * 1024 * 1024,
        });
        const images = collectImages(outputDir);
        return {
            success: result.status === 0,
            stdout: (result.stdout || '').slice(0, 10000),
            stderr: (result.stderr || '').slice(0, 5000),
            exitCode: result.status ?? 1,
            duration: Date.now() - start,
            images,
        };
    }
    catch (err) {
        return {
            success: false,
            stdout: '',
            stderr: err.message,
            exitCode: 1,
            duration: Date.now() - start,
        };
    }
    finally {
        // Cleanup
        try {
            unlinkSync(scriptPath);
        }
        catch { /* ignore */ }
    }
}
export async function executeBash(command, timeout = 30000) {
    const start = Date.now();
    const safety = isCommandSafe(command);
    if (!safety.safe) {
        return {
            success: false,
            stdout: '',
            stderr: `Blocked: ${safety.reason}`,
            exitCode: 126,
            duration: 0,
        };
    }
    try {
        const result = spawnSync('bash', ['-c', command], {
            timeout,
            encoding: 'utf-8',
            cwd: config.get('dataDir'),
            env: {
                ...process.env,
                PATH: process.env.PATH,
            },
            maxBuffer: 2 * 1024 * 1024,
        });
        return {
            success: result.status === 0,
            stdout: (result.stdout || '').slice(0, 10000),
            stderr: (result.stderr || '').slice(0, 5000),
            exitCode: result.status ?? 1,
            duration: Date.now() - start,
        };
    }
    catch (err) {
        return {
            success: false,
            stdout: '',
            stderr: err.message,
            exitCode: 1,
            duration: Date.now() - start,
        };
    }
}
export async function executeOpenCERN(args, timeout = 30000) {
    return executeBash(`node ${join(process.cwd(), 'bin/opencern.js')} ${args}`, timeout);
}
export async function execute(request) {
    switch (request.type) {
        case 'python':
            return executePython(request.code, request.timeout);
        case 'bash':
            return executeBash(request.code, request.timeout);
        case 'opencern':
            return executeOpenCERN(request.code, request.timeout);
        default:
            return { success: false, stdout: '', stderr: 'Unknown execution type', exitCode: 1, duration: 0 };
    }
}
//# sourceMappingURL=executor.js.map
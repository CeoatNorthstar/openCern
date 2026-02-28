import { readFileSync, existsSync } from 'fs';
import { quantumService } from '../services/quantum.js';
import { config } from '../utils/config.js';
import { docker } from '../services/docker.js';
export async function ensureQuantumRunning() {
    const status = await quantumService.getStatus();
    if (status.healthy)
        return true;
    if (!docker.isDockerRunning())
        return false;
    try {
        await docker.startContainers(true);
        // Wait up to 30s for quantum container to become healthy
        for (let i = 0; i < 30; i++) {
            await new Promise(r => setTimeout(r, 1000));
            const s = await quantumService.getStatus();
            if (s.healthy)
                return true;
        }
        return false;
    }
    catch {
        return false;
    }
}
export function extractEvents(filePath) {
    if (!existsSync(filePath))
        throw new Error(`File not found: ${filePath}`);
    const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
    const eventList = raw.events || raw.particles || (Array.isArray(raw) ? raw : []);
    if (!Array.isArray(eventList))
        throw new Error('No event array found in file');
    const maxEvents = config.get('maxEvents');
    const events = [];
    for (const e of eventList.slice(0, maxEvents)) {
        const ev = e;
        events.push({
            pt: Number(ev.pt ?? ev.pT ?? ev.transverse_momentum ?? 0),
            eta: Number(ev.eta ?? ev.pseudorapidity ?? 0),
            phi: Number(ev.phi ?? ev.azimuthal_angle ?? 0),
            energy: Number(ev.energy ?? ev.E ?? 0),
            particleType: String(ev.type ?? ev.particle_type ?? ev.pdgId ?? ''),
        });
    }
    return events;
}
export async function runClassification(events, onStatus) {
    const backend = config.get('quantumBackend');
    const shots = config.get('quantumShots');
    const { jobId } = await quantumService.classify({ events, backend, shots });
    while (true) {
        const job = await quantumService.getResults(jobId);
        onStatus(job);
        if (job.status === 'complete' || job.status === 'error') {
            return job;
        }
        await new Promise(r => setTimeout(r, 2000));
    }
}
//# sourceMappingURL=quantum.js.map
import type { QuantumEvent, QuantumJob } from '../services/quantum.js';
export declare function ensureQuantumRunning(): Promise<boolean>;
export declare function extractEvents(filePath: string): QuantumEvent[];
export declare function runClassification(events: QuantumEvent[], onStatus: (job: QuantumJob) => void): Promise<QuantumJob>;
//# sourceMappingURL=quantum.d.ts.map
/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
export interface QuantumEvent {
    pt: number;
    eta: number;
    phi: number;
    energy: number;
    particleType?: string;
}
export interface ClassifyRequest {
    events: QuantumEvent[];
    backend?: 'local' | 'ibm' | 'braket';
    shots?: number;
}
export interface QuantumJob {
    id: string;
    status: 'pending' | 'running' | 'complete' | 'error';
    backend: string;
    queuePosition?: number;
    estimatedWait?: number;
    results?: QuantumResults;
    error?: string;
}
export interface QuantumResults {
    signalCount: number;
    backgroundCount: number;
    totalEvents: number;
    signalProbability: number;
    fidelity: number;
    shotsCompleted: number;
    circuitDiagram: string;
    histogram: Record<string, number>;
}
export interface BackendInfo {
    name: string;
    type: 'local' | 'ibm' | 'braket';
    qubits: number;
    available: boolean;
    queueDepth?: number;
}
export declare const quantumService: {
    getStatus(): Promise<{
        healthy: boolean;
        backend: string;
    }>;
    classify(request: ClassifyRequest): Promise<{
        jobId: string;
    }>;
    getResults(jobId: string): Promise<QuantumJob>;
    setBackend(backend: string, apiKey?: string): Promise<void>;
    listBackends(): Promise<BackendInfo[]>;
    getCircuitDiagram(numQubits: number, layers: number): Promise<string>;
};
export default quantumService;
//# sourceMappingURL=quantum.d.ts.map
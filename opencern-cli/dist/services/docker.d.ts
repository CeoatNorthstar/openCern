declare function ensureComposeFile(includeQuantum?: boolean): void;
export declare const docker: {
    isDockerRunning(): boolean;
    pullImages(includeQuantum?: boolean): Promise<void>;
    startContainers(includeQuantum?: boolean): Promise<void>;
    stopContainers(): Promise<void>;
    getStatus(): Record<string, {
        running: boolean;
        status: string;
    }>;
    isApiReady(): Promise<boolean>;
    isQuantumReady(): Promise<boolean>;
    getLogs(service: string): string;
    getComposeFile(): string;
    ensureComposeFile: typeof ensureComposeFile;
};
export default docker;
//# sourceMappingURL=docker.d.ts.map
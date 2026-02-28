export interface SystemStatus {
    docker: {
        running: boolean;
    };
    containers: Record<string, {
        running: boolean;
        status: string;
    }>;
    api: {
        healthy: boolean;
        responseTime?: number;
        version?: string;
    };
    quantum: {
        healthy: boolean;
    };
    auth: {
        authenticated: boolean;
    };
    disk: {
        datasetDir: string;
        size: number;
        fileCount: number;
    };
}
export declare function getSystemStatus(): Promise<SystemStatus>;
export declare function formatStatus(status: SystemStatus): string[];
//# sourceMappingURL=status.d.ts.map
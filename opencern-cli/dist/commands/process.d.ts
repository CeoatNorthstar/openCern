import type { ProcessStatus, LocalFile } from '../services/cern-api.js';
export type { ProcessStatus };
export declare function listRootFiles(): Promise<LocalFile[]>;
export declare function processFile(filePath: string): Promise<string>;
export declare function processFolder(folderPath: string): Promise<string>;
export declare function pollProcess(id: string, onProgress: (status: ProcessStatus) => void): Promise<ProcessStatus>;
export declare function formatEventSummary(results?: ProcessStatus['results']): string[];
//# sourceMappingURL=process.d.ts.map
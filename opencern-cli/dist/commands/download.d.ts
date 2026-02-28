import type { Dataset, DownloadStatus } from '../services/cern-api.js';
export type { Dataset, DownloadStatus };
export declare function searchDatasets(query: string, experiment?: string, year?: number): Promise<Dataset[]>;
export declare function startDownload(dataset: Dataset, fileNames?: string[]): Promise<string>;
export declare function pollDownload(id: string, onProgress: (status: DownloadStatus) => void): Promise<DownloadStatus>;
export declare function cancelDownload(id: string): Promise<void>;
export declare function formatDatasetSize(bytes: number): string;
//# sourceMappingURL=download.d.ts.map
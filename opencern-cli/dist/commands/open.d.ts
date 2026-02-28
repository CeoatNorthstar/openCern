import type { LocalFile } from '../services/cern-api.js';
export interface FileContent {
    content: string;
    filename: string;
    size: number;
    fileType: 'json' | 'text' | 'root-meta';
}
export declare function openFile(filePath: string): Promise<FileContent>;
export declare function listLocalFiles(): Promise<LocalFile[]>;
//# sourceMappingURL=open.d.ts.map
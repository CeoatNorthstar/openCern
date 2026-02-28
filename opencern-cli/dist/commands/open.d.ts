/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
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
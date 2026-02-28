/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import { readFileSync, existsSync, statSync } from 'fs';
import { cernApi } from '../services/cern-api.js';
export async function openFile(filePath) {
    if (!existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const stat = statSync(filePath);
    const filename = filePath.split('/').pop() || filePath;
    if (filePath.endsWith('.root')) {
        const meta = await cernApi.getRootMetadata(filePath);
        return {
            content: JSON.stringify(meta, null, 2),
            filename,
            size: stat.size,
            fileType: 'root-meta',
        };
    }
    if (filePath.endsWith('.json')) {
        const raw = readFileSync(filePath, 'utf-8');
        try {
            const parsed = JSON.parse(raw);
            return {
                content: JSON.stringify(parsed, null, 2),
                filename,
                size: stat.size,
                fileType: 'json',
            };
        }
        catch {
            return { content: raw, filename, size: stat.size, fileType: 'text' };
        }
    }
    return {
        content: readFileSync(filePath, 'utf-8'),
        filename,
        size: stat.size,
        fileType: 'text',
    };
}
export async function listLocalFiles() {
    return cernApi.listFiles();
}
//# sourceMappingURL=open.js.map
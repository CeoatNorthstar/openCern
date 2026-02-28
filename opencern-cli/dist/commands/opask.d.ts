/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import type { FileContent } from './open.js';
export declare function openAndAsk(filePath: string, onToken: (token: string) => void, signal?: AbortSignal): Promise<{
    file: FileContent;
    totalTokens: number;
}>;
//# sourceMappingURL=opask.d.ts.map
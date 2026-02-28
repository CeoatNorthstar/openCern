/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import type { SessionContext } from '../services/anthropic.js';
export interface AskOptions {
    file?: string;
    explain?: boolean;
}
export declare function askQuestion(question: string, options: AskOptions, context: SessionContext, onToken: (token: string) => void, signal?: AbortSignal): Promise<{
    totalTokens: number;
}>;
export declare function clearConversation(): void;
//# sourceMappingURL=ask.d.ts.map
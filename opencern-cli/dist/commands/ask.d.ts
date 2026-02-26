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
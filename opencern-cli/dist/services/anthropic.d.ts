export interface SessionContext {
    downloadedDatasets?: string[];
    processedFiles?: string[];
    lastResults?: Record<string, unknown>;
    experiment?: string;
}
interface Message {
    role: 'user' | 'assistant';
    content: string;
}
export declare const anthropicService: {
    initClient(apiKey: string): void;
    streamMessage(userMessage: string, onToken: (token: string) => void, signal?: AbortSignal): Promise<{
        totalTokens: number;
    }>;
    addContext(ctx: Partial<SessionContext>): void;
    getContext(): SessionContext;
    getUsage(): number;
    clearHistory(): void;
    getHistory(): Message[];
};
export default anthropicService;
//# sourceMappingURL=anthropic.d.ts.map
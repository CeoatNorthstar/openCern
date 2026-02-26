import type { FileContent } from './open.js';
export declare function openAndAsk(filePath: string, onToken: (token: string) => void, signal?: AbortSignal): Promise<{
    file: FileContent;
    totalTokens: number;
}>;
//# sourceMappingURL=opask.d.ts.map
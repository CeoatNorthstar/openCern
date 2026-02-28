/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import Anthropic from '@anthropic-ai/sdk';
export interface SessionContext {
    downloadedDatasets?: string[];
    processedFiles?: string[];
    lastResults?: Record<string, unknown>;
    experiment?: string;
}
interface Message {
    role: 'user' | 'assistant';
    content: string | Anthropic.ContentBlock[];
}
export interface ToolCall {
    id: string;
    name: string;
    input: Record<string, unknown>;
    displayCode?: string;
    resourceWarning?: string;
}
export interface ToolResult {
    toolUseId: string;
    success: boolean;
    output: string;
    images?: string[];
    duration?: number;
}
export interface AgenticEvent {
    type: 'text' | 'thinking' | 'tool_call' | 'tool_result' | 'done' | 'error';
    text?: string;
    toolCall?: ToolCall;
    toolResult?: ToolResult;
    totalTokens?: number;
    error?: string;
}
export interface ModelInfo {
    id: string;
    displayName: string;
    maxTokens: number;
    contextWindow?: number;
}
export interface UsageStats {
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    messageCount: number;
    toolCalls: number;
    sessionStart: number;
}
export declare function executeToolCall(toolCall: ToolCall): Promise<ToolResult>;
export declare const anthropicService: {
    initClient(apiKey: string): void;
    /**
     * Simple streaming (no tool use) — for basic /ask queries
     */
    streamMessage(userMessage: string, onToken: (token: string) => void, signal?: AbortSignal): Promise<{
        totalTokens: number;
    }>;
    /**
     * Agentic streaming — supports tool use with human-in-the-loop approval.
     * Emits events for the TUI to render: text, thinking, tool_call, tool_result, done.
     *
     * The caller provides an `onApproval` callback that presents the tool call to
     * the user and returns true (approved) or false (denied).
     */
    agenticStream(userMessage: string, onEvent: (event: AgenticEvent) => void, onApproval: (toolCall: ToolCall) => Promise<boolean>, signal?: AbortSignal, maxIterations?: number): Promise<void>;
    listModels(): Promise<ModelInfo[]>;
    addContext(ctx: Partial<SessionContext>): void;
    getContext(): SessionContext;
    getUsage(): UsageStats;
    getUsageFormatted(): string[];
    clearHistory(): void;
    getHistory(): Message[];
};
export default anthropicService;
//# sourceMappingURL=anthropic.d.ts.map
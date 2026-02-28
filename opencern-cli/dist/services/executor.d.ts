/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 *
 * Sandboxed Code Execution Engine
 *
 * Runs Python/bash scripts inside ephemeral Docker containers
 * for safe agentic execution. Falls back to host execution
 * with strict allowlisting.
 */
export interface ExecutionResult {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    duration: number;
    images?: string[];
    resourceWarning?: string;
}
export interface ExecutionRequest {
    type: 'python' | 'bash' | 'opencern';
    code: string;
    sandboxed?: boolean;
    timeout?: number;
}
export declare function estimateResources(code: string): {
    memoryMB: number;
    cpuIntensive: boolean;
    warning?: string;
};
export declare function executePython(code: string, timeout?: number): Promise<ExecutionResult>;
export declare function executeBash(command: string, timeout?: number): Promise<ExecutionResult>;
export declare function executeOpenCERN(args: string, timeout?: number): Promise<ExecutionResult>;
export declare function execute(request: ExecutionRequest): Promise<ExecutionResult>;
//# sourceMappingURL=executor.d.ts.map
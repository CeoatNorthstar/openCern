/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import type { QuantumEvent, QuantumJob } from '../services/quantum.js';
export declare function ensureQuantumRunning(): Promise<boolean>;
export declare function extractEvents(filePath: string): QuantumEvent[];
export declare function runClassification(events: QuantumEvent[], onStatus: (job: QuantumJob) => void): Promise<QuantumJob>;
//# sourceMappingURL=quantum.d.ts.map
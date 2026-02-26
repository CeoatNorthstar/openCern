import React from 'react';
import type { QuantumJob } from '../services/quantum.js';
interface QuantumPanelProps {
    job?: QuantumJob;
    isRunning?: boolean;
    backend?: string;
    circuitDiagram?: string;
}
export declare function QuantumPanel({ job, isRunning, backend, circuitDiagram }: QuantumPanelProps): React.JSX.Element;
export default QuantumPanel;
//# sourceMappingURL=QuantumPanel.d.ts.map
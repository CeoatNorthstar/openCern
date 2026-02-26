import React from 'react';
interface AIStreamProps {
    tokens: string;
    isStreaming: boolean;
    onCancel?: () => void;
    model?: string;
    tokenCount?: number;
    latency?: number;
}
export declare function AIStream({ tokens, isStreaming, onCancel, model, tokenCount, latency, }: AIStreamProps): React.JSX.Element;
export default AIStream;
//# sourceMappingURL=AIStream.d.ts.map
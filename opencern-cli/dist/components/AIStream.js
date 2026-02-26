import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
function renderInline(text) {
    const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
    return parts.map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**')) {
            return _jsx(Text, { bold: true, children: part.slice(2, -2) }, i);
        }
        if (part.startsWith('`') && part.endsWith('`')) {
            return _jsx(Text, { color: "cyan", children: part.slice(1, -1) }, i);
        }
        return _jsx(Text, { children: part }, i);
    });
}
function renderMarkdown(text) {
    const lines = text.split('\n');
    const nodes = [];
    let inCodeBlock = false;
    let codeLines = [];
    lines.forEach((line, i) => {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                nodes.push(_jsx(Box, { borderStyle: "single", borderColor: "gray", paddingX: 1, marginY: 0, children: codeLines.map((l, j) => _jsx(Text, { color: "green", children: l }, j)) }, `code-${i}`));
                codeLines = [];
                inCodeBlock = false;
            }
            else {
                inCodeBlock = true;
            }
            return;
        }
        if (inCodeBlock) {
            codeLines.push(line);
            return;
        }
        nodes.push(_jsx(Text, { children: renderInline(line) }, i));
    });
    if (inCodeBlock && codeLines.length) {
        nodes.push(_jsx(Box, { borderStyle: "single", borderColor: "gray", paddingX: 1, children: codeLines.map((l, j) => _jsx(Text, { color: "green", children: l }, j)) }, "code-end"));
    }
    return nodes;
}
export function AIStream({ tokens, isStreaming, onCancel, model, tokenCount, latency, }) {
    useInput((_input, key) => {
        if (key.escape && isStreaming && onCancel) {
            onCancel();
        }
    });
    const modelShort = model?.replace('claude-', '') || '';
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, children: [isStreaming && (_jsxs(Box, { marginBottom: 1, children: [_jsx(Text, { color: "blue", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { color: "gray", dimColor: true, children: "  Analyzing..." })] })), _jsxs(Box, { flexDirection: "column", children: [renderMarkdown(tokens), isStreaming && _jsx(Text, { color: "white", children: "\u258A" })] }), !isStreaming && tokens && (_jsxs(Box, { marginTop: 1, gap: 2, children: [model && _jsx(Text, { color: "gray", dimColor: true, children: modelShort }), tokenCount !== undefined && _jsxs(Text, { color: "gray", dimColor: true, children: [tokenCount, " tokens"] }), latency !== undefined && _jsxs(Text, { color: "gray", dimColor: true, children: [latency, "ms"] })] }))] }));
}
export default AIStream;
//# sourceMappingURL=AIStream.js.map
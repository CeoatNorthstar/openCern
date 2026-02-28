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
    let codeLang = '';
    lines.forEach((line, i) => {
        if (line.startsWith('```')) {
            if (inCodeBlock) {
                nodes.push(_jsxs(Box, { flexDirection: "column", marginY: 0, paddingLeft: 2, children: [codeLang && _jsx(Text, { color: "gray", dimColor: true, children: codeLang }), codeLines.map((l, j) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: "gray", dimColor: true, children: '│ ' }), _jsx(Text, { color: "green", children: l })] }, j)))] }, `code-${i}`));
                codeLines = [];
                codeLang = '';
                inCodeBlock = false;
            }
            else {
                codeLang = line.slice(3).trim();
                inCodeBlock = true;
            }
            return;
        }
        if (inCodeBlock) {
            codeLines.push(line);
            return;
        }
        // Headers
        if (line.startsWith('### ')) {
            nodes.push(_jsx(Text, { bold: true, color: "white", children: line.slice(4) }, i));
            return;
        }
        if (line.startsWith('## ')) {
            nodes.push(_jsx(Text, { bold: true, color: "cyan", children: line.slice(3) }, i));
            return;
        }
        if (line.startsWith('# ')) {
            nodes.push(_jsx(Text, { bold: true, color: "cyan", children: line.slice(2) }, i));
            return;
        }
        // List items
        if (line.match(/^\s*[-*]\s/)) {
            const indent = line.match(/^(\s*)/)?.[1] || '';
            const content = line.replace(/^\s*[-*]\s/, '');
            nodes.push(_jsxs(Text, { children: [indent, "  - ", renderInline(content)] }, i));
            return;
        }
        nodes.push(_jsx(Text, { children: renderInline(line) }, i));
    });
    if (inCodeBlock && codeLines.length) {
        nodes.push(_jsxs(Box, { flexDirection: "column", marginY: 0, paddingLeft: 2, children: [codeLang && _jsx(Text, { color: "gray", dimColor: true, children: codeLang }), codeLines.map((l, j) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { color: "gray", dimColor: true, children: '│ ' }), _jsx(Text, { color: "green", children: l })] }, j)))] }, "code-end"));
    }
    return nodes;
}
function ToolApprovalCard({ toolCall, onApprove, onDeny }) {
    useInput((_input, key) => {
        if (key.return && onApprove)
            onApprove();
        if (key.escape && onDeny)
            onDeny();
    });
    const toolLabel = toolCall.name === 'execute_python' ? 'python'
        : toolCall.name === 'execute_bash' ? 'bash'
            : 'opencern';
    return (_jsxs(Box, { flexDirection: "column", marginY: 1, paddingLeft: 2, children: [_jsxs(Text, { color: "yellow", children: ["run ", toolLabel, "?"] }), toolCall.resourceWarning && (_jsxs(Text, { color: "yellow", dimColor: true, children: ["  ", toolCall.resourceWarning] })), _jsx(Box, { flexDirection: "column", marginY: 0, paddingLeft: 2, children: (toolCall.displayCode || '').split('\n').map((line, i) => (_jsx(Text, { color: "gray", children: line }, i))) }), _jsx(Box, { gap: 2, marginTop: 0, children: _jsx(Text, { color: "gray", dimColor: true, children: "Enter to run  \u00B7  Esc to skip" }) })] }));
}
function ToolResultCard({ result }) {
    const statusColor = result.success ? 'green' : 'red';
    const statusIcon = result.success ? '[ok]' : '[err]';
    const durationStr = result.duration ? ` ${result.duration}ms` : '';
    return (_jsxs(Box, { flexDirection: "column", marginY: 0, paddingX: 1, children: [_jsxs(Box, { gap: 1, children: [_jsx(Text, { color: statusColor, children: statusIcon }), _jsxs(Text, { color: "gray", dimColor: true, children: ["execution", durationStr] })] }), result.output && (_jsxs(Box, { flexDirection: "column", paddingLeft: 2, marginY: 0, children: [result.output.split('\n').slice(0, 20).map((line, i) => (_jsx(Text, { color: "gray", children: line }, i))), result.output.split('\n').length > 20 && (_jsxs(Text, { color: "gray", dimColor: true, children: ["... (", result.output.split('\n').length - 20, " more lines)"] }))] }))] }));
}
export function AIStream({ tokens, isStreaming, onCancel, model, tokenCount, latency, pendingTool, toolResults, onApprove, onDeny, thinkingText, }) {
    useInput((_input, key) => {
        if (key.escape && isStreaming && onCancel) {
            onCancel();
        }
    });
    const modelShort = model?.replace('claude-', '').replace(/-\d{8}$/, '') || '';
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, children: [thinkingText && (_jsx(Box, { marginBottom: 0, flexDirection: "column", children: _jsxs(Text, { color: "gray", dimColor: true, children: ["[thinking] ", thinkingText] }) })), isStreaming && !pendingTool && (_jsxs(Box, { marginBottom: 0, children: [_jsx(Text, { color: "blue", children: _jsx(Spinner, { type: "dots" }) }), _jsx(Text, { color: "gray", dimColor: true, children: "  generating..." })] })), toolResults?.map((result, i) => (_jsx(ToolResultCard, { result: result }, i))), _jsxs(Box, { flexDirection: "column", children: [renderMarkdown(tokens), isStreaming && !pendingTool && _jsx(Text, { color: "white", children: "_" })] }), pendingTool && (_jsx(ToolApprovalCard, { toolCall: pendingTool, onApprove: onApprove, onDeny: onDeny })), !isStreaming && tokens && (_jsxs(Box, { marginTop: 1, gap: 2, children: [model && _jsx(Text, { color: "gray", dimColor: true, children: modelShort }), tokenCount !== undefined && _jsxs(Text, { color: "gray", dimColor: true, children: [tokenCount.toLocaleString(), " tokens"] }), latency !== undefined && _jsxs(Text, { color: "gray", dimColor: true, children: [(latency / 1000).toFixed(1), "s"] })] }))] }));
}
export default AIStream;
//# sourceMappingURL=AIStream.js.map
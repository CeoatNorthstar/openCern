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
            return _jsx(Text, { italic: true, children: part.slice(1, -1) }, i);
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
                nodes.push(_jsxs(Box, { flexDirection: "column", marginY: 0, paddingLeft: 2, children: [codeLang && _jsx(Text, { dimColor: true, children: codeLang }), codeLines.map((l, j) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { dimColor: true, children: '│ ' }), _jsx(Text, { children: l })] }, j)))] }, `code-${i}`));
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
            nodes.push(_jsx(Text, { bold: true, children: line.slice(4) }, i));
            return;
        }
        if (line.startsWith('## ')) {
            nodes.push(_jsx(Text, { bold: true, children: line.slice(3) }, i));
            return;
        }
        if (line.startsWith('# ')) {
            nodes.push(_jsx(Text, { bold: true, children: line.slice(2) }, i));
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
        nodes.push(_jsxs(Box, { flexDirection: "column", marginY: 0, paddingLeft: 2, children: [codeLang && _jsx(Text, { dimColor: true, children: codeLang }), codeLines.map((l, j) => (_jsxs(Box, { flexDirection: "row", children: [_jsx(Text, { dimColor: true, children: '│ ' }), _jsx(Text, { children: l })] }, j)))] }, "code-end"));
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
    return (_jsxs(Box, { flexDirection: "column", marginY: 1, paddingX: 1, borderStyle: "single", children: [_jsxs(Box, { flexDirection: "row", marginBottom: 1, gap: 1, children: [_jsx(Text, { color: "black", backgroundColor: "white", bold: true, children: " EXECUTING " }), _jsxs(Text, { bold: true, children: [" ", toolLabel, " "] })] }), toolCall.resourceWarning && (_jsx(Box, { marginBottom: 1, children: _jsxs(Text, { dimColor: true, children: ["\u26A0 ", toolCall.resourceWarning] }) })), _jsx(Box, { flexDirection: "column", marginY: 0, paddingLeft: 1, children: (toolCall.displayCode || '').split('\n').map((line, i) => (_jsx(Text, { dimColor: true, children: line }, i))) }), _jsx(Box, { gap: 2, marginTop: 1, borderStyle: "single", borderTop: true, children: _jsxs(Text, { dimColor: true, children: ["Press ", _jsx(Text, { bold: true, children: "Enter" }), " to run or ", _jsx(Text, { bold: true, children: "Esc" }), " to skip"] }) })] }));
}
function ToolResultCard({ result }) {
    const statusIcon = result.success ? '[ok]' : '[err]';
    const durationStr = result.duration ? ` ${result.duration}ms` : '';
    return (_jsxs(Box, { flexDirection: "column", marginY: 0, paddingX: 1, children: [_jsxs(Box, { gap: 1, children: [_jsx(Text, { bold: !result.success, backgroundColor: result.success ? undefined : "white", color: result.success ? undefined : "black", children: statusIcon }), _jsxs(Text, { dimColor: true, children: ["execution", durationStr] })] }), result.output && (_jsxs(Box, { flexDirection: "column", paddingLeft: 1, marginY: 0, children: [result.output.split('\n').slice(0, 20).map((line, i) => (_jsx(Text, { dimColor: true, children: line }, i))), result.output.split('\n').length > 20 && (_jsxs(Text, { dimColor: true, children: ["... (", result.output.split('\n').length - 20, " more lines)"] }))] }))] }));
}
export function AIStream({ tokens, isStreaming, onCancel, model, tokenCount, latency, pendingTool, toolResults, onApprove, onDeny, thinkingText, }) {
    useInput((_input, key) => {
        if (key.escape && isStreaming && onCancel) {
            onCancel();
        }
    });
    const modelShort = model?.replace('claude-', '').replace(/-\d{8}$/, '') || '';
    return (_jsxs(Box, { flexDirection: "column", paddingX: 1, children: [thinkingText && (_jsx(Box, { marginBottom: 0, flexDirection: "column", children: _jsxs(Text, { dimColor: true, children: ["[thinking] ", thinkingText] }) })), isStreaming && !pendingTool && (_jsx(Box, { marginBottom: 0, children: _jsxs(Text, { children: [_jsx(Spinner, { type: "dots" }), " generating..."] }) })), toolResults?.map((result, i) => (_jsx(ToolResultCard, { result: result }, i))), _jsxs(Box, { flexDirection: "column", children: [renderMarkdown(tokens), isStreaming && !pendingTool && _jsx(Text, { children: "_" })] }), pendingTool && (_jsx(ToolApprovalCard, { toolCall: pendingTool, onApprove: onApprove, onDeny: onDeny })), !isStreaming && tokens && (_jsxs(Box, { marginTop: 1, gap: 2, children: [model && _jsx(Text, { dimColor: true, children: modelShort }), tokenCount !== undefined && _jsxs(Text, { dimColor: true, children: [tokenCount?.toLocaleString(), " tokens"] }), latency !== undefined && _jsxs(Text, { dimColor: true, children: [(latency ? latency / 1000 : 0).toFixed(1), "s"] })] }))] }));
}
export default AIStream;
//# sourceMappingURL=AIStream.js.map
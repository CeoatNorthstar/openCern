import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
function renderRootMeta(content) {
    try {
        const meta = JSON.parse(content);
        return (_jsxs(Box, { flexDirection: "column", children: [_jsx(Text, { bold: true, color: "blue", children: " ROOT File Structure" }), Object.entries(meta).map(([key, val]) => (_jsxs(Box, { flexDirection: "column", marginLeft: 2, children: [_jsxs(Text, { color: "cyan", children: ["TTree: ", key] }), Array.isArray(val) && val.map((b) => (_jsxs(Text, { color: "gray", children: ["  \u2514\u2500 ", String(b)] }, String(b))))] }, key)))] }));
    }
    catch {
        return _jsx(Text, { children: content });
    }
}
function formatSize(bytes) {
    if (bytes > 1_000_000)
        return `${(bytes / 1_000_000).toFixed(1)} MB`;
    if (bytes > 1_000)
        return `${(bytes / 1_000).toFixed(0)} KB`;
    return `${bytes} B`;
}
export function FilePreview({ content, filename, size, fileType = 'text', onClose, focused = true, }) {
    const [scrollOffset, setScrollOffset] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const VISIBLE_LINES = 22;
    const lines = content.split('\n');
    const totalLines = lines.length;
    useInput((input, key) => {
        if (!focused)
            return;
        if (key.escape) {
            if (searching) {
                setSearching(false);
                setSearchTerm('');
                return;
            }
            if (onClose)
                onClose();
            return;
        }
        if (key.upArrow) {
            setScrollOffset(o => Math.max(0, o - 1));
            return;
        }
        if (key.downArrow) {
            setScrollOffset(o => Math.min(Math.max(0, totalLines - VISIBLE_LINES), o + 1));
            return;
        }
        if (input === '\x06') {
            setSearching(true);
            return;
        } // Ctrl+F
        if (searching) {
            if (key.backspace)
                setSearchTerm(t => t.slice(0, -1));
            else if (input && !key.ctrl)
                setSearchTerm(t => t + input);
        }
    });
    if (fileType === 'root-meta') {
        return (_jsxs(Box, { flexDirection: "column", children: [renderRootMeta(content), _jsx(Text, { color: "gray", dimColor: true, children: " Esc to close" })] }));
    }
    const visibleLines = lines.slice(scrollOffset, scrollOffset + VISIBLE_LINES);
    // Color JSON lines
    function colorLine(line) {
        if (fileType !== 'json')
            return _jsx(Text, { children: line });
        // Simple JSON coloring with string replacements rendered as Text nodes
        const keyMatch = line.match(/^(\s*)"([^"]+)":/);
        const isKey = keyMatch !== null;
        const isString = line.includes(': "') || (line.trim().startsWith('"') && !isKey);
        const isNumber = /:\s*-?\d+\.?\d*/.test(line);
        const isBool = /:\s*(true|false|null)/.test(line);
        if (isKey) {
            return (_jsxs(Text, { children: [_jsx(Text, { color: "gray", children: line.slice(0, line.indexOf('"')) }), _jsxs(Text, { color: "yellow", children: ["\"", keyMatch[2], "\""] }), _jsx(Text, { color: "white", children: line.slice(line.indexOf(':')) })] }));
        }
        if (isNumber)
            return _jsx(Text, { color: "magenta", children: line });
        if (isBool)
            return _jsx(Text, { color: "blue", children: line });
        if (isString)
            return _jsx(Text, { color: "green", children: line });
        return _jsx(Text, { color: "white", children: line });
    }
    return (_jsxs(Box, { flexDirection: "column", children: [filename && (_jsxs(Box, { paddingX: 1, marginBottom: 0, children: [_jsx(Text, { color: "cyan", bold: true, children: filename }), size !== undefined && _jsxs(Text, { color: "gray", dimColor: true, children: ["  ", formatSize(size)] }), _jsxs(Text, { color: "gray", dimColor: true, children: ["  ", totalLines, " lines"] })] })), searching && (_jsxs(Box, { marginBottom: 0, children: [_jsx(Text, { color: "yellow", children: " Search: " }), _jsx(Text, { children: searchTerm }), _jsx(Text, { color: "gray", dimColor: true, children: "\u258A" })] })), _jsx(Box, { flexDirection: "column", children: visibleLines.map((line, i) => {
                    const lineNum = scrollOffset + i + 1;
                    const highlight = searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase());
                    return (_jsxs(Box, { flexDirection: "row", children: [_jsxs(Text, { color: "gray", dimColor: true, children: [String(lineNum).padStart(4), " \u2502 "] }), highlight ? _jsx(Text, { backgroundColor: "yellow", color: "black", children: line }) : colorLine(line)] }, i));
                }) }), _jsxs(Box, { flexDirection: "row", gap: 2, marginTop: 0, paddingX: 1, children: [_jsxs(Text, { color: "gray", dimColor: true, children: ["Lines ", scrollOffset + 1, "\u2013", Math.min(scrollOffset + VISIBLE_LINES, totalLines), "/", totalLines] }), _jsx(Text, { color: "gray", dimColor: true, children: "\u2191\u2193 scroll \u00B7 Ctrl+F search \u00B7 Esc close" })] })] }));
}
export default FilePreview;
//# sourceMappingURL=FilePreview.js.map
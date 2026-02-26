import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
function truncate(str, len) {
    if (str.length <= len)
        return str.padEnd(len);
    return str.slice(0, len - 3) + '...';
}
function formatValue(val) {
    if (typeof val === 'number') {
        if (Math.abs(val) >= 1e9)
            return val.toExponential(2);
        if (Math.abs(val) >= 1e6)
            return (val / 1e6).toFixed(1) + 'M';
        if (Math.abs(val) >= 1e3)
            return val.toFixed(0);
        if (Math.abs(val) < 0.01 && val !== 0)
            return val.toExponential(2);
        return val.toFixed(2);
    }
    if (val === null || val === undefined)
        return '—';
    return String(val);
}
export function DataTable({ columns, rows, onSelect, maxRows = 20, title, focused = true, }) {
    const [selectedRow, setSelectedRow] = useState(0);
    const [scrollOffset, setScrollOffset] = useState(0);
    const visible = rows.slice(scrollOffset, scrollOffset + maxRows);
    const colWidths = columns.map(col => col.width || Math.max(col.label.length + 2, 10));
    useInput((_input, key) => {
        if (!focused)
            return;
        if (key.upArrow) {
            if (selectedRow > 0) {
                setSelectedRow(i => i - 1);
                if (selectedRow - 1 < scrollOffset)
                    setScrollOffset(o => Math.max(0, o - 1));
            }
            return;
        }
        if (key.downArrow) {
            if (selectedRow < rows.length - 1) {
                setSelectedRow(i => i + 1);
                if (selectedRow + 1 >= scrollOffset + maxRows)
                    setScrollOffset(o => o + 1);
            }
            return;
        }
        if (key.return && onSelect) {
            onSelect(rows[selectedRow]);
        }
    });
    function renderCell(col, val, width) {
        const formatted = col.format ? col.format(val) : formatValue(val);
        return truncate(formatted, width);
    }
    return (_jsxs(Box, { flexDirection: "column", children: [title && _jsxs(Text, { bold: true, color: "blue", children: [" ", title] }), _jsx(Box, { flexDirection: "row", children: columns.map((col, i) => (_jsxs(Text, { bold: true, color: "blue", children: [" ", truncate(col.label, colWidths[i]), " "] }, col.key))) }), _jsx(Box, { flexDirection: "row", children: colWidths.map((w, i) => (_jsx(Text, { color: "gray", children: '─'.repeat(w + 2) }, i))) }), visible.map((row, rowIdx) => {
                const absIdx = rowIdx + scrollOffset;
                const isSelected = focused && absIdx === selectedRow;
                return (_jsx(Box, { flexDirection: "row", children: columns.map((col, i) => (_jsxs(Text, { color: isSelected ? 'cyan' : rowIdx % 2 === 0 ? 'white' : 'gray', bold: isSelected, children: [isSelected && i === 0 ? '▶' : ' ', renderCell(col, row[col.key], colWidths[i]), ' '] }, col.key))) }, rowIdx));
            }), rows.length > maxRows && (_jsxs(Text, { color: "gray", dimColor: true, children: [' ', "Showing ", scrollOffset + 1, "\u2013", Math.min(scrollOffset + maxRows, rows.length), " of ", rows.length] })), onSelect && focused && _jsx(Text, { color: "gray", dimColor: true, children: " \u2191\u2193 navigate \u00B7 Enter select" })] }));
}
export default DataTable;
//# sourceMappingURL=DataTable.js.map
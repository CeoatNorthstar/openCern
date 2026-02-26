import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import Fuse from 'fuse.js';
const COMMANDS = [
    { name: '/download', description: 'Download datasets from CERN Open Data', usage: '/download [query]' },
    { name: '/process', description: 'Process ROOT files with C++ engine', usage: '/process [--file path]' },
    { name: '/ask', description: 'Ask AI about physics or your data', usage: '/ask [question]' },
    { name: '/open', description: 'Inspect a ROOT or JSON file', usage: '/open [--json|--root] [file]' },
    { name: '/opask', description: 'Open file and start AI analysis', usage: '/opask [file]' },
    { name: '/quantum', description: 'Run quantum computing analysis', usage: '/quantum [classify|status]' },
    { name: '/viz', description: 'Launch 3D particle visualization', usage: '/viz [--file path]' },
    { name: '/status', description: 'Show system status and connections', usage: '/status' },
    { name: '/config', description: 'Configure API keys and preferences', usage: '/config [--show|--reset]' },
    { name: '/login', description: 'Sign in to OpenCERN', usage: '/login' },
    { name: '/logout', description: 'Sign out', usage: '/logout' },
    { name: '/history', description: 'Show command history', usage: '/history' },
    { name: '/doctor', description: 'Diagnose and fix system issues', usage: '/doctor' },
    { name: '/update', description: 'Update CLI and Docker images', usage: '/update' },
    { name: '/clear', description: 'Clear the terminal', usage: '/clear' },
    { name: '/help', description: 'Show help and keyboard shortcuts', usage: '/help' },
    { name: '/exit', description: 'Exit OpenCERN', usage: '/exit' },
];
const fuse = new Fuse(COMMANDS, {
    keys: ['name', 'description'],
    threshold: 0.4,
});
export function CommandPalette({ query, onSelect, onDismiss }) {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const filtered = query.length > 1
        ? fuse.search(query.slice(1)).map(r => r.item)
        : COMMANDS;
    const visible = filtered.slice(0, 8);
    useInput((_input, key) => {
        if (key.escape) {
            onDismiss();
            return;
        }
        if (key.upArrow) {
            setSelectedIndex(i => Math.max(0, i - 1));
            return;
        }
        if (key.downArrow) {
            setSelectedIndex(i => Math.min(visible.length - 1, i + 1));
            return;
        }
        if (key.return || key.tab) {
            if (visible[selectedIndex])
                onSelect(visible[selectedIndex].name);
            return;
        }
    });
    if (visible.length === 0) {
        return (_jsx(Box, { borderStyle: "single", borderColor: "gray", paddingX: 1, children: _jsx(Text, { color: "gray", children: "No commands found" }) }));
    }
    return (_jsxs(Box, { flexDirection: "column", borderStyle: "single", borderColor: "blue", paddingX: 1, children: [_jsx(Text, { color: "blue", bold: true, children: " Commands" }), visible.map((cmd, i) => (_jsxs(Box, { flexDirection: "row", gap: 1, children: [_jsxs(Text, { color: i === selectedIndex ? 'cyan' : 'white', bold: i === selectedIndex, children: [i === selectedIndex ? '▶' : ' ', " ", cmd.name.padEnd(12)] }), _jsx(Text, { color: "gray", children: cmd.description })] }, cmd.name))), _jsx(Text, { color: "gray", dimColor: true, children: " \u2191\u2193 navigate \u00B7 Enter select \u00B7 Esc dismiss" })] }));
}
export default CommandPalette;
//# sourceMappingURL=CommandPalette.js.map
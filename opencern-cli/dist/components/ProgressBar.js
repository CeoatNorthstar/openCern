import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
function formatSpeed(bytesPerSec) {
    if (bytesPerSec > 1_000_000)
        return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`;
    if (bytesPerSec > 1_000)
        return `${(bytesPerSec / 1_000).toFixed(0)} KB/s`;
    return `${bytesPerSec} B/s`;
}
function formatEta(seconds) {
    if (seconds < 60)
        return `${Math.round(seconds)}s`;
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
function modeIcon(mode) {
    switch (mode) {
        case 'download': return '⬇';
        case 'upload': return '⬆';
        case 'quantum': return '⚛';
        case 'process': return '⚙';
        default: return '●';
    }
}
export function ProgressBar({ label, percent, speed, eta, mode, indeterminate = false, done = false, error = false, }) {
    const [spinnerFrame, setSpinnerFrame] = useState(0);
    useEffect(() => {
        if (done)
            return;
        const interval = setInterval(() => {
            setSpinnerFrame(f => (f + 1) % SPINNER_FRAMES.length);
        }, 80);
        return () => clearInterval(interval);
    }, [done]);
    const barWidth = 20;
    const filled = Math.round((Math.min(percent, 100) / 100) * barWidth);
    const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
    const color = error ? 'red' : done ? 'green' : 'blue';
    const icon = modeIcon(mode);
    return (_jsxs(Box, { flexDirection: "row", gap: 1, children: [_jsx(Text, { children: icon }), _jsx(Text, { color: done ? 'green' : error ? 'red' : 'white', children: label }), indeterminate ? (_jsx(Text, { color: color, children: SPINNER_FRAMES[spinnerFrame] })) : (_jsxs(_Fragment, { children: [_jsxs(Text, { color: color, children: ["[", bar, "]"] }), _jsxs(Text, { color: color, children: [Math.round(percent), "%"] })] })), speed !== undefined && _jsx(Text, { color: "gray", children: formatSpeed(speed) }), eta !== undefined && eta > 0 && !done && (_jsxs(Text, { color: "gray", children: ["ETA ", formatEta(eta)] }))] }));
}
export default ProgressBar;
//# sourceMappingURL=ProgressBar.js.map
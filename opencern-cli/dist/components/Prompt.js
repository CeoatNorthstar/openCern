import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 OpenCERN Contributors
import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getPrevious, getNext, resetCursor } from '../utils/history.js';
const COMMANDS = [
    { name: '/ask', description: 'Ask AI a physics question' },
    { name: '/auth', description: 'Authentication commands' },
    { name: '/clear', description: 'Clear the screen' },
    { name: '/config', description: 'Configure settings and API keys' },
    { name: '/doctor', description: 'Run system diagnostics' },
    { name: '/download', description: 'Download CERN Open Data datasets' },
    { name: '/exit', description: 'Exit OpenCERN CLI' },
    { name: '/help', description: 'Show available commands' },
    { name: '/history', description: 'Show command history' },
    { name: '/keys', description: 'Manage API keys' },
    { name: '/login', description: 'Sign in to OpenCERN' },
    { name: '/logout', description: 'Sign out of OpenCERN' },
    { name: '/model', description: 'Show or switch active model' },
    { name: '/models', description: 'List available Claude models' },
    { name: '/open', description: 'Open a data file (JSON or ROOT)' },
    { name: '/opask', description: 'Open a file and ask AI about it' },
    { name: '/process', description: 'Process a ROOT file' },
    { name: '/quantum', description: 'Run quantum classification' },
    { name: '/status', description: 'Show system status' },
    { name: '/update', description: 'Check for and apply updates' },
    { name: '/usage', description: 'Show session token usage stats' },
    { name: '/viz', description: 'Visualise a dataset' },
];
export function Prompt({ onSubmit, disabled = false, placeholder }) {
    const [value, setValue] = useState('');
    const [completionIndex, setCompletionIndex] = useState(0);
    const inCommandMode = value.startsWith('/');
    const completions = inCommandMode
        ? COMMANDS.filter(c => c.name.startsWith(value.split(' ')[0]))
        : [];
    const showCompletions = completions.length > 0 && value.split(' ').length === 1;
    const handleChange = useCallback((val) => {
        setValue(val);
        setCompletionIndex(0);
    }, []);
    const handleSubmit = useCallback((val) => {
        const trimmed = val.trim();
        if (!trimmed)
            return;
        resetCursor();
        setValue('');
        setCompletionIndex(0);
        onSubmit(trimmed);
    }, [onSubmit]);
    useInput((_input, key) => {
        if (disabled)
            return;
        if (key.upArrow) {
            if (showCompletions) {
                setCompletionIndex(i => (i - 1 + completions.length) % completions.length);
            }
            else {
                const prev = getPrevious();
                if (prev !== null)
                    setValue(prev);
            }
            return;
        }
        if (key.downArrow) {
            if (showCompletions) {
                setCompletionIndex(i => (i + 1) % completions.length);
            }
            else {
                const next = getNext();
                setValue(next ?? '');
            }
            return;
        }
        if (key.tab && showCompletions) {
            setValue(completions[completionIndex].name + ' ');
            return;
        }
    });
    const visibleCompletions = completions.slice(0, 6);
    return (_jsxs(Box, { flexDirection: "column", children: [showCompletions && (_jsxs(Box, { flexDirection: "column", marginBottom: 0, children: [visibleCompletions.map((cmd, i) => {
                        const selected = i === completionIndex;
                        return (_jsxs(Box, { flexDirection: "row", gap: 1, children: [_jsxs(Text, { color: selected ? 'cyan' : 'gray', bold: selected, children: ['  ', cmd.name] }), _jsx(Text, { color: "gray", dimColor: true, children: cmd.description })] }, cmd.name));
                    }), _jsx(Text, { color: "gray", dimColor: true, children: '  ' + '─'.repeat(50) })] })), _jsxs(Box, { flexDirection: "row", alignItems: "center", children: [_jsx(Text, { color: "gray", dimColor: true, children: "opencern" }), _jsx(Text, { color: "cyan", bold: true, children: ' > ' }), disabled ? (_jsx(Text, { color: "gray", children: placeholder || 'Processing...' })) : (_jsx(TextInput, { value: value, onChange: handleChange, onSubmit: handleSubmit, placeholder: placeholder || 'Type / for commands, or ask a question...' }))] })] }));
}
export default Prompt;
//# sourceMappingURL=Prompt.js.map
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getPrevious, getNext, resetCursor } from '../utils/history.js';
export function Prompt({ onSubmit, onTab, onSlash, disabled = false, placeholder }) {
    const [value, setValue] = useState('');
    const handleChange = useCallback((val) => {
        setValue(val);
        if (val === '/' && onSlash) {
            onSlash();
        }
    }, [onSlash]);
    const handleSubmit = useCallback((val) => {
        const trimmed = val.trim();
        if (!trimmed)
            return;
        resetCursor();
        setValue('');
        onSubmit(trimmed);
    }, [onSubmit]);
    useInput((_input, key) => {
        if (disabled)
            return;
        if (key.upArrow) {
            const prev = getPrevious();
            if (prev !== null)
                setValue(prev);
            return;
        }
        if (key.downArrow) {
            const next = getNext();
            setValue(next ?? '');
            return;
        }
        if (key.tab && onTab) {
            onTab(value);
            return;
        }
    });
    return (_jsxs(Box, { flexDirection: "row", alignItems: "center", children: [_jsx(Text, { color: "gray", dimColor: true, children: "opencern " }), _jsx(Text, { color: "cyan", bold: true, children: "\u276F " }), disabled ? (_jsx(Text, { color: "gray", children: placeholder || 'Processing...' })) : (_jsx(TextInput, { value: value, onChange: handleChange, onSubmit: handleSubmit, placeholder: placeholder || 'Type / for commands, or ask a question...' }))] }));
}
export default Prompt;
//# sourceMappingURL=Prompt.js.map
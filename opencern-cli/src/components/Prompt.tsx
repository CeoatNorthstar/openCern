import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getPrevious, getNext, resetCursor } from '../utils/history.js';

interface PromptProps {
  onSubmit: (input: string) => void;
  onTab?: (partial: string) => void;
  onSlash?: () => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Prompt({ onSubmit, onTab, onSlash, disabled = false, placeholder }: PromptProps): React.JSX.Element {
  const [value, setValue] = useState('');

  const handleChange = useCallback((val: string) => {
    setValue(val);
    if (val === '/' && onSlash) {
      onSlash();
    }
  }, [onSlash]);

  const handleSubmit = useCallback((val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    resetCursor();
    setValue('');
    onSubmit(trimmed);
  }, [onSubmit]);

  useInput((_input, key) => {
    if (disabled) return;

    if (key.upArrow) {
      const prev = getPrevious();
      if (prev !== null) setValue(prev);
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

  return (
    <Box flexDirection="row" alignItems="center">
      <Text color="gray" dimColor>opencern </Text>
      <Text color="cyan" bold>❯ </Text>
      {disabled ? (
        <Text color="gray">{placeholder || 'Processing...'}</Text>
      ) : (
        <TextInput
          value={value}
          onChange={handleChange}
          onSubmit={handleSubmit}
          placeholder={placeholder || 'Type / for commands, or ask a question...'}
        />
      )}
    </Box>
  );
}

export default Prompt;

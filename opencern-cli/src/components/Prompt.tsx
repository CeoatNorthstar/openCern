import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getPrevious, getNext, resetCursor } from '../utils/history.js';
import { getTheme } from '../tui/theme.js';

interface PromptProps {
  onSubmit: (input: string) => void;
  onTab?: (partial: string) => void;
  onSlash?: () => void;
  disabled?: boolean;
  placeholder?: string;
  accentColor?: string;
  agentName?: string;
  modelName?: string;
  providerName?: string;
  showHints?: boolean;
}

export function Prompt({
  onSubmit,
  onTab,
  onSlash,
  disabled = false,
  placeholder,
  accentColor,
  agentName = 'Analyze',
  modelName,
  providerName,
  showHints = true,
}: PromptProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const theme = getTheme();
  const accent = accentColor || theme.primary;

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
    <Box flexDirection="column">
      {/* Input area with accent border */}
      <Box flexDirection="row">
        <Text color={accent}>┃ </Text>
        <Box flexGrow={1} flexDirection="column">
          <Box>
            {disabled ? (
              <Text color={theme.textMuted}>
                {placeholder || 'Processing...'}
              </Text>
            ) : (
              <TextInput
                value={value}
                onChange={handleChange}
                onSubmit={handleSubmit}
                placeholder={placeholder || 'Ask anything about particle physics...'}
              />
            )}
          </Box>
          {/* Agent + Model info line */}
          <Box flexDirection="row" gap={1} marginTop={0}>
            <Text color={accent}>{agentName}</Text>
            {modelName && (
              <>
                <Text color={theme.text}>{modelName}</Text>
                {providerName && <Text color={theme.textMuted}>{providerName}</Text>}
              </>
            )}
          </Box>
        </Box>
      </Box>

      {/* Accent border bottom cap */}
      <Box>
        <Text color={accent}>╹</Text>
      </Box>

      {/* Hints row */}
      {showHints && !disabled && (
        <Box flexDirection="row" gap={2} justifyContent="flex-end">
          <Text color={theme.text}>
            / <Text color={theme.textMuted}>commands</Text>
          </Text>
          <Text color={theme.text}>
            Ctrl+P <Text color={theme.textMuted}>palette</Text>
          </Text>
        </Box>
      )}

      {/* Active processing hints */}
      {disabled && (
        <Box flexDirection="row" justifyContent="flex-end">
          <Text color={theme.text}>
            esc <Text color={theme.textMuted}>interrupt</Text>
          </Text>
        </Box>
      )}
    </Box>
  );
}

export default Prompt;

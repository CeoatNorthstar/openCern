// SPDX-License-Identifier: MIT
// Copyright (c) 2026 OpenCERN Contributors

import React, { useState, useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import { getPrevious, getNext, resetCursor } from '../utils/history.js';

interface Command {
  name: string;
  description: string;
}

const COMMANDS: Command[] = [
  { name: '/ask',      description: 'Ask AI a physics question' },
  { name: '/auth',     description: 'Authentication commands' },
  { name: '/clear',    description: 'Clear the screen' },
  { name: '/config',   description: 'Configure settings and API keys' },
  { name: '/doctor',   description: 'Run system diagnostics' },
  { name: '/download', description: 'Download CERN Open Data datasets' },
  { name: '/exit',     description: 'Exit OpenCERN CLI' },
  { name: '/help',     description: 'Show available commands' },
  { name: '/history',  description: 'Show command history' },
  { name: '/keys',     description: 'Manage API keys' },
  { name: '/login',    description: 'Sign in to OpenCERN' },
  { name: '/logout',   description: 'Sign out of OpenCERN' },
  { name: '/model',    description: 'Show or switch active model' },
  { name: '/models',   description: 'List available Claude models' },
  { name: '/open',     description: 'Open a data file (JSON or ROOT)' },
  { name: '/opask',    description: 'Open a file and ask AI about it' },
  { name: '/process',  description: 'Process a ROOT file' },
  { name: '/quantum',  description: 'Run quantum classification' },
  { name: '/status',   description: 'Show system status' },
  { name: '/update',   description: 'Check for and apply updates' },
  { name: '/usage',    description: 'Show session token usage stats' },
  { name: '/viz',      description: 'Visualise a dataset' },
];

interface PromptProps {
  onSubmit: (input: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function Prompt({ onSubmit, disabled = false, placeholder }: PromptProps): React.JSX.Element {
  const [value, setValue] = useState('');
  const [completionIndex, setCompletionIndex] = useState(0);

  const inCommandMode = value.startsWith('/');
  const completions = inCommandMode
    ? COMMANDS.filter(c => c.name.startsWith(value.split(' ')[0]))
    : [];
  const showCompletions = completions.length > 0 && value.split(' ').length === 1;

  const handleChange = useCallback((val: string) => {
    setValue(val);
    setCompletionIndex(0);
  }, []);

  const handleSubmit = useCallback((val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    resetCursor();
    setValue('');
    setCompletionIndex(0);
    onSubmit(trimmed);
  }, [onSubmit]);

  useInput((_input, key) => {
    if (disabled) return;

    if (key.upArrow) {
      if (showCompletions) {
        setCompletionIndex(i => (i - 1 + completions.length) % completions.length);
      } else {
        const prev = getPrevious();
        if (prev !== null) setValue(prev);
      }
      return;
    }

    if (key.downArrow) {
      if (showCompletions) {
        setCompletionIndex(i => (i + 1) % completions.length);
      } else {
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

  return (
    <Box flexDirection="column" width="100%">
      {showCompletions && (
        <Box 
          flexDirection="column" 
          marginBottom={1} 
          borderStyle="round" 
          borderColor="gray" 
          paddingX={1}
          width="50%"
        >
          <Box marginBottom={1}>
             <Text color="gray" bold> Available Commands</Text>
          </Box>
          {visibleCompletions.map((cmd, i) => {
            const selected = i === completionIndex;
            return (
              <Box key={cmd.name} flexDirection="row" gap={1}>
                {selected ? <Text color="cyan"> ❯ </Text> : <Text>   </Text>}
                <Text color={selected ? 'cyan' : 'white'} bold={selected}>
                  {cmd.name.padEnd(10)}
                </Text>
                <Text color="gray" dimColor={!selected}>
                  {cmd.description}
                </Text>
              </Box>
            );
          })}
        </Box>
      )}
      <Box flexDirection="row" alignItems="center">
        <Text color="magenta" bold>╭─</Text>
        <Text color="cyan" bold> ⚡ </Text>
        {disabled ? (
          <Text color="gray" italic>{placeholder || 'Processing...'}</Text>
        ) : (
          <TextInput
            value={value}
            onChange={handleChange}
            onSubmit={handleSubmit}
            placeholder={placeholder || 'Ask anything or type / for commands...'}
          />
        )}
      </Box>
    </Box>
  );
}

export default Prompt;

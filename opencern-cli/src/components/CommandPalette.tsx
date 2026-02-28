import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import TextInput from 'ink-text-input';
import Fuse from 'fuse.js';
import { getTheme } from '../tui/theme.js';

interface Command {
  name: string;
  description: string;
  usage?: string;
  category: string;
}

const COMMANDS: Command[] = [
  // Data
  { name: '/download', description: 'Download datasets from CERN Open Data', usage: '/download [query]', category: 'Data' },
  { name: '/process', description: 'Process ROOT files with C++ engine', usage: '/process [--file path]', category: 'Data' },
  { name: '/open', description: 'Inspect a ROOT or JSON file', usage: '/open [file]', category: 'Data' },

  // AI
  { name: '/ask', description: 'Ask AI about physics or your data', usage: '/ask [question]', category: 'AI' },
  { name: '/opask', description: 'Open file + AI analysis split view', usage: '/opask [file]', category: 'AI' },

  // Quantum
  { name: '/quantum', description: 'Run quantum computing classification', usage: '/quantum [classify|status]', category: 'Quantum' },

  // Visualization
  { name: '/viz', description: 'Launch 3D particle visualization', usage: '/viz [--file path]', category: 'Visualization' },

  // System
  { name: '/status', description: 'Show system status and connections', usage: '/status', category: 'System' },
  { name: '/config', description: 'Configure API keys and preferences', usage: '/config [--show|--reset]', category: 'System' },
  { name: '/login', description: 'Sign in to OpenCERN', usage: '/login', category: 'System' },
  { name: '/logout', description: 'Sign out', usage: '/logout', category: 'System' },
  { name: '/doctor', description: 'Diagnose and fix system issues', usage: '/doctor', category: 'System' },
  { name: '/update', description: 'Update CLI and Docker images', usage: '/update', category: 'System' },

  // Session
  { name: '/history', description: 'Show command history', usage: '/history', category: 'Session' },
  { name: '/clear', description: 'Clear the terminal output', usage: '/clear', category: 'Session' },
  { name: '/help', description: 'Show help and keyboard shortcuts', usage: '/help', category: 'Session' },
  { name: '/exit', description: 'Exit OpenCERN', usage: '/exit', category: 'Session' },
];

const fuse = new Fuse(COMMANDS, {
  keys: ['name', 'description', 'category'],
  threshold: 0.4,
});

interface CommandPaletteProps {
  query: string;
  onSelect: (command: string) => void;
  onDismiss: () => void;
  width?: number;
}

export function CommandPalette({ query, onSelect, onDismiss, width = 60 }: CommandPaletteProps): React.JSX.Element {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [search, setSearch] = useState(query.startsWith('/') ? query.slice(1) : query);
  const theme = getTheme();

  const filtered = useMemo(() => {
    if (!search) return COMMANDS;
    return fuse.search(search).map(r => r.item);
  }, [search]);

  const visible = filtered.slice(0, 10);

  // Group by category
  const grouped = useMemo(() => {
    const groups: Record<string, Command[]> = {};
    for (const cmd of visible) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      groups[cmd.category].push(cmd);
    }
    return groups;
  }, [visible]);

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
    if (key.return) {
      if (visible[selectedIndex]) onSelect(visible[selectedIndex].name);
      return;
    }
  });

  let flatIndex = 0;

  return (
    <Box
      flexDirection="column"
      borderStyle="round"
      borderColor={theme.border}
      width={width}
      paddingX={1}
      paddingY={0}
    >
      {/* Search input */}
      <Box marginBottom={0} paddingY={0}>
        <Text color={theme.primary} bold>{'❯ '}</Text>
        <TextInput
          value={search}
          onChange={val => {
            setSearch(val);
            setSelectedIndex(0);
          }}
          placeholder="Search commands..."
        />
      </Box>

      <Box marginY={0}>
        <Text color={theme.border}>{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Command list grouped by category */}
      {visible.length === 0 ? (
        <Box paddingY={0}>
          <Text color={theme.textMuted}>No commands found</Text>
        </Box>
      ) : (
        Object.entries(grouped).map(([category, cmds]) => (
          <Box key={category} flexDirection="column" marginBottom={0}>
            <Text color={theme.textMuted} dimColor bold>
              {'  '}{category.toUpperCase()}
            </Text>
            {cmds.map(cmd => {
              const idx = flatIndex++;
              const isSelected = idx === selectedIndex;
              return (
                <Box key={cmd.name} flexDirection="row" gap={1}>
                  <Text
                    color={isSelected ? theme.primary : theme.text}
                    bold={isSelected}
                    backgroundColor={isSelected ? theme.backgroundElement : undefined}
                  >
                    {isSelected ? ' ▸ ' : '   '}
                    {cmd.name.padEnd(14)}
                  </Text>
                  <Text color={theme.textMuted} wrap="truncate">
                    {cmd.description}
                  </Text>
                </Box>
              );
            })}
          </Box>
        ))
      )}

      <Box marginTop={0}>
        <Text color={theme.border}>{'─'.repeat(width - 4)}</Text>
      </Box>

      {/* Footer hints */}
      <Box flexDirection="row" gap={2} paddingY={0}>
        <Text color={theme.textMuted} dimColor>
          {'↑↓ navigate  ↵ select  esc dismiss'}
        </Text>
      </Box>
    </Box>
  );
}

export default CommandPalette;

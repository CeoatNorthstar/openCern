import React, { useMemo } from 'react';
import { Box, Text } from 'ink';
import { getTheme } from '../tui/theme.js';

const TIPS = [
  'Type {h}/download{/h} to search and download CERN Open Data datasets',
  'Use {h}/ask{/h} or just type a question to chat with AI about particle physics',
  'Press {h}/{/h} to open the command palette with fuzzy search',
  'Run {h}/quantum classify{/h} to classify events with quantum ML',
  'Use {h}/open{/h} to inspect ROOT or JSON files with syntax highlighting',
  'Press {h}Ctrl+L{/h} to clear the output log',
  'Use {h}/opask{/h} for a split view of file + AI analysis',
  'Run {h}/status{/h} to check Docker, API, and quantum backend health',
  'Use {h}/config{/h} to set up your API keys and preferences',
  'Run {h}/doctor{/h} to diagnose and fix system issues',
  'Press {h}Esc{/h} to cancel AI streaming or close overlays',
  'Use {h}/viz{/h} to launch 3D particle event visualization',
  'Press {h}Up/Down{/h} arrows to navigate command history',
  'Run {h}/login{/h} to authenticate and unlock all features',
  'Type any question without {h}/{/h} to ask AI directly',
];

interface TipPart {
  text: string;
  highlight: boolean;
}

function parseTip(tip: string): TipPart[] {
  const parts: TipPart[] = [];
  const regex = /\{h\}(.*?)\{\/h\}/g;
  let lastIndex = 0;

  for (const match of tip.matchAll(regex)) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ text: tip.slice(lastIndex, start), highlight: false });
    }
    parts.push({ text: match[1], highlight: true });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < tip.length) {
    parts.push({ text: tip.slice(lastIndex), highlight: false });
  }

  return parts;
}

export function Tips(): React.JSX.Element {
  const theme = getTheme();
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);
  const parts = useMemo(() => parseTip(tip), [tip]);

  return (
    <Box flexDirection="row">
      <Text color={theme.warning}>{'● '}</Text>
      <Text color={theme.textMuted}>Tip </Text>
      {parts.map((part, i) => (
        <Text key={i} color={part.highlight ? theme.text : theme.textMuted}>
          {part.text}
        </Text>
      ))}
    </Box>
  );
}

export default Tips;

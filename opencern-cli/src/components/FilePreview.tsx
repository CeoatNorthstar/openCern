import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface FilePreviewProps {
  content: string;
  filename?: string;
  size?: number;
  fileType?: 'json' | 'text' | 'root-meta';
  onClose?: () => void;
  focused?: boolean;
}

function renderRootMeta(content: string): React.ReactNode {
  try {
    const meta = JSON.parse(content);
    return (
      <Box flexDirection="column">
        <Text bold color="blue"> ROOT File Structure</Text>
        {Object.entries(meta).map(([key, val]) => (
          <Box key={key} flexDirection="column" marginLeft={2}>
            <Text color="cyan">TTree: {key}</Text>
            {Array.isArray(val) && val.map((b: unknown) => (
              <Text key={String(b)} color="gray">  └─ {String(b)}</Text>
            ))}
          </Box>
        ))}
      </Box>
    );
  } catch {
    return <Text>{content}</Text>;
  }
}

function formatSize(bytes: number): string {
  if (bytes > 1_000_000) return `${(bytes / 1_000_000).toFixed(1)} MB`;
  if (bytes > 1_000) return `${(bytes / 1_000).toFixed(0)} KB`;
  return `${bytes} B`;
}

export function FilePreview({
  content,
  filename,
  size,
  fileType = 'text',
  onClose,
  focused = true,
}: FilePreviewProps): React.JSX.Element {
  const [scrollOffset, setScrollOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);

  const VISIBLE_LINES = 22;
  const lines = content.split('\n');
  const totalLines = lines.length;

  useInput((input, key) => {
    if (!focused) return;
    if (key.escape) {
      if (searching) { setSearching(false); setSearchTerm(''); return; }
      if (onClose) onClose();
      return;
    }
    if (key.upArrow) { setScrollOffset(o => Math.max(0, o - 1)); return; }
    if (key.downArrow) { setScrollOffset(o => Math.min(Math.max(0, totalLines - VISIBLE_LINES), o + 1)); return; }
    if (input === '\x06') { setSearching(true); return; } // Ctrl+F
    if (searching) {
      if (key.backspace) setSearchTerm(t => t.slice(0, -1));
      else if (input && !key.ctrl) setSearchTerm(t => t + input);
    }
  });

  if (fileType === 'root-meta') {
    return (
      <Box flexDirection="column">
        {renderRootMeta(content)}
        <Text color="gray" dimColor> Esc to close</Text>
      </Box>
    );
  }

  const visibleLines = lines.slice(scrollOffset, scrollOffset + VISIBLE_LINES);

  // Color JSON lines
  function colorLine(line: string): React.ReactNode {
    if (fileType !== 'json') return <Text>{line}</Text>;
    // Simple JSON coloring with string replacements rendered as Text nodes
    const keyMatch = line.match(/^(\s*)"([^"]+)":/);
    const isKey = keyMatch !== null;
    const isString = line.includes(': "') || (line.trim().startsWith('"') && !isKey);
    const isNumber = /:\s*-?\d+\.?\d*/.test(line);
    const isBool = /:\s*(true|false|null)/.test(line);

    if (isKey) {
      return (
        <Text>
          <Text color="gray">{line.slice(0, line.indexOf('"'))}</Text>
          <Text color="yellow">"{keyMatch![2]}"</Text>
          <Text color="white">{line.slice(line.indexOf(':'))}</Text>
        </Text>
      );
    }
    if (isNumber) return <Text color="magenta">{line}</Text>;
    if (isBool) return <Text color="blue">{line}</Text>;
    if (isString) return <Text color="green">{line}</Text>;
    return <Text color="white">{line}</Text>;
  }

  return (
    <Box flexDirection="column">
      {filename && (
        <Box paddingX={1} marginBottom={0}>
          <Text color="cyan" bold>{filename}</Text>
          {size !== undefined && <Text color="gray" dimColor>  {formatSize(size)}</Text>}
          <Text color="gray" dimColor>  {totalLines} lines</Text>
        </Box>
      )}
      {searching && (
        <Box marginBottom={0}>
          <Text color="yellow"> Search: </Text>
          <Text>{searchTerm}</Text>
          <Text color="gray" dimColor>▊</Text>
        </Box>
      )}
      <Box flexDirection="column">
        {visibleLines.map((line, i) => {
          const lineNum = scrollOffset + i + 1;
          const highlight = searchTerm && line.toLowerCase().includes(searchTerm.toLowerCase());
          return (
            <Box key={i} flexDirection="row">
              <Text color="gray" dimColor>{String(lineNum).padStart(4)} │ </Text>
              {highlight ? <Text backgroundColor="yellow" color="black">{line}</Text> : colorLine(line)}
            </Box>
          );
        })}
      </Box>
      <Box flexDirection="row" gap={2} marginTop={0} paddingX={1}>
        <Text color="gray" dimColor>Lines {scrollOffset + 1}–{Math.min(scrollOffset + VISIBLE_LINES, totalLines)}/{totalLines}</Text>
        <Text color="gray" dimColor>↑↓ scroll · Ctrl+F search · Esc close</Text>
      </Box>
    </Box>
  );
}

export default FilePreview;

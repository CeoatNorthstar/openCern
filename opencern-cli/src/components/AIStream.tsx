import React from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { getTheme } from '../tui/theme.js';

interface AIStreamProps {
  tokens: string;
  isStreaming: boolean;
  onCancel?: () => void;
  model?: string;
  tokenCount?: number;
  latency?: number;
}

function renderInline(text: string): React.ReactNode[] {
  const theme = getTheme();
  // Match bold, code, and links
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} bold color={theme.text}>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <Text key={i} color={theme.codeText} backgroundColor={theme.backgroundElement}>{' '}{part.slice(1, -1)}{' '}</Text>;
    }
    // Markdown links: [text](url)
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      return <Text key={i} color={theme.link} underline>{linkMatch[1]}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const theme = getTheme();
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLang = '';

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        // Close code block
        nodes.push(
          <Box
            key={`code-${i}`}
            flexDirection="column"
            borderStyle="round"
            borderColor={theme.codeBorder}
            paddingX={1}
            marginY={0}
          >
            {codeLang && (
              <Text color={theme.textMuted} dimColor>{codeLang}</Text>
            )}
            {codeLines.map((l, j) => (
              <Text key={j} color={theme.codeText}>{l}</Text>
            ))}
          </Box>
        );
        codeLines = [];
        codeLang = '';
        inCodeBlock = false;
      } else {
        codeLang = line.slice(3).trim();
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      nodes.push(
        <Text key={i} color={theme.heading} bold>{'   '}{line.slice(4)}</Text>
      );
      return;
    }
    if (line.startsWith('## ')) {
      nodes.push(
        <Text key={i} color={theme.heading} bold>{'  '}{line.slice(3)}</Text>
      );
      return;
    }
    if (line.startsWith('# ')) {
      nodes.push(
        <Text key={i} color={theme.heading} bold>{line.slice(2)}</Text>
      );
      return;
    }

    // Bullet lists
    if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const content = line.replace(/^\s*[-*]\s/, '');
      nodes.push(
        <Box key={i} flexDirection="row">
          <Text color={theme.primary}>{indent}{'  ● '}</Text>
          <Text>{renderInline(content)}</Text>
        </Box>
      );
      return;
    }

    // Numbered lists
    if (line.match(/^\s*\d+\.\s/)) {
      const match = line.match(/^(\s*)(\d+)\.\s(.*)$/);
      if (match) {
        nodes.push(
          <Box key={i} flexDirection="row">
            <Text color={theme.primary}>{match[1]}{'  '}{match[2]}. </Text>
            <Text>{renderInline(match[3])}</Text>
          </Box>
        );
        return;
      }
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      nodes.push(
        <Box key={i} flexDirection="row">
          <Text color={theme.textMuted}>{'  │ '}</Text>
          <Text color={theme.textMuted} italic>{renderInline(line.slice(2))}</Text>
        </Box>
      );
      return;
    }

    // Horizontal rules
    if (line.match(/^[-_*]{3,}$/)) {
      nodes.push(
        <Text key={i} color={theme.border}>{'  ────────────────────────────────────'}</Text>
      );
      return;
    }

    // Regular text
    nodes.push(<Text key={i}>{renderInline(line)}</Text>);
  });

  // Handle unclosed code block
  if (inCodeBlock && codeLines.length) {
    nodes.push(
      <Box
        key="code-end"
        flexDirection="column"
        borderStyle="round"
        borderColor={theme.codeBorder}
        paddingX={1}
      >
        {codeLang && (
          <Text color={theme.textMuted} dimColor>{codeLang}</Text>
        )}
        {codeLines.map((l, j) => (
          <Text key={j} color={theme.codeText}>{l}</Text>
        ))}
      </Box>
    );
  }

  return nodes;
}

export function AIStream({
  tokens,
  isStreaming,
  onCancel,
  model,
  tokenCount,
  latency,
}: AIStreamProps): React.JSX.Element {
  const theme = getTheme();

  useInput((_input, key) => {
    if (key.escape && isStreaming && onCancel) {
      onCancel();
    }
  });

  const modelShort = model?.replace('claude-', '').replace(/-\d{8}$/, '') || '';

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Streaming indicator */}
      {isStreaming && (
        <Box marginBottom={0} flexDirection="row" gap={1}>
          <Text color={theme.primary}><Spinner type="dots" /></Text>
          <Text color={theme.textMuted}>Thinking...</Text>
        </Box>
      )}

      {/* Content */}
      <Box flexDirection="column">
        {renderMarkdown(tokens)}
        {isStreaming && <Text color={theme.primary}>{'▊'}</Text>}
      </Box>

      {/* Stats footer */}
      {!isStreaming && tokens && (
        <Box marginTop={1} gap={2} flexDirection="row">
          {model && <Text color={theme.textMuted} dimColor>{modelShort}</Text>}
          {tokenCount !== undefined && (
            <Text color={theme.textMuted} dimColor>{tokenCount.toLocaleString()} tokens</Text>
          )}
          {latency !== undefined && (
            <Text color={theme.textMuted} dimColor>{(latency / 1000).toFixed(1)}s</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export default AIStream;

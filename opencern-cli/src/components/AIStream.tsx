import React from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';

interface AIStreamProps {
  tokens: string;
  isStreaming: boolean;
  onCancel?: () => void;
  model?: string;
  tokenCount?: number;
  latency?: number;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <Text key={i} bold>{part.slice(2, -2)}</Text>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <Text key={i} color="cyan">{part.slice(1, -1)}</Text>;
    }
    return <Text key={i}>{part}</Text>;
  });
}

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeLines: string[] = [];

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        nodes.push(
          <Box key={`code-${i}`} borderStyle="single" borderColor="gray" paddingX={1} marginY={0}>
            {codeLines.map((l, j) => <Text key={j} color="green">{l}</Text>)}
          </Box>
        );
        codeLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }
    if (inCodeBlock) {
      codeLines.push(line);
      return;
    }
    nodes.push(<Text key={i}>{renderInline(line)}</Text>);
  });

  if (inCodeBlock && codeLines.length) {
    nodes.push(
      <Box key="code-end" borderStyle="single" borderColor="gray" paddingX={1}>
        {codeLines.map((l, j) => <Text key={j} color="green">{l}</Text>)}
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
  useInput((_input, key) => {
    if (key.escape && isStreaming && onCancel) {
      onCancel();
    }
  });

  const modelShort = model?.replace('claude-', '') || '';

  return (
    <Box flexDirection="column" paddingX={1}>
      {isStreaming && (
        <Box marginBottom={1}>
          <Text color="blue"><Spinner type="dots" /></Text>
          <Text color="gray" dimColor>  Analyzing...</Text>
        </Box>
      )}
      <Box flexDirection="column">
        {renderMarkdown(tokens)}
        {isStreaming && <Text color="white">▊</Text>}
      </Box>
      {!isStreaming && tokens && (
        <Box marginTop={1} gap={2}>
          {model && <Text color="gray" dimColor>{modelShort}</Text>}
          {tokenCount !== undefined && <Text color="gray" dimColor>{tokenCount} tokens</Text>}
          {latency !== undefined && <Text color="gray" dimColor>{latency}ms</Text>}
        </Box>
      )}
    </Box>
  );
}

export default AIStream;

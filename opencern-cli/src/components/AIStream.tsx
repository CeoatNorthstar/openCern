// SPDX-License-Identifier: MIT
// Copyright (c) 2026 OpenCERN Contributors

import React from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import type { ToolCall, ToolResult } from '../services/anthropic.js';

interface AIStreamProps {
  tokens: string;
  isStreaming: boolean;
  onCancel?: () => void;
  model?: string;
  tokenCount?: number;
  latency?: number;
  // Agentic state
  pendingTool?: ToolCall | null;
  toolResults?: ToolResult[];
  onApprove?: () => void;
  onDeny?: () => void;
  thinkingText?: string;
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
  let codeLang = '';

  lines.forEach((line, i) => {
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        nodes.push(
          <Box key={`code-${i}`} flexDirection="column" marginY={0} paddingLeft={2}>
            {codeLang && <Text color="gray" dimColor>{codeLang}</Text>}
            {codeLines.map((l, j) => (
              <Box key={j} flexDirection="row">
                <Text color="gray" dimColor>{'│ '}</Text>
                <Text color="green">{l}</Text>
              </Box>
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
      nodes.push(<Text key={i} bold color="white">{line.slice(4)}</Text>);
      return;
    }
    if (line.startsWith('## ')) {
      nodes.push(<Text key={i} bold color="cyan">{line.slice(3)}</Text>);
      return;
    }
    if (line.startsWith('# ')) {
      nodes.push(<Text key={i} bold color="cyan">{line.slice(2)}</Text>);
      return;
    }
    // List items
    if (line.match(/^\s*[-*]\s/)) {
      const indent = line.match(/^(\s*)/)?.[1] || '';
      const content = line.replace(/^\s*[-*]\s/, '');
      nodes.push(<Text key={i}>{indent}  - {renderInline(content)}</Text>);
      return;
    }
    nodes.push(<Text key={i}>{renderInline(line)}</Text>);
  });

  if (inCodeBlock && codeLines.length) {
    nodes.push(
      <Box key="code-end" flexDirection="column" marginY={0} paddingLeft={2}>
        {codeLang && <Text color="gray" dimColor>{codeLang}</Text>}
        {codeLines.map((l, j) => (
          <Box key={j} flexDirection="row">
            <Text color="gray" dimColor>{'│ '}</Text>
            <Text color="green">{l}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  return nodes;
}

function ToolApprovalCard({ toolCall, onApprove, onDeny }: {
  toolCall: ToolCall;
  onApprove?: () => void;
  onDeny?: () => void;
}): React.JSX.Element {
  useInput((_input, key) => {
    if (key.return && onApprove) onApprove();
    if (key.escape && onDeny) onDeny();
  });

  const toolLabel = toolCall.name === 'execute_python' ? 'python'
    : toolCall.name === 'execute_bash' ? 'bash'
    : 'opencern';

  return (
    <Box flexDirection="column" marginY={1} paddingX={1} borderStyle="round" borderColor="yellow">
      <Box flexDirection="row" marginBottom={1} gap={1}>
         <Text color="black" backgroundColor="yellow" bold> ⚙ EXECUTING </Text>
         <Text color="yellow"> {toolLabel} </Text>
      </Box>
      {toolCall.resourceWarning && (
        <Box marginBottom={1}>
           <Text color="yellow" dimColor>⚠ {toolCall.resourceWarning}</Text>
        </Box>
      )}
      <Box flexDirection="column" marginY={0} paddingLeft={1}>
        {(toolCall.displayCode || '').split('\n').map((line, i) => (
          <Text key={i} color="gray">{line}</Text>
        ))}
      </Box>
      <Box gap={2} marginTop={1}  borderStyle="single" borderTop borderColor="gray">
        <Text color="gray" dimColor>Press <Text bold color="white">Enter</Text> to run or <Text bold color="white">Esc</Text> to skip</Text>
      </Box>
    </Box>
  );
}

function ToolResultCard({ result }: { result: ToolResult }): React.JSX.Element {
  const statusColor = result.success ? 'green' : 'red';
  const statusIcon = result.success ? '[ok]' : '[err]';
  const durationStr = result.duration ? ` ${result.duration}ms` : '';

  return (
    <Box flexDirection="column" marginY={0} paddingX={1}>
      <Box gap={1}>
        <Text color={statusColor}>{statusIcon}</Text>
        <Text color="gray" dimColor>execution{durationStr}</Text>
      </Box>
      {result.output && (
        <Box flexDirection="column" paddingLeft={2} marginY={0}>
          {result.output.split('\n').slice(0, 20).map((line, i) => (
            <Text key={i} color="gray">{line}</Text>
          ))}
          {result.output.split('\n').length > 20 && (
            <Text color="gray" dimColor>... ({result.output.split('\n').length - 20} more lines)</Text>
          )}
        </Box>
      )}
    </Box>
  );
}

export function AIStream({
  tokens,
  isStreaming,
  onCancel,
  model,
  tokenCount,
  latency,
  pendingTool,
  toolResults,
  onApprove,
  onDeny,
  thinkingText,
}: AIStreamProps): React.JSX.Element {
  useInput((_input, key) => {
    if (key.escape && isStreaming && onCancel) {
      onCancel();
    }
  });

  const modelShort = model?.replace('claude-', '').replace(/-\d{8}$/, '') || '';

  return (
    <Box flexDirection="column" paddingX={1}>
      {/* Thinking / reasoning display */}
      {thinkingText && (
        <Box marginBottom={0} flexDirection="column">
          <Text color="gray" dimColor>[thinking] {thinkingText}</Text>
        </Box>
      )}

      {/* Streaming indicator */}
      {isStreaming && !pendingTool && (
        <Box marginBottom={0}>
          <Text color="blue"><Spinner type="dots" /></Text>
          <Text color="gray" dimColor>  generating...</Text>
        </Box>
      )}

      {/* Tool results history */}
      {toolResults?.map((result, i) => (
        <ToolResultCard key={i} result={result} />
      ))}

      {/* Main text content */}
      <Box flexDirection="column">
        {renderMarkdown(tokens)}
        {isStreaming && !pendingTool && <Text color="white">_</Text>}
      </Box>

      {/* Tool approval card */}
      {pendingTool && (
        <ToolApprovalCard
          toolCall={pendingTool}
          onApprove={onApprove}
          onDeny={onDeny}
        />
      )}

      {/* Footer stats */}
      {!isStreaming && tokens && (
        <Box marginTop={1} gap={2}>
          {model && <Text color="gray" dimColor>{modelShort}</Text>}
          {tokenCount !== undefined && <Text color="gray" dimColor>{tokenCount.toLocaleString()} tokens</Text>}
          {latency !== undefined && <Text color="gray" dimColor>{(latency / 1000).toFixed(1)}s</Text>}
        </Box>
      )}
    </Box>
  );
}

export default AIStream;

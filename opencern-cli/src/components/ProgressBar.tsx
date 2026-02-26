import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';

interface ProgressBarProps {
  label: string;
  percent: number;
  speed?: number;
  eta?: number;
  mode?: 'download' | 'process' | 'quantum' | 'upload';
  indeterminate?: boolean;
  done?: boolean;
  error?: boolean;
}

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec > 1_000_000) return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`;
  if (bytesPerSec > 1_000) return `${(bytesPerSec / 1_000).toFixed(0)} KB/s`;
  return `${bytesPerSec} B/s`;
}

function formatEta(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}

function modeIcon(mode: ProgressBarProps['mode']): string {
  switch (mode) {
    case 'download': return '⬇';
    case 'upload': return '⬆';
    case 'quantum': return '⚛';
    case 'process': return '⚙';
    default: return '●';
  }
}

export function ProgressBar({
  label,
  percent,
  speed,
  eta,
  mode,
  indeterminate = false,
  done = false,
  error = false,
}: ProgressBarProps): React.JSX.Element {
  const [spinnerFrame, setSpinnerFrame] = useState(0);

  useEffect(() => {
    if (done) return;
    const interval = setInterval(() => {
      setSpinnerFrame(f => (f + 1) % SPINNER_FRAMES.length);
    }, 80);
    return () => clearInterval(interval);
  }, [done]);

  const barWidth = 20;
  const filled = Math.round((Math.min(percent, 100) / 100) * barWidth);
  const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
  const color = error ? 'red' : done ? 'green' : 'blue';
  const icon = modeIcon(mode);

  return (
    <Box flexDirection="row" gap={1}>
      <Text>{icon}</Text>
      <Text color={done ? 'green' : error ? 'red' : 'white'}>{label}</Text>
      {indeterminate ? (
        <Text color={color}>{SPINNER_FRAMES[spinnerFrame]}</Text>
      ) : (
        <>
          <Text color={color}>[{bar}]</Text>
          <Text color={color}>{Math.round(percent)}%</Text>
        </>
      )}
      {speed !== undefined && <Text color="gray">{formatSpeed(speed)}</Text>}
      {eta !== undefined && eta > 0 && !done && (
        <Text color="gray">ETA {formatEta(eta)}</Text>
      )}
    </Box>
  );
}

export default ProgressBar;

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { docker } from '../services/docker.js';
import { config } from '../utils/config.js';
import { isAuthenticated } from '../utils/auth.js';
import { getTheme } from '../tui/theme.js';

interface StatusState {
  dockerRunning: boolean;
  apiReady: boolean;
  quantumReady: boolean;
  authStatus: boolean;
  checking: boolean;
}

export function StatusBar(): React.JSX.Element {
  const theme = getTheme();
  const [status, setStatus] = useState<StatusState>({
    dockerRunning: false,
    apiReady: false,
    quantumReady: false,
    authStatus: false,
    checking: true,
  });

  const checkStatus = async () => {
    const dockerRunning = docker.isDockerRunning();
    const apiReady = dockerRunning ? await docker.isApiReady() : false;
    const quantumReady = dockerRunning ? await docker.isQuantumReady() : false;
    const authStatus = isAuthenticated();
    setStatus({ dockerRunning, apiReady, quantumReady, authStatus, checking: false });
  };

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const dataDir = config.get('dataDir') || '~/opencern-datasets';
  const shortDir = dataDir.replace(process.env.HOME || '', '~');

  return (
    <Box
      paddingLeft={2}
      paddingRight={2}
      paddingTop={0}
      paddingBottom={0}
      flexDirection="row"
      justifyContent="space-between"
      flexShrink={0}
    >
      {/* Left: directory */}
      <Text color={theme.textMuted}>{shortDir}</Text>

      {/* Right: status indicators */}
      <Box gap={2} flexDirection="row" flexShrink={0}>
        {/* Docker status */}
        <Text color={theme.text}>
          <Text color={status.checking ? theme.textMuted : status.dockerRunning ? theme.success : theme.error}>
            {'● '}
          </Text>
          Docker
        </Text>

        {/* API status */}
        <Text color={theme.text}>
          <Text color={status.checking ? theme.textMuted : status.apiReady ? theme.success : theme.error}>
            {'● '}
          </Text>
          API
        </Text>

        {/* Quantum status */}
        {status.quantumReady && (
          <Text color={theme.text}>
            <Text color={theme.success}>{'● '}</Text>
            Quantum
          </Text>
        )}

        {/* Auth */}
        {status.authStatus && (
          <Text color={theme.text}>
            <Text color={theme.success}>{'● '}</Text>
            Auth
          </Text>
        )}

        {/* Separator + Version */}
        <Text color={theme.textMuted}>v1.0.0-beta.1</Text>
      </Box>
    </Box>
  );
}

export default StatusBar;

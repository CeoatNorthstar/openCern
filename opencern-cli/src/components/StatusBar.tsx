// SPDX-License-Identifier: MIT
// Copyright (c) 2026 OpenCERN Contributors

import React, { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { docker } from '../services/docker.js';
import { config } from '../utils/config.js';
import { isAuthenticated } from '../utils/auth.js';

interface StatusState {
  dockerRunning: boolean;
  apiReady: boolean;
  quantumReady: boolean;
  authStatus: boolean;
  checking: boolean;
}

export function StatusBar(): React.JSX.Element {
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
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  const model = config.get('defaultModel');
  const shortModel = model.replace('claude-', '').replace(/-\d{8}$/, '');

  // Status indicators — clean unicode, no emojis
  const dot = (ok: boolean, checking: boolean) =>
    checking ? '~' : ok ? '+' : '-';

  const dockerColor = status.checking ? 'yellow' : status.dockerRunning ? 'green' : 'red';
  const apiColor = status.checking ? 'yellow' : status.apiReady ? 'green' : 'red';
  const quantumColor = status.quantumReady ? 'green' : 'gray';
  const authColor = status.authStatus ? 'green' : 'yellow';

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" justifyContent="space-between" paddingX={2}>
        <Box gap={1}>
          <Text bold color="cyan">opencern</Text>
          <Text color="gray" dimColor>|</Text>
          <Text color={dockerColor}>docker {dot(status.dockerRunning, status.checking)}</Text>
          <Text color="gray" dimColor>|</Text>
          <Text color={apiColor}>api {dot(status.apiReady, status.checking)}</Text>
          <Text color="gray" dimColor>|</Text>
          <Text color={quantumColor}>qc {dot(status.quantumReady, status.checking)}</Text>
          <Text color="gray" dimColor>|</Text>
          <Text color={authColor}>{status.authStatus ? 'authenticated' : 'not signed in'}</Text>
        </Box>
        <Text color="gray" dimColor>{shortModel}</Text>
      </Box>
      <Text color="gray" dimColor>{'  ' + '─'.repeat(76)}</Text>
    </Box>
  );
}

export default StatusBar;

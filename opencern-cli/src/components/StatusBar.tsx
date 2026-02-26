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
  const shortModel = model.replace('claude-', '').replace(/-4-\d.*/, ' 4.x');

  const dockerColor = status.checking ? 'yellow' : status.dockerRunning ? 'green' : 'red';
  const dockerLabel = status.checking ? '...' : status.dockerRunning ? '✓' : '✗';

  const apiColor = status.checking ? 'yellow' : status.apiReady ? 'green' : 'red';
  const apiLabel = status.checking ? '...' : status.apiReady ? '✓' : '✗';

  const quantumLabel = status.quantumReady ? config.get('quantumBackend') : 'offline';
  const quantumColor = status.quantumReady ? 'green' : 'gray';

  const authLabel = status.authStatus ? 'signed in' : 'not signed in';
  const authColor = status.authStatus ? 'green' : 'yellow';

  return (
    <Box
      borderStyle="single"
      borderColor="gray"
      paddingX={1}
      flexDirection="row"
      justifyContent="space-between"
    >
      <Box gap={1}>
        <Text bold color="cyan">opencern</Text>
        <Text color="gray">│</Text>
        <Text color={dockerColor}>Docker {dockerLabel}</Text>
        <Text color="gray">│</Text>
        <Text color={apiColor}>API {apiLabel}</Text>
        <Text color="gray">│</Text>
        <Text color={quantumColor}>Quantum: {quantumLabel}</Text>
        <Text color="gray">│</Text>
        <Text color={authColor}>{authLabel}</Text>
      </Box>
      <Box>
        <Text color="gray" dimColor>{shortModel}</Text>
      </Box>
    </Box>
  );
}

export default StatusBar;

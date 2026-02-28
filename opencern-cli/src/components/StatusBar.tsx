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

  const dockerText = status.checking ? 'DOCKER ~' : status.dockerRunning ? 'DOCKER √' : 'DOCKER X';
  const apiText = status.checking ? 'API ~' : status.apiReady ? 'API √' : 'API X';
  const quantumText = status.checking ? 'QC ~' : status.quantumReady ? 'QC √' : 'QC X';
  const authText = status.authStatus ? 'AUTH √' : 'AUTH X';

  return (
    <Box flexDirection="row" justifyContent="space-between" paddingX={2} paddingY={0} borderStyle="single" borderBottom>
      <Box gap={1} alignItems="center">
        <Text backgroundColor="white" color="black" bold> OPENCERN </Text>
        <Text dimColor>│</Text>
        <Text bold={status.dockerRunning} dimColor={!status.dockerRunning}>{dockerText}</Text>
        <Text dimColor>│</Text>
        <Text bold={status.apiReady} dimColor={!status.apiReady}>{apiText}</Text>
        <Text dimColor>│</Text>
        <Text bold={status.quantumReady} dimColor={!status.quantumReady}>{quantumText}</Text>
        <Text dimColor>│</Text>
        <Text bold={status.authStatus} dimColor={!status.authStatus}>{authText}</Text>
      </Box>
      <Box alignItems="center">
        <Text backgroundColor="white" color="black" bold> {shortModel.toUpperCase()} </Text>
      </Box>
    </Box>
  );
}

export default StatusBar;

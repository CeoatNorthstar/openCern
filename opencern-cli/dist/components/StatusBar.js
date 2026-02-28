import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
// SPDX-License-Identifier: MIT
// Copyright (c) 2026 OpenCERN Contributors
import { useState, useEffect } from 'react';
import { Box, Text } from 'ink';
import { docker } from '../services/docker.js';
import { config } from '../utils/config.js';
import { isAuthenticated } from '../utils/auth.js';
export function StatusBar() {
    const [status, setStatus] = useState({
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
    return (_jsxs(Box, { flexDirection: "row", justifyContent: "space-between", paddingX: 2, paddingY: 0, borderStyle: "single", borderBottom: true, children: [_jsxs(Box, { gap: 1, alignItems: "center", children: [_jsx(Text, { backgroundColor: "white", color: "black", bold: true, children: " OPENCERN " }), _jsx(Text, { dimColor: true, children: "\u2502" }), _jsx(Text, { bold: status.dockerRunning, dimColor: !status.dockerRunning, children: dockerText }), _jsx(Text, { dimColor: true, children: "\u2502" }), _jsx(Text, { bold: status.apiReady, dimColor: !status.apiReady, children: apiText }), _jsx(Text, { dimColor: true, children: "\u2502" }), _jsx(Text, { bold: status.quantumReady, dimColor: !status.quantumReady, children: quantumText }), _jsx(Text, { dimColor: true, children: "\u2502" }), _jsx(Text, { bold: status.authStatus, dimColor: !status.authStatus, children: authText })] }), _jsx(Box, { alignItems: "center", children: _jsxs(Text, { backgroundColor: "white", color: "black", bold: true, children: [" ", shortModel.toUpperCase(), " "] }) })] }));
}
export default StatusBar;
//# sourceMappingURL=StatusBar.js.map
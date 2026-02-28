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
    // Status indicators — clean unicode, no emojis
    const dot = (ok, checking) => checking ? '~' : ok ? '+' : '-';
    const dockerColor = status.checking ? 'yellow' : status.dockerRunning ? 'green' : 'red';
    const apiColor = status.checking ? 'yellow' : status.apiReady ? 'green' : 'red';
    const quantumColor = status.quantumReady ? 'green' : 'gray';
    const authColor = status.authStatus ? 'green' : 'yellow';
    return (_jsxs(Box, { flexDirection: "row", justifyContent: "space-between", paddingX: 2, paddingY: 0, borderStyle: "single", borderBottom: true, borderColor: "gray", children: [_jsxs(Box, { gap: 1, alignItems: "center", children: [_jsx(Text, { backgroundColor: "cyan", color: "black", bold: true, children: " OPENCERN " }), _jsx(Text, { color: "gray", dimColor: true, children: "\u2502" }), _jsxs(Text, { color: dockerColor, children: ["docker ", dot(status.dockerRunning, status.checking)] }), _jsx(Text, { color: "gray", dimColor: true, children: "\u2502" }), _jsxs(Text, { color: apiColor, children: ["api ", dot(status.apiReady, status.checking)] }), _jsx(Text, { color: "gray", dimColor: true, children: "\u2502" }), _jsxs(Text, { color: quantumColor, children: ["qc ", dot(status.quantumReady, status.checking)] }), _jsx(Text, { color: "gray", dimColor: true, children: "\u2502" }), _jsx(Text, { color: authColor, children: status.authStatus ? 'authenticated' : 'not signed in' })] }), _jsx(Box, { alignItems: "center", children: _jsxs(Text, { backgroundColor: "blue", color: "white", bold: true, children: [" ", shortModel, " "] }) })] }));
}
export default StatusBar;
//# sourceMappingURL=StatusBar.js.map
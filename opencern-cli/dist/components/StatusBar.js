import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const shortModel = model.replace('claude-', '').replace(/-4-\d.*/, ' 4.x');
    const dockerColor = status.checking ? 'yellow' : status.dockerRunning ? 'green' : 'red';
    const dockerLabel = status.checking ? '...' : status.dockerRunning ? '✓' : '✗';
    const apiColor = status.checking ? 'yellow' : status.apiReady ? 'green' : 'red';
    const apiLabel = status.checking ? '...' : status.apiReady ? '✓' : '✗';
    const quantumLabel = status.quantumReady ? config.get('quantumBackend') : 'offline';
    const quantumColor = status.quantumReady ? 'green' : 'gray';
    const authLabel = status.authStatus ? 'signed in' : 'not signed in';
    const authColor = status.authStatus ? 'green' : 'yellow';
    return (_jsxs(Box, { borderStyle: "single", borderColor: "gray", paddingX: 1, flexDirection: "row", justifyContent: "space-between", children: [_jsxs(Box, { gap: 1, children: [_jsx(Text, { bold: true, color: "cyan", children: "opencern" }), _jsx(Text, { color: "gray", children: "\u2502" }), _jsxs(Text, { color: dockerColor, children: ["Docker ", dockerLabel] }), _jsx(Text, { color: "gray", children: "\u2502" }), _jsxs(Text, { color: apiColor, children: ["API ", apiLabel] }), _jsx(Text, { color: "gray", children: "\u2502" }), _jsxs(Text, { color: quantumColor, children: ["Quantum: ", quantumLabel] }), _jsx(Text, { color: "gray", children: "\u2502" }), _jsx(Text, { color: authColor, children: authLabel })] }), _jsx(Box, { children: _jsx(Text, { color: "gray", dimColor: true, children: shortModel }) })] }));
}
export default StatusBar;
//# sourceMappingURL=StatusBar.js.map
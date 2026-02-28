import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Copyright (c) 2026 OpenCERN. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL — Enterprise Component
 * Unauthorized copying, modification, or distribution is strictly prohibited.
 * See LICENSE.enterprise for full terms.
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text, useApp, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';
import { StatusBar } from './components/StatusBar.js';
import { Prompt } from './components/Prompt.js';
import { AIStream } from './components/AIStream.js';
import { ProgressBar } from './components/ProgressBar.js';
import { FilePreview } from './components/FilePreview.js';
import { QuantumPanel } from './components/QuantumPanel.js';
import { config } from './utils/config.js';
import { add as addHistory, getAll as getAllHistory } from './utils/history.js';
import { isAuthenticated } from './utils/auth.js';
import { docker } from './services/docker.js';
import { anthropicService } from './services/anthropic.js';
import { getHelpText } from './commands/help.js';
import { getSystemStatus, formatStatus } from './commands/status.js';
import { runDoctorChecks, formatDoctorResults } from './commands/doctor.js';
import { login, logout } from './commands/auth.js';
import { showConfig, getConfigItems, resetConfig, getKeyStatus, setApiKey, removeApiKey } from './commands/config.js';
import { checkForUpdates, updateDockerImages } from './commands/update.js';
import { openFile } from './commands/open.js';
import { openAndAsk } from './commands/opask.js';
import { extractEvents, runClassification, ensureQuantumRunning } from './commands/quantum.js';
import { openViz, renderASCII } from './commands/viz.js';
import { quantumService } from './services/quantum.js';
function App() {
    const { exit } = useApp();
    const abortRef = useRef(null);
    const approvalResolveRef = useRef(null);
    const [state, setState] = useState({
        view: 'home',
        output: [],
        isLoading: false,
        loadingMsg: '',
        promptDisabled: false,
        aiTokens: '',
        aiStreaming: false,
        pendingTool: null,
        toolResults: [],
        quantumRunning: false,
        configIndex: 0,
        configValue: '',
    });
    // Fullscreen responsive sizing
    const { stdout } = useStdout();
    const [size, setSize] = useState({
        columns: stdout.columns || 80,
        rows: stdout.rows || 24
    });
    useEffect(() => {
        const onResize = () => setSize({ columns: stdout.columns, rows: stdout.rows });
        stdout.on('resize', onResize);
        return () => { stdout.off('resize', onResize); };
    }, [stdout]);
    function addOutput(lines, color, bold) {
        const arr = Array.isArray(lines) ? lines : [lines];
        setState(s => ({
            ...s,
            output: [...s.output, ...arr.map(text => ({ text, color, bold }))],
        }));
    }
    function clearOutput() {
        setState(s => ({ ...s, output: [] }));
    }
    function setLoading(loading, msg = '') {
        setState(s => ({ ...s, isLoading: loading, loadingMsg: msg, promptDisabled: loading }));
    }
    // Approve/deny handler for agentic tool calls
    const handleApprove = useCallback(() => {
        if (approvalResolveRef.current) {
            approvalResolveRef.current(true);
            approvalResolveRef.current = null;
            setState(s => ({ ...s, pendingTool: null }));
        }
    }, []);
    const handleDeny = useCallback(() => {
        if (approvalResolveRef.current) {
            approvalResolveRef.current(false);
            approvalResolveRef.current = null;
            setState(s => ({ ...s, pendingTool: null }));
        }
    }, []);
    // Global keyboard shortcuts
    useInput((input, key) => {
        // Ctrl+D = exit
        if (key.ctrl && input === 'd') {
            exit();
            return;
        }
        // Ctrl+L = clear
        if (key.ctrl && input === 'l') {
            clearOutput();
            return;
        }
        // Escape = cancel streaming / deny tool
        if (key.escape) {
            if (state.pendingTool) {
                handleDeny();
                return;
            }
            if (state.aiStreaming) {
                abortRef.current?.abort();
                setState(s => ({ ...s, aiStreaming: false }));
                return;
            }
            if (state.view !== 'home') {
                setState(s => ({ ...s, view: 'home', fileContent: undefined, aiTokens: '' }));
            }
            return;
        }
        // Enter = approve tool (when pending)
        if (key.return && state.pendingTool) {
            handleApprove();
            return;
        }
    });
    // Startup sequence
    useEffect(() => {
        const firstRun = config.isFirstRun();
        config.load();
        if (firstRun) {
            addOutput([
                '   _____                 _____________  _   __',
                '  / __  /___  ___  ____ / ____/ ____/ |/ / _ \\/ |/ /',
                ' / / / / __ \\/ _ \\/ __ \\/ /   / __/ / _  /  _  /   / ',
                ' \\/_/ / .___/\\___/_/ /_/\\____/\\____/_/ |_/_/ |_/_/|_/  ',
                '     /_/                                              ',
                '',
                '  Welcome to OpenCERN CLI — Autonomous Mode',
                '  AI-powered particle physics analysis and quantum computing',
                '',
                '  Run /config to configure your API keys.',
                '  Run /help to see all available commands.',
                '',
            ], undefined, true);
        }
        else {
            addOutput([
                '   _____                 _____________  _   __',
                '  / __  /___  ___  ____ / ____/ ____/ |/ / _ \\/ |/ /',
                ' / / / / __ \\/ _ \\/ __ \\/ /   / __/ / _  /  _  /   / ',
                ' \\/_/ / .___/\\___/_/ /_/\\____/\\____/_/ |_/_/ |_/_/|_/  ',
                '     /_/                                              ',
                '',
                '  OpenCERN Engine Ready — Autonomous Mode',
                '  Type / for commands or ask a physics question',
                '',
            ], undefined, true);
        }
        // Check Docker in background
        if (config.get('autoStartDocker')) {
            (async () => {
                const running = docker.isDockerRunning();
                if (running) {
                    const present = docker.areImagesPresent();
                    if (!present) {
                        addOutput('  missing required engine images. pulling from GHCR (this may take a minute)...', 'cyan');
                        try {
                            await docker.pullImages();
                            addOutput('  [+] engine downloaded successfully', 'green');
                        }
                        catch (err) {
                            addOutput(`  [-] failed to pull engine: ${err.message}`, 'red');
                            return;
                        }
                    }
                    else {
                        // Check for updates asynchronously
                        docker.checkForUpdates().then(hasUpdate => {
                            if (hasUpdate) {
                                addOutput('', 'gray');
                                addOutput('  [*] An update is available for the OpenCERN engine!', 'cyan', true);
                                addOutput('      Run "/update" to download the latest version.', 'cyan');
                            }
                        }).catch(() => { });
                    }
                    const ready = await docker.isApiReady();
                    if (!ready) {
                        addOutput('  starting containers...', 'gray');
                        try {
                            await docker.startContainers();
                            addOutput('  [+] containers started', 'green');
                        }
                        catch (err) {
                            addOutput(`  [-] could not start containers: ${err.message}`, 'yellow');
                        }
                    }
                }
                else {
                    addOutput('  [!] Docker Desktop is not running. Core features will be disabled.', 'yellow');
                }
            })();
        }
        if (!isAuthenticated()) {
            addOutput('  run /login to sign in and unlock all features', 'yellow');
        }
    }, []);
    // ─── Agentic AI handler ──────────────────────────────────────────
    async function runAgenticQuery(question) {
        setState(s => ({
            ...s,
            view: 'ask',
            aiTokens: '',
            aiStreaming: true,
            promptDisabled: true,
            pendingTool: null,
            toolResults: [],
        }));
        abortRef.current = new AbortController();
        const start = Date.now();
        try {
            await anthropicService.agenticStream(question, (event) => {
                switch (event.type) {
                    case 'text':
                        setState(s => ({ ...s, aiTokens: s.aiTokens + (event.text || '') }));
                        break;
                    case 'tool_call':
                        if (event.toolCall) {
                            setState(s => ({ ...s, pendingTool: event.toolCall }));
                        }
                        break;
                    case 'tool_result':
                        if (event.toolResult) {
                            setState(s => ({
                                ...s,
                                toolResults: [...s.toolResults, event.toolResult],
                            }));
                        }
                        break;
                    case 'done':
                        setState(s => ({
                            ...s,
                            aiStreaming: false,
                            aiTokenCount: event.totalTokens,
                            aiLatency: Date.now() - start,
                            promptDisabled: false,
                        }));
                        break;
                    case 'error':
                        addOutput(`  [err] ${event.error}`, 'red');
                        setState(s => ({ ...s, aiStreaming: false, promptDisabled: false }));
                        break;
                }
            }, 
            // Human-in-the-loop approval callback
            async (toolCall) => {
                return new Promise((resolve) => {
                    approvalResolveRef.current = resolve;
                    setState(s => ({ ...s, pendingTool: toolCall }));
                });
            }, abortRef.current.signal);
        }
        catch (err) {
            setState(s => ({ ...s, aiStreaming: false, promptDisabled: false }));
            if (err.message.includes('API key')) {
                addOutput([
                    '  Anthropic API key not configured.',
                    '  Run /config or /keys set anthropic <key>',
                ], 'yellow');
            }
            else {
                addOutput(`  [err] ${err.message}`, 'red');
            }
        }
    }
    // ─── Command Router ────────────────────────────────────────────────
    async function handleInput(raw) {
        const input = raw.trim();
        if (!input)
            return;
        addHistory(input);
        const parts = input.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        const argStr = args.join(' ');
        switch (cmd) {
            case '/exit':
            case 'exit':
            case 'quit':
                exit();
                return;
            case '/clear':
            case 'clear':
                clearOutput();
                return;
            case '/help':
            case 'help':
                setState(s => ({ ...s, view: 'help' }));
                addOutput(getHelpText());
                return;
            case '/history': {
                const hist = getAllHistory().slice(0, 20);
                addOutput(['', '  Recent commands:']);
                hist.forEach((entry, i) => addOutput(`  ${String(i + 1).padStart(3)}. ${entry.command}`, 'gray'));
                addOutput('');
                return;
            }
            case '/status': {
                setState(s => ({ ...s, view: 'status' }));
                setLoading(true, 'checking system status...');
                try {
                    const status = await getSystemStatus();
                    setLoading(false);
                    addOutput(formatStatus(status));
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [err] ${err.message}`, 'red');
                }
                return;
            }
            case '/doctor': {
                setState(s => ({ ...s, view: 'doctor' }));
                setLoading(true, 'running diagnostics...');
                try {
                    const checks = await runDoctorChecks();
                    setLoading(false);
                    addOutput(formatDoctorResults(checks));
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [err] ${err.message}`, 'red');
                }
                return;
            }
            case '/config': {
                if (args.includes('--show')) {
                    addOutput(showConfig());
                    return;
                }
                if (args.includes('--reset')) {
                    resetConfig();
                    addOutput('  [+] configuration reset to defaults', 'green');
                    return;
                }
                const items = getConfigItems();
                setState(s => ({ ...s, view: 'config-wizard', configItems: items, configIndex: 0, configValue: '' }));
                addOutput(['', '  Configuration', '  ────────────────────────────────────────']);
                addOutput(`  ${items[0].label}: ${items[0].description}`, 'cyan');
                addOutput(`  current: ${items[0].current || 'not set'}`, 'gray');
                addOutput(`  enter new value (or press Enter to keep current):`, 'gray');
                addOutput('');
                return;
            }
            // ─── Key Management ──────────────────────────────────────────
            case '/keys': {
                if (args.length === 0) {
                    addOutput(getKeyStatus());
                    return;
                }
                const subCmd = args[0];
                if (subCmd === 'set' && args.length >= 3) {
                    const result = setApiKey(args[1], args.slice(2).join(' '));
                    addOutput(`  ${result.success ? '[+]' : '[err]'} ${result.message}`, result.success ? 'green' : 'red');
                    return;
                }
                if (subCmd === 'remove' && args.length >= 2) {
                    const result = removeApiKey(args[1]);
                    addOutput(`  ${result.success ? '[+]' : '[err]'} ${result.message}`, result.success ? 'green' : 'red');
                    return;
                }
                addOutput([
                    '  Usage:',
                    '    /keys                      show all keys',
                    '    /keys set <provider> <key>  store a key',
                    '    /keys remove <provider>     remove a key',
                    '',
                    '  Providers: anthropic, ibm-quantum',
                ], 'gray');
                return;
            }
            // ─── Model Management ────────────────────────────────────────
            case '/models': {
                setLoading(true, 'fetching models from Anthropic...');
                try {
                    const models = await anthropicService.listModels();
                    setLoading(false);
                    const current = config.get('defaultModel');
                    addOutput(['', '  Available Models', '  ────────────────────────────────────────']);
                    for (const m of models) {
                        const active = m.id === current ? ' (active)' : '';
                        addOutput(`  ${m.id}${active}`, m.id === current ? 'cyan' : 'gray');
                    }
                    addOutput(['', '  Switch model: /model <id>', '']);
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [err] ${err.message}`, 'red');
                }
                return;
            }
            case '/model': {
                if (!argStr) {
                    addOutput(`  current model: ${config.get('defaultModel')}`, 'cyan');
                    addOutput('  switch with: /model <model-id>');
                    return;
                }
                config.set('defaultModel', argStr);
                addOutput(`  [+] model set to ${argStr}`, 'green');
                return;
            }
            // ─── Usage Stats ─────────────────────────────────────────────
            case '/usage': {
                addOutput(anthropicService.getUsageFormatted());
                return;
            }
            // ─── Auth ─────────────────────────────────────────────────────
            case '/login': {
                setState(s => ({ ...s, view: 'login' }));
                setLoading(true, 'initializing login...');
                try {
                    const result = await login((code, url) => {
                        setLoading(false);
                        addOutput([
                            '',
                            '  opening browser for authentication...',
                            `  if it doesn't open, visit: ${url}`,
                            '',
                            `  your code: ${code}`,
                            '',
                        ]);
                        setState(s => ({ ...s, isLoading: true, loadingMsg: 'waiting for authorization...' }));
                    }, () => {
                        setState(s => ({ ...s, isLoading: true, loadingMsg: 'waiting for authorization...' }));
                    });
                    setLoading(false);
                    if (result.success) {
                        addOutput([
                            `  [+] signed in${result.username ? ` as ${result.username}` : ''}`,
                            '  [+] token stored in system keychain',
                            '',
                        ], 'green');
                    }
                    else {
                        addOutput(`  [-] login failed: ${result.error}`, 'red');
                    }
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [-] login error: ${err.message}`, 'red');
                }
                setState(s => ({ ...s, view: 'home' }));
                return;
            }
            case '/logout': {
                try {
                    await logout();
                    addOutput('  [+] signed out', 'green');
                }
                catch (err) {
                    addOutput(`  [-] logout error: ${err.message}`, 'red');
                }
                return;
            }
            case '/update': {
                setLoading(true, 'checking for updates...');
                try {
                    const info = await checkForUpdates();
                    setLoading(false);
                    if (info.hasUpdate) {
                        addOutput([
                            `  update available: v${info.currentVersion} -> v${info.latestVersion}`,
                            '  run: npm install -g @opencern/cli',
                            '',
                            '  pulling latest Docker images...',
                        ], 'cyan');
                        setLoading(true, 'pulling Docker images...');
                        await updateDockerImages(img => {
                            setState(s => ({ ...s, loadingMsg: `pulling ${img}...` }));
                        });
                        setLoading(false);
                        addOutput('  [+] Docker images updated', 'green');
                    }
                    else {
                        addOutput(`  [+] already up to date (v${info.currentVersion})`, 'green');
                    }
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [-] update error: ${err.message}`, 'red');
                }
                return;
            }
            case '/open': {
                const fileArg = argStr.replace('--json', '').replace('--root', '').trim();
                if (!fileArg) {
                    addOutput('  usage: /open <file.json|file.root>', 'yellow');
                    return;
                }
                setLoading(true, `opening ${fileArg}...`);
                try {
                    const fileContent = await openFile(fileArg);
                    setLoading(false);
                    setState(s => ({ ...s, view: 'open', fileContent }));
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [-] ${err.message}`, 'red');
                }
                return;
            }
            case '/opask': {
                const fileArg = argStr.trim();
                if (!fileArg) {
                    addOutput('  usage: /opask <file.json>', 'yellow');
                    return;
                }
                setState(s => ({ ...s, view: 'opask', aiTokens: '', aiStreaming: true }));
                abortRef.current = new AbortController();
                try {
                    const { file, totalTokens } = await openAndAsk(fileArg, token => setState(s => ({ ...s, aiTokens: s.aiTokens + token })), abortRef.current.signal);
                    setState(s => ({
                        ...s,
                        fileContent: file,
                        aiStreaming: false,
                        aiTokenCount: totalTokens,
                        promptDisabled: false,
                    }));
                }
                catch (err) {
                    setState(s => ({ ...s, aiStreaming: false, promptDisabled: false }));
                    addOutput(`  [-] ${err.message}`, 'red');
                }
                return;
            }
            case '/ask': {
                const question = argStr || 'What can you tell me about this dataset?';
                const fileIdx = args.indexOf('--file');
                const filePath = fileIdx >= 0 ? args[fileIdx + 1] : undefined;
                const cleanQuestion = question.replace('--file', '').replace(filePath || '', '').trim();
                await runAgenticQuery(cleanQuestion || question);
                return;
            }
            case '/quantum': {
                const subCmd = args[0];
                const fileArg = args.find(a => !a.startsWith('-')) || args[1];
                if (subCmd === 'status') {
                    setLoading(true, 'checking quantum backend...');
                    const status = await quantumService.getStatus();
                    setLoading(false);
                    addOutput([
                        '',
                        `  quantum backend: ${status.backend}`,
                        `  status: ${status.healthy ? 'healthy' : 'offline'}`,
                        '',
                    ], status.healthy ? 'green' : 'yellow');
                    return;
                }
                const targetFile = fileArg || '';
                if (!targetFile) {
                    addOutput('  usage: /quantum classify <file.json>', 'yellow');
                    return;
                }
                setState(s => ({ ...s, view: 'quantum', quantumRunning: true, quantumJob: undefined }));
                setLoading(true, 'checking quantum container...');
                const qReady = await ensureQuantumRunning();
                if (!qReady) {
                    setLoading(false);
                    setState(s => ({ ...s, quantumRunning: false }));
                    addOutput('  [-] quantum container not available. ensure Docker is running.', 'red');
                    return;
                }
                try {
                    const events = extractEvents(targetFile);
                    addOutput(`  extracted ${events.length} events from ${targetFile}`, 'gray');
                    const circuit = await quantumService.getCircuitDiagram(4, 6);
                    setState(s => ({ ...s, quantumCircuit: circuit, quantumBackend: config.get('quantumBackend') }));
                    setLoading(false);
                    const finalJob = await runClassification(events, job => {
                        setState(s => ({ ...s, quantumJob: job }));
                    });
                    setState(s => ({ ...s, quantumRunning: false, quantumJob: finalJob }));
                    if (finalJob.results) {
                        addOutput([
                            '',
                            `  quantum classification complete`,
                            `  signal events: ${finalJob.results.signalCount} (${(finalJob.results.signalProbability * 100).toFixed(1)}%)`,
                            `  background: ${finalJob.results.backgroundCount}`,
                            `  fidelity: ${finalJob.results.fidelity.toFixed(3)}`,
                            '',
                        ], 'green');
                    }
                }
                catch (err) {
                    setLoading(false);
                    setState(s => ({ ...s, quantumRunning: false }));
                    addOutput(`  [-] ${err.message}`, 'red');
                }
                return;
            }
            case '/viz': {
                const fileArg = args.find(a => !a.startsWith('-')) || '';
                const forceBrowser = args.includes('--browser');
                if (!fileArg) {
                    addOutput('  usage: /viz <file.json>', 'yellow');
                    return;
                }
                const result = openViz(fileArg, forceBrowser);
                addOutput(`  ${result.message}`, result.method === 'ascii' ? 'yellow' : 'green');
                if (result.method === 'ascii') {
                    addOutput(renderASCII(fileArg));
                }
                return;
            }
            case '/download': {
                const query = argStr.trim() || 'Higgs Boson';
                setLoading(true, `searching datasets for "${query}"...`);
                try {
                    const { searchDatasets, startDownload, pollDownload } = await import('./commands/download.js');
                    const datasets = await searchDatasets(query);
                    if (datasets.length === 0) {
                        setLoading(false);
                        addOutput(`  [-] no datasets found matching "${query}"`);
                        return;
                    }
                    const target = datasets[0];
                    setLoading(true, `starting download for ${target.title}...`);
                    const dlId = await startDownload(target);
                    await pollDownload(dlId, (dlStatus) => {
                        setState(s => ({ ...s, loadingMsg: `downloading ${target.id}: ${(dlStatus.progress * 100).toFixed(0)}%` }));
                    });
                    setLoading(false);
                    addOutput([
                        '',
                        `  [+] DOWNLOAD COMPLETE: ${target.id}`,
                        `  TITLE: ${target.title}`,
                        `  SIZE:  ${(target.size / 1e9).toFixed(2)} GB`,
                        '',
                    ]);
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [-] API error: ${err.message}. ensure docker is running.`);
                }
                return;
            }
            case '/process': {
                const fileArg = argStr.trim();
                if (!fileArg) {
                    addOutput('  usage: /process <file.root>');
                    return;
                }
                setLoading(true, `processing ${fileArg} via api container...`);
                try {
                    const { processFile, pollProcess, formatEventSummary } = await import('./commands/process.js');
                    const procId = await processFile(fileArg);
                    const finalStatus = await pollProcess(procId, (pStatus) => {
                        setState(s => ({ ...s, loadingMsg: `processing... ${(pStatus.progress * 100).toFixed(0)}%` }));
                    });
                    setLoading(false);
                    addOutput([
                        '',
                        `  [+] PROCESSING COMPLETE: ${fileArg}`,
                        ...formatEventSummary(finalStatus.results),
                        '',
                    ]);
                }
                catch (err) {
                    setLoading(false);
                    addOutput(`  [-] process error: ${err.message}. is the api ready?`);
                }
                return;
            }
            default: {
                // Free-form question -> agentic AI
                if (!input.startsWith('/')) {
                    await runAgenticQuery(input);
                    return;
                }
                addOutput(`  unknown command: ${cmd}. type /help for available commands.`, 'yellow');
                return;
            }
        }
    }
    const { output, isLoading, loadingMsg, view, aiTokens, aiStreaming, aiTokenCount, aiLatency, pendingTool, toolResults, fileContent, progress, quantumJob, quantumRunning, quantumBackend, quantumCircuit, promptDisabled } = state;
    const model = config.get('defaultModel');
    return (_jsxs(Box, { width: size.columns, height: size.rows, flexDirection: "column", borderStyle: "round", borderColor: "blue", paddingX: 1, paddingY: 0, children: [_jsx(StatusBar, {}), _jsx(Box, { flexDirection: "column", flexGrow: 1, paddingX: 2, paddingY: 1, overflowY: "hidden", justifyContent: "flex-end" // Pushes text down like a real terminal
                , children: _jsx(Box, { flexDirection: "column", children: output.slice(-(size.rows - 15)).map((line, i) => (_jsx(Text, { color: line.color || 'white', bold: line.bold, children: line.text }, i))) }) }), (view === 'ask' || view === 'opask') && (aiTokens || aiStreaming || pendingTool) && (_jsxs(Box, { flexDirection: view === 'opask' ? 'row' : 'column', paddingX: 1, children: [_jsx(Box, { flexDirection: "column", flexGrow: 1, children: _jsx(AIStream, { tokens: aiTokens, isStreaming: aiStreaming, onCancel: () => { abortRef.current?.abort(); setState(s => ({ ...s, aiStreaming: false })); }, model: model, tokenCount: aiTokenCount, latency: aiLatency, pendingTool: pendingTool, toolResults: toolResults, onApprove: handleApprove, onDeny: handleDeny }) }), view === 'opask' && fileContent && (_jsx(Box, { flexDirection: "column", flexGrow: 1, marginLeft: 2, children: _jsx(FilePreview, { content: fileContent.content, filename: fileContent.filename, size: fileContent.size, fileType: fileContent.fileType, focused: false }) }))] })), view === 'open' && fileContent && (_jsx(Box, { paddingX: 1, children: _jsx(FilePreview, { content: fileContent.content, filename: fileContent.filename, size: fileContent.size, fileType: fileContent.fileType, onClose: () => setState(s => ({ ...s, view: 'home', fileContent: undefined })) }) })), view === 'quantum' && (_jsx(Box, { paddingX: 1, children: _jsx(QuantumPanel, { job: quantumJob, isRunning: quantumRunning, backend: quantumBackend, circuitDiagram: quantumCircuit }) })), progress && (_jsx(Box, { paddingX: 1, children: _jsx(ProgressBar, { label: progress.label, percent: progress.percent, speed: progress.speed, eta: progress.eta, mode: progress.mode }) })), isLoading && (_jsxs(Box, { paddingX: 1, children: [_jsx(Text, { color: "blue", children: _jsx(Spinner, { type: "dots" }) }), _jsxs(Text, { color: "gray", children: ["  ", loadingMsg] })] })), _jsx(Box, { paddingX: 1, marginTop: 1, borderStyle: "round", borderColor: "cyan", paddingY: 0, children: _jsx(Prompt, { onSubmit: handleInput, disabled: promptDisabled, placeholder: promptDisabled ? (pendingTool ? 'Enter to approve, Esc to skip' : 'Processing... (Esc to cancel)') : undefined }) })] }));
}
export async function startApp() {
    // Enter alternate screen buffer (like vim) to clear scrollback and act fully native
    process.stdout.write('\x1b[?1049h');
    try {
        const { waitUntilExit } = render(_jsx(App, {}), { exitOnCtrlC: false });
        await waitUntilExit();
    }
    finally {
        // Leave alternate screen buffer on exit
        process.stdout.write('\x1b[?1049l');
    }
}
export default App;
//# sourceMappingURL=app.js.map
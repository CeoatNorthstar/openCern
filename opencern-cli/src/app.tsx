import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { render, Box, Text, useApp, useInput, useStdout } from 'ink';
import Spinner from 'ink-spinner';

import { StatusBar } from './components/StatusBar.js';
import { Prompt } from './components/Prompt.js';
import { CommandPalette } from './components/CommandPalette.js';
import { AIStream } from './components/AIStream.js';
import { ProgressBar } from './components/ProgressBar.js';
import { FilePreview } from './components/FilePreview.js';
import { QuantumPanel } from './components/QuantumPanel.js';
import { Tips } from './components/Tips.js';
import { ToastContainer, showToast } from './components/Toast.js';

import { logo, tagline } from './tui/logo.js';
import { getTheme } from './tui/theme.js';
import { useTerminalSize } from './tui/hooks.js';

import { config } from './utils/config.js';
import { add as addHistory, getAll as getAllHistory } from './utils/history.js';
import { isAuthenticated } from './utils/auth.js';
import { docker } from './services/docker.js';
import { anthropicService } from './services/anthropic.js';

import { getHelpText } from './commands/help.js';
import { getSystemStatus, formatStatus } from './commands/status.js';
import { runDoctorChecks, formatDoctorResults } from './commands/doctor.js';
import { login, logout } from './commands/auth.js';
import { showConfig, getConfigItems, setConfigValue, resetConfig } from './commands/config.js';
import { checkForUpdates, updateDockerImages } from './commands/update.js';
import { openFile } from './commands/open.js';
import { openAndAsk } from './commands/opask.js';
import { askQuestion } from './commands/ask.js';
import { extractEvents, runClassification, ensureQuantumRunning } from './commands/quantum.js';
import { openViz, renderASCII } from './commands/viz.js';
import { quantumService } from './services/quantum.js';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type Route = 'home' | 'session';

type View =
  | 'home'
  | 'ask'
  | 'config'
  | 'config-wizard'
  | 'download'
  | 'process'
  | 'quantum'
  | 'open'
  | 'opask'
  | 'viz'
  | 'login'
  | 'status'
  | 'doctor'
  | 'update'
  | 'help'
  | 'history';

interface OutputLine {
  text: string;
  color?: string;
  bold?: boolean;
  dim?: boolean;
}

interface AppState {
  route: Route;
  view: View;
  output: OutputLine[];
  isLoading: boolean;
  loadingMsg: string;
  promptDisabled: boolean;
  showPalette: boolean;
  paletteQuery: string;

  // AI streaming
  aiTokens: string;
  aiStreaming: boolean;
  aiTokenCount?: number;
  aiLatency?: number;

  // File preview
  fileContent?: { content: string; filename: string; size: number; fileType: 'json' | 'text' | 'root-meta' };

  // Progress
  progress?: { label: string; percent: number; speed?: number; eta?: number; mode?: 'download' | 'process' | 'quantum' | 'upload' };

  // Quantum
  quantumJob?: import('./services/quantum.js').QuantumJob;
  quantumRunning: boolean;
  quantumBackend?: string;
  quantumCircuit?: string;

  // Login flow
  loginCode?: string;
  loginUrl?: string;

  // Config wizard
  configItems?: import('./commands/config.ts').ConfigItem[];
  configIndex: number;
  configValue: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Logo Component
// ─────────────────────────────────────────────────────────────────────────────

function Logo(): React.JSX.Element {
  const theme = getTheme();
  return (
    <Box flexDirection="column" alignItems="center">
      {logo.left.map((line, i) => (
        <Box key={i} flexDirection="row" gap={1}>
          <Text color={theme.textMuted}>{line}</Text>
          <Text color={theme.text} bold>{logo.right[i]}</Text>
        </Box>
      ))}
      <Box marginTop={0}>
        <Text color={theme.textMuted} dimColor>{tagline}</Text>
      </Box>
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Home Route
// ─────────────────────────────────────────────────────────────────────────────

interface HomeRouteProps {
  onSubmit: (input: string) => void;
  onSlash: () => void;
  disabled: boolean;
  showPalette: boolean;
  paletteQuery: string;
  onPaletteSelect: (command: string) => void;
  onPaletteDismiss: () => void;
  isFirstRun: boolean;
}

function HomeRoute({
  onSubmit,
  onSlash,
  disabled,
  showPalette,
  paletteQuery,
  onPaletteSelect,
  onPaletteDismiss,
  isFirstRun,
}: HomeRouteProps): React.JSX.Element {
  const theme = getTheme();
  const model = config.get('defaultModel');
  const shortModel = model?.replace('claude-', '').replace(/-\d{8}$/, '') || 'not set';
  const provider = model?.includes('claude') ? 'anthropic' : '';

  return (
    <>
      {/* Main content area - vertically centered */}
      <Box flexGrow={1} flexDirection="column" alignItems="center" paddingLeft={2} paddingRight={2}>
        {/* Top spacer */}
        <Box flexGrow={1} minHeight={0} />

        {/* Breathing room above logo */}
        <Box height={2} minHeight={0} flexShrink={1} />

        {/* Logo */}
        <Box flexShrink={0}>
          <Logo />
        </Box>

        {/* Space between logo and prompt */}
        <Box height={2} minHeight={0} flexShrink={1} />

        {/* First run message */}
        {isFirstRun && (
          <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Text color={theme.info}>Welcome! Run /config to set up your API keys.</Text>
          </Box>
        )}

        {/* Not authenticated hint */}
        {!isFirstRun && !isAuthenticated() && (
          <Box flexDirection="column" alignItems="center" marginBottom={1}>
            <Text color={theme.textMuted}>
              Run <Text color={theme.text}>/login</Text> to sign in
            </Text>
          </Box>
        )}

        {/* Prompt area */}
        <Box width="100%" maxWidth={75} flexShrink={0}>
          {showPalette ? (
            <Box justifyContent="center">
              <CommandPalette
                query={paletteQuery}
                onSelect={onPaletteSelect}
                onDismiss={onPaletteDismiss}
                width={60}
              />
            </Box>
          ) : (
            <Prompt
              onSubmit={onSubmit}
              onSlash={onSlash}
              disabled={disabled}
              placeholder={disabled ? 'Processing... (Esc to cancel)' : undefined}
              agentName="Analyze"
              modelName={shortModel}
              providerName={provider}
            />
          )}
        </Box>

        {/* Tips area */}
        <Box height={3} minHeight={0} width="100%" maxWidth={75} alignItems="center" paddingTop={1} flexShrink={1}>
          {!isFirstRun && <Tips />}
        </Box>

        {/* Bottom spacer */}
        <Box flexGrow={1} minHeight={0} />

        {/* Toasts overlay */}
        <ToastContainer />
      </Box>

      {/* Footer */}
      <Box flexShrink={0} paddingTop={1} paddingBottom={1}>
        <StatusBar />
      </Box>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Session Route (active interaction)
// ─────────────────────────────────────────────────────────────────────────────

interface SessionRouteProps {
  state: AppState;
  onSubmit: (input: string) => void;
  onSlash: () => void;
  onCancelStream: () => void;
  onPaletteSelect: (command: string) => void;
  onPaletteDismiss: () => void;
  onCloseFile: () => void;
}

function SessionRoute({
  state,
  onSubmit,
  onSlash,
  onCancelStream,
  onPaletteSelect,
  onPaletteDismiss,
  onCloseFile,
}: SessionRouteProps): React.JSX.Element {
  const theme = getTheme();
  const model = config.get('defaultModel');
  const shortModel = model?.replace('claude-', '').replace(/-\d{8}$/, '') || '';
  const provider = model?.includes('claude') ? 'anthropic' : '';
  const { rows } = useTerminalSize();

  // Calculate available height for scrollable content
  const headerHeight = 3;
  const promptHeight = 6;
  const footerHeight = 2;
  const contentHeight = Math.max(rows - headerHeight - promptHeight - footerHeight, 5);

  return (
    <>
      {/* Header */}
      <Box
        flexShrink={0}
        paddingLeft={2}
        paddingRight={2}
        paddingTop={1}
        paddingBottom={0}
        flexDirection="row"
        justifyContent="space-between"
      >
        <Box flexDirection="row" gap={1}>
          <Text color={theme.primary} bold>┃</Text>
          <Text color={theme.text} bold>
            OpenCERN Session
          </Text>
        </Box>
        <Box flexDirection="row" gap={2}>
          {state.aiTokenCount !== undefined && (
            <Text color={theme.textMuted}>{state.aiTokenCount.toLocaleString()} tokens</Text>
          )}
          {state.aiLatency !== undefined && (
            <Text color={theme.textMuted}>{(state.aiLatency / 1000).toFixed(1)}s</Text>
          )}
        </Box>
      </Box>

      {/* Separator */}
      <Box paddingX={2} flexShrink={0}>
        <Text color={theme.borderSubtle}>{'─'.repeat(70)}</Text>
      </Box>

      {/* Scrollable content area */}
      <Box
        flexGrow={1}
        flexDirection="column"
        paddingX={2}
        overflow="hidden"
        height={contentHeight}
      >
        {/* Output lines */}
        {state.output.slice(-(contentHeight - 2)).map((line, i) => (
          <Text
            key={i}
            color={(line.color as never) || theme.text}
            bold={line.bold}
            dimColor={line.dim}
          >
            {line.text}
          </Text>
        ))}

        {/* AI streaming view */}
        {(state.view === 'ask' || state.view === 'opask') && (state.aiTokens || state.aiStreaming) && (
          <Box flexDirection={state.view === 'opask' ? 'row' : 'column'}>
            <Box flexDirection="column" flexGrow={1}>
              <AIStream
                tokens={state.aiTokens}
                isStreaming={state.aiStreaming}
                onCancel={onCancelStream}
                model={model}
                tokenCount={state.aiTokenCount}
                latency={state.aiLatency}
              />
            </Box>
            {state.view === 'opask' && state.fileContent && (
              <Box flexDirection="column" flexGrow={1} marginLeft={2}>
                <FilePreview
                  content={state.fileContent.content}
                  filename={state.fileContent.filename}
                  size={state.fileContent.size}
                  fileType={state.fileContent.fileType}
                  focused={false}
                />
              </Box>
            )}
          </Box>
        )}

        {/* File open view */}
        {state.view === 'open' && state.fileContent && (
          <FilePreview
            content={state.fileContent.content}
            filename={state.fileContent.filename}
            size={state.fileContent.size}
            fileType={state.fileContent.fileType}
            onClose={onCloseFile}
          />
        )}

        {/* Quantum view */}
        {state.view === 'quantum' && (
          <QuantumPanel
            job={state.quantumJob}
            isRunning={state.quantumRunning}
            backend={state.quantumBackend}
            circuitDiagram={state.quantumCircuit}
          />
        )}

        {/* Progress bar */}
        {state.progress && (
          <ProgressBar
            label={state.progress.label}
            percent={state.progress.percent}
            speed={state.progress.speed}
            eta={state.progress.eta}
            mode={state.progress.mode}
          />
        )}

        {/* Loading indicator */}
        {state.isLoading && (
          <Box gap={1}>
            <Text color={theme.primary}><Spinner type="dots" /></Text>
            <Text color={theme.textMuted}>{state.loadingMsg}</Text>
          </Box>
        )}
      </Box>

      {/* Command palette overlay */}
      {state.showPalette && (
        <Box justifyContent="center" paddingX={2}>
          <CommandPalette
            query={state.paletteQuery}
            onSelect={onPaletteSelect}
            onDismiss={onPaletteDismiss}
            width={60}
          />
        </Box>
      )}

      {/* Prompt */}
      <Box paddingX={2} flexShrink={0}>
        <Box width="100%">
          <Prompt
            onSubmit={onSubmit}
            onSlash={onSlash}
            disabled={state.promptDisabled}
            placeholder={state.promptDisabled ? 'Processing... (Esc to cancel)' : undefined}
            agentName="Analyze"
            modelName={shortModel}
            providerName={provider}
            showHints={!state.showPalette}
          />
        </Box>
      </Box>

      {/* Footer */}
      <Box flexShrink={0} paddingTop={0} paddingBottom={0}>
        <StatusBar />
      </Box>

      {/* Toasts overlay */}
      <ToastContainer />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main App
// ─────────────────────────────────────────────────────────────────────────────

function App(): React.JSX.Element {
  const { exit } = useApp();
  const abortRef = useRef<AbortController | null>(null);
  const { columns, rows } = useTerminalSize();
  const theme = getTheme();

  const [isFirstRun, setIsFirstRun] = useState(false);

  const [state, setState] = useState<AppState>({
    route: 'home',
    view: 'home',
    output: [],
    isLoading: false,
    loadingMsg: '',
    promptDisabled: false,
    showPalette: false,
    paletteQuery: '',
    aiTokens: '',
    aiStreaming: false,
    quantumRunning: false,
    configIndex: 0,
    configValue: '',
  });

  function addOutput(lines: string | string[], color?: string, bold?: boolean, dim?: boolean) {
    const arr = Array.isArray(lines) ? lines : [lines];
    setState(s => ({
      ...s,
      output: [...s.output, ...arr.map(text => ({ text, color, bold, dim }))],
    }));
  }

  function clearOutput() {
    setState(s => ({ ...s, output: [] }));
  }

  function setLoading(loading: boolean, msg = '') {
    setState(s => ({ ...s, isLoading: loading, loadingMsg: msg, promptDisabled: loading }));
  }

  function goToSession() {
    setState(s => ({ ...s, route: 'session' }));
  }

  // Global keyboard shortcuts
  useInput((input, key) => {
    if (key.ctrl && input === 'd') {
      exit();
      return;
    }
    if (key.ctrl && input === 'l') {
      clearOutput();
      return;
    }
    if (key.ctrl && input === 'p') {
      setState(s => ({ ...s, showPalette: !s.showPalette, paletteQuery: '' }));
      return;
    }
    if (key.escape) {
      if (state.showPalette) {
        setState(s => ({ ...s, showPalette: false, paletteQuery: '' }));
        return;
      }
      if (state.aiStreaming) {
        abortRef.current?.abort();
        setState(s => ({ ...s, aiStreaming: false }));
        return;
      }
      if (state.route === 'session' && state.view === 'home') {
        // Already home, do nothing
        return;
      }
      if (state.view !== 'home') {
        setState(s => ({ ...s, view: 'home', fileContent: undefined, aiTokens: '' }));
      }
      return;
    }
  });

  // Startup sequence
  useEffect(() => {
    const firstRun = config.isFirstRun();
    config.load();
    setIsFirstRun(firstRun);

    // Check Docker in background
    if (config.get('autoStartDocker')) {
      (async () => {
        const running = docker.isDockerRunning();
        if (running) {
          const ready = await docker.isApiReady();
          if (!ready) {
            try {
              await docker.startContainers();
              showToast('Containers started', 'success');
            } catch {
              // Silent fail on startup
            }
          }
        }
      })();
    }
  }, []);

  const handlePaletteSelect = useCallback((command: string) => {
    setState(s => ({ ...s, showPalette: false, paletteQuery: '' }));
    handleInput(command);
  }, []);

  const handleSlash = useCallback(() => {
    setState(s => ({ ...s, showPalette: true, paletteQuery: '/' }));
  }, []);

  const handlePaletteDismiss = useCallback(() => {
    setState(s => ({ ...s, showPalette: false, paletteQuery: '' }));
  }, []);

  // ─── Command Handler ───────────────────────────────────────────────────────

  async function handleInput(raw: string) {
    const input = raw.trim();
    if (!input) return;

    addHistory(input);

    const parts = input.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const argStr = args.join(' ');

    // Switch to session route for any command
    if (state.route === 'home' && cmd !== '/exit' && cmd !== 'exit' && cmd !== 'quit') {
      goToSession();
    }

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

      case '/home':
        setState(s => ({ ...s, route: 'home', view: 'home', output: [], aiTokens: '', fileContent: undefined }));
        return;

      case '/history': {
        const hist = getAllHistory().slice(0, 20);
        addOutput(['', '  Recent commands:', '']);
        hist.forEach((entry, i) => addOutput(`  ${String(i + 1).padStart(3)}. ${entry.command}`, theme.textMuted));
        addOutput('');
        return;
      }

      case '/status': {
        setState(s => ({ ...s, view: 'status' }));
        setLoading(true, 'Checking system status...');
        try {
          const status = await getSystemStatus();
          setLoading(false);
          addOutput(formatStatus(status));
        } catch (err) {
          setLoading(false);
          addOutput(`  ✗ ${(err as Error).message}`, theme.error);
        }
        return;
      }

      case '/doctor': {
        setState(s => ({ ...s, view: 'doctor' }));
        setLoading(true, 'Running diagnostics...');
        try {
          const checks = await runDoctorChecks();
          setLoading(false);
          addOutput(formatDoctorResults(checks));
        } catch (err) {
          setLoading(false);
          addOutput(`  ✗ ${(err as Error).message}`, theme.error);
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
          showToast('Configuration reset to defaults', 'success');
          return;
        }
        const items = getConfigItems();
        setState(s => ({ ...s, view: 'config-wizard', configItems: items, configIndex: 0, configValue: '' }));
        addOutput([
          '',
          '  Configuration Wizard',
          '  ─────────────────────────────────────',
        ]);
        addOutput(`  ${items[0].label}: ${items[0].description}`, theme.info);
        addOutput(`  Current: ${items[0].current || 'Not set'}`, theme.textMuted);
        addOutput('  Enter new value (or press Enter to keep current):');
        addOutput('');
        return;
      }

      case '/login': {
        setState(s => ({ ...s, view: 'login' }));
        setLoading(true, 'Initializing login...');
        try {
          const result = await login(
            (code: string, url: string) => {
              setLoading(false);
              addOutput([
                '',
                '  Opening browser for authentication...',
                `  If it doesn't open, visit: ${url}`,
                '',
                `  Your code: ${code}`,
                '',
              ]);
              setState(s => ({ ...s, isLoading: true, loadingMsg: 'Waiting for authorization...' }));
            },
            () => {
              setState(s => ({ ...s, isLoading: true, loadingMsg: 'Waiting for authorization...' }));
            }
          );
          setLoading(false);
          if (result.success) {
            showToast(`Signed in${result.username ? ` as ${result.username}` : ''}`, 'success');
            addOutput([
              `  ✓ Signed in${result.username ? ` as ${result.username}` : ''}`,
              '  ✓ Token stored in system keychain',
              '',
            ], theme.success);
          } else {
            showToast(`Login failed: ${result.error}`, 'error');
          }
        } catch (err) {
          setLoading(false);
          showToast(`Login error: ${(err as Error).message}`, 'error');
        }
        setState(s => ({ ...s, view: 'home' }));
        return;
      }

      case '/logout': {
        try {
          await logout();
          showToast('Signed out successfully', 'success');
        } catch (err) {
          showToast(`Logout error: ${(err as Error).message}`, 'error');
        }
        return;
      }

      case '/update': {
        setLoading(true, 'Checking for updates...');
        try {
          const info = await checkForUpdates();
          setLoading(false);
          if (info.hasUpdate) {
            addOutput([
              `  Update available: v${info.currentVersion} → v${info.latestVersion}`,
              '  Run: npm install -g @opencern/cli',
            ], theme.info);
            setLoading(true, 'Pulling Docker images...');
            await updateDockerImages(img => {
              setState(s => ({ ...s, loadingMsg: `Pulling ${img}...` }));
            });
            setLoading(false);
            showToast('Docker images updated', 'success');
          } else {
            showToast(`Already up to date (v${info.currentVersion})`, 'info');
          }
        } catch (err) {
          setLoading(false);
          showToast(`Update error: ${(err as Error).message}`, 'error');
        }
        return;
      }

      case '/open': {
        const fileArg = argStr.replace('--json', '').replace('--root', '').trim();
        if (!fileArg) {
          addOutput('  Usage: /open <file.json|file.root>', theme.warning);
          return;
        }
        setLoading(true, `Opening ${fileArg}...`);
        try {
          const fileContent = await openFile(fileArg);
          setLoading(false);
          setState(s => ({ ...s, view: 'open', fileContent }));
        } catch (err) {
          setLoading(false);
          addOutput(`  ✗ ${(err as Error).message}`, theme.error);
        }
        return;
      }

      case '/opask': {
        const fileArg = argStr.trim();
        if (!fileArg) {
          addOutput('  Usage: /opask <file.json>', theme.warning);
          return;
        }
        setState(s => ({ ...s, view: 'opask', aiTokens: '', aiStreaming: true }));
        abortRef.current = new AbortController();
        try {
          const { file, totalTokens } = await openAndAsk(
            fileArg,
            token => setState(s => ({ ...s, aiTokens: s.aiTokens + token })),
            abortRef.current.signal
          );
          setState(s => ({
            ...s,
            fileContent: file,
            aiStreaming: false,
            aiTokenCount: totalTokens,
            promptDisabled: false,
          }));
        } catch (err) {
          setState(s => ({ ...s, aiStreaming: false, promptDisabled: false }));
          addOutput(`  ✗ ${(err as Error).message}`, theme.error);
        }
        return;
      }

      case '/ask': {
        const question = argStr || 'What can you tell me about this dataset?';
        const fileMatch = args.find(a => a === '--file');
        const fileIdx = args.indexOf('--file');
        const filePath = fileIdx >= 0 ? args[fileIdx + 1] : undefined;
        const cleanQuestion = question.replace('--file', '').replace(filePath || '', '').trim();

        setState(s => ({ ...s, view: 'ask', aiTokens: '', aiStreaming: true, promptDisabled: true }));
        abortRef.current = new AbortController();
        const start = Date.now();
        try {
          const { totalTokens } = await askQuestion(
            cleanQuestion || question,
            { file: filePath },
            anthropicService.getContext(),
            token => setState(s => ({ ...s, aiTokens: s.aiTokens + token })),
            abortRef.current.signal
          );
          setState(s => ({
            ...s,
            aiStreaming: false,
            aiTokenCount: totalTokens,
            aiLatency: Date.now() - start,
            promptDisabled: false,
          }));
        } catch (err) {
          setState(s => ({ ...s, aiStreaming: false, promptDisabled: false }));
          if ((err as Error).message.includes('API key')) {
            showToast('Anthropic API key not set. Run /config', 'warning');
          } else {
            addOutput(`  ✗ ${(err as Error).message}`, theme.error);
          }
        }
        return;
      }

      case '/quantum': {
        const subCmd = args[0];
        const fileArg = args.find(a => !a.startsWith('-')) || args[1];

        if (subCmd === 'status') {
          setLoading(true, 'Checking quantum backend...');
          const qStatus = await quantumService.getStatus();
          setLoading(false);
          addOutput([
            '',
            `  Quantum backend: ${qStatus.backend}`,
            `  Status: ${qStatus.healthy ? 'healthy' : 'offline'}`,
            '',
          ], qStatus.healthy ? theme.success : theme.warning);
          return;
        }

        const targetFile = fileArg || '';
        if (!targetFile) {
          addOutput('  Usage: /quantum classify <file.json>', theme.warning);
          return;
        }

        setState(s => ({ ...s, view: 'quantum', quantumRunning: true, quantumJob: undefined }));
        setLoading(true, 'Checking quantum container...');

        const qReady = await ensureQuantumRunning();
        if (!qReady) {
          setLoading(false);
          setState(s => ({ ...s, quantumRunning: false }));
          showToast('Quantum container not available. Ensure Docker is running.', 'error');
          return;
        }

        try {
          const events = extractEvents(targetFile);
          addOutput(`  Extracted ${events.length} events from ${targetFile}`, theme.textMuted);

          const circuit = await quantumService.getCircuitDiagram(4, 6);
          setState(s => ({ ...s, quantumCircuit: circuit, quantumBackend: config.get('quantumBackend') }));

          setLoading(false);

          const finalJob = await runClassification(events, job => {
            setState(s => ({ ...s, quantumJob: job }));
          });

          setState(s => ({ ...s, quantumRunning: false, quantumJob: finalJob }));

          if (finalJob.results) {
            showToast('Quantum classification complete!', 'success');
            addOutput([
              '',
              `  Signal events: ${finalJob.results.signalCount} (${(finalJob.results.signalProbability * 100).toFixed(1)}%)`,
              `  Background: ${finalJob.results.backgroundCount}`,
              `  Fidelity: ${finalJob.results.fidelity.toFixed(3)}`,
              '',
            ], theme.success);
          }
        } catch (err) {
          setLoading(false);
          setState(s => ({ ...s, quantumRunning: false }));
          addOutput(`  ✗ ${(err as Error).message}`, theme.error);
        }
        return;
      }

      case '/viz': {
        const fileArg = args.find(a => !a.startsWith('-')) || '';
        const forceBrowser = args.includes('--browser');

        if (!fileArg) {
          addOutput('  Usage: /viz <file.json>', theme.warning);
          return;
        }

        const result = openViz(fileArg, forceBrowser);
        addOutput(`  ${result.message}`, result.method === 'ascii' ? theme.warning : theme.success);

        if (result.method === 'ascii') {
          addOutput(renderASCII(fileArg));
        }
        return;
      }

      case '/download': {
        addOutput([
          '',
          '  /download — CERN Open Data',
          '  ──────────────────────────────────────',
          '  Requires the OpenCERN API container to be running.',
          `  Searching for: "${argStr || 'all datasets'}"`,
          '',
          '  Note: Connect to the API with /status, then retry.',
          '',
        ], theme.warning);
        return;
      }

      case '/process': {
        addOutput([
          '',
          '  /process — ROOT File Processing',
          '  ──────────────────────────────────────',
          '  Requires the OpenCERN API container to be running.',
          '  Start it with Docker, then retry.',
          '',
        ], theme.warning);
        return;
      }

      default: {
        // Free-form question — route to /ask
        if (!input.startsWith('/')) {
          setState(s => ({ ...s, view: 'ask', aiTokens: '', aiStreaming: true, promptDisabled: true }));
          abortRef.current = new AbortController();
          const start = Date.now();
          try {
            const { totalTokens } = await askQuestion(
              input,
              {},
              anthropicService.getContext(),
              token => setState(s => ({ ...s, aiTokens: s.aiTokens + token })),
              abortRef.current.signal
            );
            setState(s => ({
              ...s,
              aiStreaming: false,
              aiTokenCount: totalTokens,
              aiLatency: Date.now() - start,
              promptDisabled: false,
            }));
          } catch (err) {
            setState(s => ({ ...s, aiStreaming: false, promptDisabled: false }));
            if ((err as Error).message.includes('API key')) {
              showToast('No API key configured. Run /config to set it up.', 'warning');
            } else {
              addOutput(`  ✗ ${(err as Error).message}`, theme.error);
            }
          }
          return;
        }

        addOutput(`  Unknown command: ${cmd}. Type /help for available commands.`, theme.warning);
        return;
      }
    }
  }

  const handleCancelStream = useCallback(() => {
    abortRef.current?.abort();
    setState(s => ({ ...s, aiStreaming: false }));
  }, []);

  const handleCloseFile = useCallback(() => {
    setState(s => ({ ...s, view: 'home', fileContent: undefined }));
  }, []);

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box
      width={columns}
      height={rows}
      flexDirection="column"
      overflow="hidden"
    >
      {state.route === 'home' ? (
        <HomeRoute
          onSubmit={handleInput}
          onSlash={handleSlash}
          disabled={state.promptDisabled}
          showPalette={state.showPalette}
          paletteQuery={state.paletteQuery}
          onPaletteSelect={handlePaletteSelect}
          onPaletteDismiss={handlePaletteDismiss}
          isFirstRun={isFirstRun}
        />
      ) : (
        <SessionRoute
          state={state}
          onSubmit={handleInput}
          onSlash={handleSlash}
          onCancelStream={handleCancelStream}
          onPaletteSelect={handlePaletteSelect}
          onPaletteDismiss={handlePaletteDismiss}
          onCloseFile={handleCloseFile}
        />
      )}
    </Box>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point
// ─────────────────────────────────────────────────────────────────────────────

export async function startApp(): Promise<void> {
  // Enter alternate screen buffer (like vim, htop)
  process.stdout.write('\x1b[?1049h');
  // Clear screen
  process.stdout.write('\x1b[2J\x1b[H');

  const cleanup = () => {
    // Exit alternate screen buffer (restores previous terminal content)
    process.stdout.write('\x1b[?1049l');
  };

  // Ensure cleanup on various exit signals
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(0); });
  process.on('SIGTERM', () => { cleanup(); process.exit(0); });

  try {
    const { waitUntilExit } = render(<App />, {
      exitOnCtrlC: false,
      patchConsole: true,
    });
    await waitUntilExit();
  } finally {
    cleanup();
  }
}

export default App;

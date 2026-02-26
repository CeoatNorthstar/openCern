import React, { useState, useEffect, useCallback, useRef } from 'react';
import { render, Box, Text, useApp, useInput } from 'ink';
import Spinner from 'ink-spinner';

import { StatusBar } from './components/StatusBar.js';
import { Prompt } from './components/Prompt.js';
import { CommandPalette } from './components/CommandPalette.js';
import { AIStream } from './components/AIStream.js';
import { ProgressBar } from './components/ProgressBar.js';
import { FilePreview } from './components/FilePreview.js';
import { QuantumPanel } from './components/QuantumPanel.js';
import { DataTable } from './components/DataTable.js';

import { config } from './utils/config.js';
import { add as addHistory, getAll as getAllHistory } from './utils/history.js';
import { isAuthenticated } from './utils/auth.js';
import { docker } from './services/docker.js';
import { anthropicService } from './services/anthropic.js';

import { getHelpText } from './commands/help.js';
import { getSystemStatus, formatStatus } from './commands/status.js';
import { runDoctorChecks, formatDoctorResults } from './commands/doctor.js';
import { login, logout, getUsername } from './commands/auth.js';
import { showConfig, getConfigItems, setConfigValue, resetConfig } from './commands/config.js';
import { checkForUpdates, updateDockerImages } from './commands/update.js';
import { openFile } from './commands/open.js';
import { openAndAsk } from './commands/opask.js';
import { askQuestion } from './commands/ask.js';
import { getSystemStatus as getStatus } from './commands/status.js';
import { extractEvents, runClassification, ensureQuantumRunning } from './commands/quantum.js';
import { openViz, renderASCII } from './commands/viz.js';
import { quantumService } from './services/quantum.js';

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
}

interface AppState {
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

function App(): React.JSX.Element {
  const { exit } = useApp();
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<AppState>({
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

  function addOutput(lines: string | string[], color?: string, bold?: boolean) {
    const arr = Array.isArray(lines) ? lines : [lines];
    setState(s => ({
      ...s,
      output: [...s.output, ...arr.map(text => ({ text, color, bold }))],
    }));
  }

  function clearOutput() {
    setState(s => ({ ...s, output: [] }));
  }

  function setLoading(loading: boolean, msg = '') {
    setState(s => ({ ...s, isLoading: loading, loadingMsg: msg, promptDisabled: loading }));
  }

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
    // Escape = cancel streaming / close overlay
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

    if (firstRun) {
      addOutput([
        '',
        '  Welcome to OpenCERN CLI!',
        '  AI-powered particle physics analysis.',
        '',
        '  Let\'s get you set up. Run /config to configure your API keys.',
        '  Run /help to see all available commands.',
        '',
      ], 'cyan');
    } else {
      addOutput([
        '',
        '  OpenCERN CLI — type / for commands or ask a question',
        '',
      ], 'gray');
    }

    // Check Docker in background
    if (config.get('autoStartDocker')) {
      (async () => {
        const running = docker.isDockerRunning();
        if (running) {
          const ready = await docker.isApiReady();
          if (!ready) {
            addOutput('  Starting OpenCERN containers...', 'gray');
            try {
              await docker.startContainers();
              addOutput('  Containers started.', 'green');
            } catch (err) {
              addOutput(`  Could not start containers: ${(err as Error).message}`, 'yellow');
            }
          }
        }
      })();
    }

    if (!isAuthenticated()) {
      addOutput('  Tip: Run /login to sign in and unlock all features.', 'yellow');
    }
  }, []);

  const handlePaletteSelect = useCallback((command: string) => {
    setState(s => ({ ...s, showPalette: false, paletteQuery: '' }));
    handleInput(command);
  }, []);

  const handleSlash = useCallback(() => {
    setState(s => ({ ...s, showPalette: true, paletteQuery: '/' }));
  }, []);

  async function handleInput(raw: string) {
    const input = raw.trim();
    if (!input) return;

    addHistory(input);

    // Parse command and args
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
        setLoading(true, 'Checking system status...');
        try {
          const status = await getSystemStatus();
          setLoading(false);
          addOutput(formatStatus(status));
        } catch (err) {
          setLoading(false);
          addOutput(`  Error: ${(err as Error).message}`, 'red');
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
          addOutput(`  Error: ${(err as Error).message}`, 'red');
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
          addOutput('  Configuration reset to defaults.', 'green');
          return;
        }
        // Interactive wizard
        const items = getConfigItems();
        setState(s => ({ ...s, view: 'config-wizard', configItems: items, configIndex: 0, configValue: '' }));
        addOutput(['', '  Configuration Wizard', '  ─────────────────────────────────────']);
        addOutput(`  ${items[0].label}: ${items[0].description}`, 'cyan');
        addOutput(`  Current: ${items[0].current || 'Not set'}`, 'gray');
        addOutput(`  Enter new value (or press Enter to keep current):`, 'gray');
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
                `  If it doesn\'t open, visit: ${url}`,
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
            addOutput([
              `  ✓ Signed in${result.username ? ` as ${result.username}` : ''}`,
              '  ✓ Token stored in system keychain',
              '',
            ], 'green');
          } else {
            addOutput(`  ✗ Login failed: ${result.error}`, 'red');
          }
        } catch (err) {
          setLoading(false);
          addOutput(`  ✗ Login error: ${(err as Error).message}`, 'red');
        }
        setState(s => ({ ...s, view: 'home' }));
        return;
      }

      case '/logout': {
        try {
          await logout();
          addOutput('  ✓ Signed out successfully.', 'green');
        } catch (err) {
          addOutput(`  ✗ Logout error: ${(err as Error).message}`, 'red');
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
              '',
              '  Pulling latest Docker images...',
            ], 'cyan');
            setLoading(true, 'Pulling Docker images...');
            await updateDockerImages(img => {
              setState(s => ({ ...s, loadingMsg: `Pulling ${img}...` }));
            });
            setLoading(false);
            addOutput('  ✓ Docker images updated.', 'green');
          } else {
            addOutput(`  ✓ Already up to date (v${info.currentVersion}).`, 'green');
          }
        } catch (err) {
          setLoading(false);
          addOutput(`  ✗ Update error: ${(err as Error).message}`, 'red');
        }
        return;
      }

      case '/open': {
        const fileArg = argStr.replace('--json', '').replace('--root', '').trim();
        if (!fileArg) {
          addOutput('  Usage: /open <file.json|file.root>', 'yellow');
          return;
        }
        setLoading(true, `Opening ${fileArg}...`);
        try {
          const fileContent = await openFile(fileArg);
          setLoading(false);
          setState(s => ({ ...s, view: 'open', fileContent }));
        } catch (err) {
          setLoading(false);
          addOutput(`  ✗ ${(err as Error).message}`, 'red');
        }
        return;
      }

      case '/opask': {
        const fileArg = argStr.trim();
        if (!fileArg) {
          addOutput('  Usage: /opask <file.json>', 'yellow');
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
          addOutput(`  ✗ ${(err as Error).message}`, 'red');
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
            addOutput('  ✗ Anthropic API key not set. Run /config to configure.', 'red');
          } else {
            addOutput(`  ✗ ${(err as Error).message}`, 'red');
          }
        }
        return;
      }

      case '/quantum': {
        const subCmd = args[0];
        const fileArg = args.find(a => !a.startsWith('-')) || args[1];

        if (subCmd === 'status') {
          setLoading(true, 'Checking quantum backend...');
          const status = await quantumService.getStatus();
          setLoading(false);
          addOutput([
            '',
            `  Quantum backend: ${status.backend}`,
            `  Status: ${status.healthy ? 'healthy' : 'offline'}`,
            '',
          ], status.healthy ? 'green' : 'yellow');
          return;
        }

        const targetFile = fileArg || '';
        if (!targetFile) {
          addOutput('  Usage: /quantum classify <file.json>', 'yellow');
          return;
        }

        setState(s => ({ ...s, view: 'quantum', quantumRunning: true, quantumJob: undefined }));
        setLoading(true, 'Checking quantum container...');

        const qReady = await ensureQuantumRunning();
        if (!qReady) {
          setLoading(false);
          setState(s => ({ ...s, quantumRunning: false }));
          addOutput('  ✗ Quantum container not available. Ensure Docker is running.', 'red');
          return;
        }

        try {
          const events = extractEvents(targetFile);
          addOutput(`  Extracted ${events.length} events from ${targetFile}`, 'gray');

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
              `  Quantum classification complete!`,
              `  Signal events: ${finalJob.results.signalCount} (${(finalJob.results.signalProbability * 100).toFixed(1)}%)`,
              `  Background: ${finalJob.results.backgroundCount}`,
              `  Fidelity: ${finalJob.results.fidelity.toFixed(3)}`,
              '',
            ], 'green');
          }
        } catch (err) {
          setLoading(false);
          setState(s => ({ ...s, quantumRunning: false }));
          addOutput(`  ✗ ${(err as Error).message}`, 'red');
        }
        return;
      }

      case '/viz': {
        const fileArg = args.find(a => !a.startsWith('-')) || '';
        const forceBrowser = args.includes('--browser');

        if (!fileArg) {
          addOutput('  Usage: /viz <file.json>', 'yellow');
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
        addOutput([
          '',
          '  /download — CERN Open Data',
          '  ──────────────────────────────────────',
          '  Requires the OpenCERN API container to be running.',
          `  Searching for: "${argStr || 'all datasets'}"`,
          '',
          '  Note: Connect to the API with /status, then retry.',
          '',
        ], 'yellow');
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
        ], 'yellow');
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
              addOutput([
                '  No Anthropic API key configured.',
                '  Run /config to set it up, then ask your question again.',
              ], 'yellow');
            } else {
              addOutput(`  ✗ ${(err as Error).message}`, 'red');
            }
          }
          return;
        }

        addOutput(`  Unknown command: ${cmd}. Type /help for available commands.`, 'yellow');
        return;
      }
    }
  }

  const { output, isLoading, loadingMsg, showPalette, paletteQuery, view,
    aiTokens, aiStreaming, aiTokenCount, aiLatency,
    fileContent, progress, quantumJob, quantumRunning, quantumBackend, quantumCircuit,
    promptDisabled } = state;

  const model = config.get('defaultModel');

  return (
    <Box flexDirection="column" padding={0}>
      <StatusBar />

      {/* Output area */}
      <Box flexDirection="column" paddingX={1} marginY={0} minHeight={3}>
        {output.slice(-30).map((line, i) => (
          <Text
            key={i}
            color={(line.color as never) || 'white'}
            bold={line.bold}
          >
            {line.text}
          </Text>
        ))}
      </Box>

      {/* AI streaming view */}
      {(view === 'ask' || view === 'opask') && (aiTokens || aiStreaming) && (
        <Box flexDirection={view === 'opask' ? 'row' : 'column'} paddingX={1}>
          <Box flexDirection="column" flexGrow={1}>
            <AIStream
              tokens={aiTokens}
              isStreaming={aiStreaming}
              onCancel={() => { abortRef.current?.abort(); setState(s => ({ ...s, aiStreaming: false })); }}
              model={model}
              tokenCount={aiTokenCount}
              latency={aiLatency}
            />
          </Box>
          {view === 'opask' && fileContent && (
            <Box flexDirection="column" flexGrow={1} marginLeft={2}>
              <FilePreview
                content={fileContent.content}
                filename={fileContent.filename}
                size={fileContent.size}
                fileType={fileContent.fileType}
                focused={false}
              />
            </Box>
          )}
        </Box>
      )}

      {/* File open view */}
      {view === 'open' && fileContent && (
        <Box paddingX={1}>
          <FilePreview
            content={fileContent.content}
            filename={fileContent.filename}
            size={fileContent.size}
            fileType={fileContent.fileType}
            onClose={() => setState(s => ({ ...s, view: 'home', fileContent: undefined }))}
          />
        </Box>
      )}

      {/* Quantum view */}
      {view === 'quantum' && (
        <Box paddingX={1}>
          <QuantumPanel
            job={quantumJob}
            isRunning={quantumRunning}
            backend={quantumBackend}
            circuitDiagram={quantumCircuit}
          />
        </Box>
      )}

      {/* Progress bar */}
      {progress && (
        <Box paddingX={1}>
          <ProgressBar
            label={progress.label}
            percent={progress.percent}
            speed={progress.speed}
            eta={progress.eta}
            mode={progress.mode}
          />
        </Box>
      )}

      {/* Loading indicator */}
      {isLoading && (
        <Box paddingX={1}>
          <Text color="blue"><Spinner type="dots" /></Text>
          <Text color="gray">  {loadingMsg}</Text>
        </Box>
      )}

      {/* Command palette */}
      {showPalette && (
        <Box paddingX={1}>
          <CommandPalette
            query={paletteQuery}
            onSelect={handlePaletteSelect}
            onDismiss={() => setState(s => ({ ...s, showPalette: false, paletteQuery: '' }))}
          />
        </Box>
      )}

      {/* Prompt */}
      <Box paddingX={1} marginTop={0}>
        <Prompt
          onSubmit={handleInput}
          onSlash={handleSlash}
          disabled={promptDisabled}
          placeholder={promptDisabled ? 'Processing... (Esc to cancel)' : undefined}
        />
      </Box>
    </Box>
  );
}

export async function startApp(): Promise<void> {
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}

export default App;

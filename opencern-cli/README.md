# ⚛️ OpenCERN CLI

**The terminal-first particle physics analysis environment.**

OpenCERN CLI is an interactive terminal application for analyzing CERN particle physics data using AI and quantum computing. Type `opencern`, hit Enter, and you're inside a full physics analysis workbench — powered by Claude AI for intelligent data interpretation and Qiskit for quantum-accelerated event classification.

---

## What This Tool Does

OpenCERN CLI is a **REPL environment** (like Python or Node.js) — not a traditional CLI tool. You don't pass flags and get output. You enter the program and interact with it through slash commands, keyboard shortcuts, and natural language.

```
$ opencern

╔══════════════════════════════════════════════════════════════╗
║  ⚛️  OpenCERN Terminal  v1.0.0                                ║
║  Docker ✅  │  API :8080 ✅  │  AI ✅  │  ⚛️ Quantum: local    ║
╚══════════════════════════════════════════════════════════════╝

  Welcome back. 3 datasets cached locally. Type / for commands.

  opencern ❯ _
```

### Core Capabilities

| Capability            | Description                                                                       |
| --------------------- | --------------------------------------------------------------------------------- |
| **Dataset Discovery** | Browse and download from CERN Open Data Portal directly in the terminal           |
| **ROOT Processing**   | Process particle collision data through a C++ physics engine                      |
| **AI Analysis**       | Ask Claude to interpret your data, explain physics, and suggest analysis steps    |
| **Quantum Computing** | Run variational quantum circuits for event classification on IBM Quantum hardware |
| **File Inspection**   | Syntax-highlighted preview of ROOT file structures and processed JSON data        |
| **3D Visualization**  | Launch the OpenCERN desktop app or browser-based 3D particle visualization        |

---

## Slash Commands

Commands are entered with a `/` prefix. Tab autocomplete and fuzzy search are built in.

### `/download`

Browse and download datasets from the CERN Open Data Portal. Supports interactive search with filters (experiment, energy, year), multi-file selection, and progress tracking with ETA. Archives (.zip) are automatically extracted.

### `/process`

Run the C++ physics processing engine on ROOT files. Supports single file, batch folder, and auto-detection. Shows real-time progress (file 3/12, events scanned, particle types found). Results are merged into a single JSON output.

### `/ask`

Ask Claude AI about your data or particle physics in general. The AI has full context of your session — what you downloaded, processed, and analyzed. Responses stream token-by-token. Follow-up questions maintain conversation context.

### `/open`

Inspect files in the terminal. ROOT files show their tree structure (branches, entries, data types). JSON files are syntax-highlighted with collapsible sections. Supports scrolling, search (Ctrl+F), and line numbers.

### `/opask`

Power-user combo: opens a file and immediately starts AI analysis in a split-view layout. The left panel shows Claude's streaming analysis while the right panel shows the file contents. The AI highlights and references specific sections of the data.

### `/quantum`

Run quantum computing analysis on processed event data. Uses Variational Quantum Circuits (VQC) to classify collision events as signal or background. Supports local simulation (instant, free) and real quantum hardware (IBM Quantum, Amazon Braket).

### `/viz`

Launch the 3D particle visualization. Opens the OpenCERN desktop app via deep link, or falls back to the browser. For terminal-only environments, renders an ASCII projection of particle tracks.

### `/config`

Interactive configuration for API keys (Anthropic, IBM Quantum, AWS), preferences (default model, quantum backend, data directory), and theme settings. API keys are stored securely in the OS keychain.

### `/status`

Dashboard showing Docker container health, API connectivity, cached datasets, quantum backend status, and AI model configuration.

---

## Keyboard Shortcuts

| Shortcut | Action                 |
| -------- | ---------------------- |
| `Ctrl+D` | Quick download         |
| `Ctrl+A` | Quick ask AI           |
| `Ctrl+Q` | Quick quantum          |
| `Ctrl+O` | Open file picker       |
| `Ctrl+L` | Clear terminal         |
| `Ctrl+S` | Show status            |
| `Ctrl+R` | Reverse history search |
| `Tab`    | Autocomplete           |
| `↑ / ↓`  | Navigate history       |
| `Esc`    | Cancel / close         |

---

## Architecture

The CLI is built with React Ink (React for the terminal) and TypeScript. It communicates with OpenCERN's Docker containers for data processing and quantum computing, and directly with the Anthropic API for AI.

```
┌────────────────────────────────────┐
│  OpenCERN CLI (Node.js/React Ink)  │
│  ├── AI: @anthropic-ai/sdk        │
│  ├── TUI: ink + react             │
│  └── Quantum Bridge: HTTP client  │
└──────────┬─────────────────────────┘
           │ HTTP
           ▼
┌────────────────────────────────────┐
│  Docker Containers                 │
│  ├── opencern-api     (:8080)     │  ← Data management + C++ processing
│  ├── opencern-xrootd  (:8081)     │  ← CERN data downloads
│  ├── opencern-streamer (:9001)    │  ← Data streaming
│  └── opencern-quantum (:8082)     │  ← Qiskit quantum circuits
└────────────────────────────────────┘
```

---

## Project Structure

### Entry Point

| File              | Purpose                                                                                                                                 |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `bin/opencern.js` | The executable that runs when you type `opencern`. Bootstraps Node.js, checks version compatibility, and hands off to the Ink renderer. |

### Root Application

| File          | Purpose                                                                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app.tsx` | The top-level React component. Owns the REPL loop, command routing, keyboard shortcuts, view switching, and session state management. This is the brain of the TUI. |

### Components (`src/components/`)

These are the React Ink components that render the terminal UI.

| Component            | Purpose                                                                                                                                                                    |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Prompt.tsx`         | The main input line (`opencern ❯ _`). Handles keystroke capture, line editing, history navigation, and input submission. Always visible at the bottom.                     |
| `CommandPalette.tsx` | The floating dropdown that appears when you type `/`. Fuzzy-filters available commands, shows descriptions, and handles selection. Inspired by VS Code's command palette.  |
| `StatusBar.tsx`      | The persistent top bar showing Docker status, API health, quantum backend, and AI configuration. Updates in real-time.                                                     |
| `FilePreview.tsx`    | Scrollable, syntax-highlighted file viewer. Supports JSON (collapsible), ROOT metadata, and plain text. Used by `/open` and `/opask`.                                      |
| `AIStream.tsx`       | Renders Claude's responses token-by-token as they stream in. Handles markdown formatting in terminal (bold, code blocks, lists). Shows thinking indicator and token count. |
| `ProgressBar.tsx`    | Animated progress bar for downloads, processing, and quantum jobs. Shows speed, ETA, and percentage. Supports multiple concurrent bars.                                    |
| `DataTable.tsx`      | Tabular data renderer with sortable columns, scrollable rows, alternating colors, and physics-aware number formatting (GeV, rad, scientific notation).                     |
| `QuantumPanel.tsx`   | Dedicated view for quantum operations. Shows ASCII circuit diagrams, execution progress, measurement histograms, and classification results.                               |

### Command Handlers (`src/commands/`)

Each command handler is responsible for one slash command's logic.

| Handler       | Command     | Purpose                                                                                                                                  |
| ------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `download.ts` | `/download` | Orchestrates dataset discovery, file selection, download initiation, progress tracking, and archive extraction through the OpenCERN API. |
| `process.ts`  | `/process`  | Manages ROOT file selection, C++ processor invocation via API, progress polling, and result summary display.                             |
| `ask.ts`      | `/ask`      | Builds physics-aware prompts with session context, sends to Anthropic API with streaming, maintains conversation history for follow-ups. |
| `open.ts`     | `/open`     | Reads files from disk, determines type (ROOT/JSON/text), and renders the appropriate preview component.                                  |
| `opask.ts`    | `/opask`    | Combines file opening with AI analysis in a split terminal layout. The file preview and AI response render side-by-side.                 |
| `quantum.ts`  | `/quantum`  | Orchestrates quantum classification jobs — sends event data to the Qiskit container, polls for results, and renders the quantum panel.   |
| `viz.ts`      | `/viz`      | Launches external visualization — either the Electron desktop app (via deep link), browser, or falls back to terminal ASCII art.         |
| `config.ts`   | `/config`   | Interactive configuration wizard for API keys, preferences, and backend selection. Handles first-run setup.                              |

### Services (`src/services/`)

Backend integrations and API clients.

| Service        | Purpose                                                                                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `anthropic.ts` | Wrapper around `@anthropic-ai/sdk`. Initializes the client with the user's API key, builds physics system prompts, streams responses, tracks token usage, and manages conversation history.                              |
| `quantum.ts`   | HTTP bridge to the Qiskit Docker container. Submits classification jobs, polls for results, switches backends, and retrieves circuit diagrams. The actual quantum code runs in Python — this is just the Node.js client. |
| `docker.ts`    | Docker lifecycle manager. Checks if Docker is running, starts/stops OpenCERN containers with `docker compose -p opencern`, monitors container health, and streams logs.                                                  |
| `cern-api.ts`  | HTTP client for the OpenCERN API (port 8080). Wraps all REST endpoints for dataset search, file management, downloads, and processing. Handles retries, timeouts, and error normalization.                               |

### Utilities (`src/utils/`)

Shared utilities used across the application.

| Utility       | Purpose                                                                                                                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `keystore.ts` | Secure API key storage using the OS keychain (macOS Keychain, Windows Credential Manager, Linux Secret Service). Keys are never logged or displayed in full. Falls back to encrypted file storage. |
| `history.ts`  | Persists command history across sessions to `~/.opencern/history.json`. Supports reverse search (Ctrl+R), deduplication, and automatic exclusion of sensitive commands.                            |
| `config.ts`   | Reads/writes user preferences from `~/.opencern/config.json`. Manages defaults, validation, and first-run initialization.                                                                          |

### Quantum Computing (`quantum/`)

The quantum computing component runs as a separate Docker container with Python/Qiskit.

| File                | Purpose                                                                                                                                                                                                                                                                                                                   |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `vqc_classifier.py` | The Variational Quantum Classifier circuit. Encodes particle physics features (pT, η, φ, energy) into quantum states, runs through parameterized rotation and entangling layers, and classifies events as signal or background. Ships with pre-trained weights for Higgs → γγ classification. Exposes a FastAPI REST API. |
| `requirements.txt`  | Python dependencies: Qiskit (core + Aer + ML + IBM Runtime), Amazon Braket SDK, FastAPI, NumPy, scikit-learn.                                                                                                                                                                                                             |
| `Dockerfile`        | Container definition for the quantum service. Python 3.11 slim image running the FastAPI server on port 8082.                                                                                                                                                                                                             |

### Configuration Files

| File            | Purpose                                                                                                                                                                            |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `package.json`  | npm package definition. Declares the `opencern` binary, all dependencies (Ink, Anthropic SDK, React, Chalk, Keytar, Fuse.js), build scripts, and npm keywords for discoverability. |
| `tsconfig.json` | TypeScript configuration targeting ES2022 with NodeNext modules and React JSX support for Ink components.                                                                          |

---

## Technology Stack

| Layer         | Technology           | Why                                                 |
| ------------- | -------------------- | --------------------------------------------------- |
| Runtime       | Node.js ≥ 18         | Universal, ships with npm for easy distribution     |
| Language      | TypeScript           | Type safety across 26+ files                        |
| TUI Framework | React Ink 5          | JSX for terminal — same mental model as web React   |
| AI            | Anthropic Claude SDK | Best reasoning for scientific data interpretation   |
| Quantum       | Qiskit (Python)      | Most mature quantum SDK, free IBM hardware access   |
| Containers    | Docker Compose       | Consistent environments for C++ processor + quantum |
| Key Storage   | Keytar / OS Keychain | Enterprise-grade credential management              |
| Distribution  | npm                  | `npx @opencern/cli` — zero install                  |

---

## Requirements

- **Node.js 18+** — for the CLI itself
- **Docker Desktop** — for the physics processing engine and quantum service
- **Anthropic API Key** — for AI features (get one at [console.anthropic.com](https://console.anthropic.com))
- **IBM Quantum API Key** _(optional)_ — for real quantum hardware (free at [quantum.ibm.com](https://quantum.ibm.com))

---

_Built by NorthStars Industries. OpenCERN is open-source software for the particle physics community._

// TODO: Root Ink Application Component
//
// This is the top-level React component rendered in the terminal via Ink.
// It owns the entire TUI lifecycle:
//
//   1. STATE MANAGEMENT
//      - currentView: 'home' | 'ask' | 'download' | 'process' | 'quantum' | 'config'
//      - sessionContext: tracks what datasets are loaded, what was processed,
//        conversation history — so AI has full context of the session
//      - connectionStatus: Docker, API, quantum backend health
//
//   2. LAYOUT
//      ┌─ StatusBar ──────────────────────────────────────┐
//      │  Docker ✅  │  API :8080 ✅  │  Quantum: local   │
//      ├──────────────────────────────────────────────────┤
//      │                                                  │
//      │            Active View Area                      │
//      │       (swaps based on currentView)               │
//      │                                                  │
//      ├──────────────────────────────────────────────────┤
//      │  opencern ❯ [Prompt input]                       │
//      └──────────────────────────────────────────────────┘
//
//   3. COMMAND ROUTING
//      - Receives input from <Prompt />
//      - Parses slash commands (/ask, /download, /process, etc.)
//      - Routes to the appropriate command handler in src/commands/
//      - Updates the active view with the command's output
//
//   4. KEYBOARD SHORTCUTS (global)
//      - Ctrl+D → /download
//      - Ctrl+A → /ask
//      - Ctrl+Q → /quantum
//      - Ctrl+O → file picker
//      - Ctrl+L → clear screen
//      - Ctrl+S → /status
//      - Ctrl+C → exit
//      - Tab    → autocomplete
//      - ↑/↓    → command history
//      - Esc    → cancel current operation / close palette
//
//   5. STARTUP SEQUENCE
//      - Check Docker connectivity
//      - Check API health (localhost:8080)
//      - Load user config (API keys, preferences)
//      - Show welcome message with session stats
//      - Enter REPL loop

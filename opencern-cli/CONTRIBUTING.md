# Contributing to OpenCERN CLI

Thank you for your interest in contributing to OpenCERN CLI — a terminal interface
for CERN particle physics data analysis powered by AI and quantum computing.

This document is the authoritative guide on what you can contribute to, how to
contribute, and what remains proprietary. **Read it fully before opening a PR.**

---

## Dual-License Structure

OpenCERN CLI is a **source-available project with dual licensing**:

| Layer | License | Contributions |
|-------|---------|---------------|
| UI Components & General Utilities | MIT | Open — PRs welcome |
| Core Engine & Services | LICENSE.enterprise | Closed — view only |

The boundary between layers is documented precisely in
[docs/OPEN_SOURCE_BOUNDARY.md](docs/OPEN_SOURCE_BOUNDARY.md).

**PRs that modify Enterprise Component files will be closed without review,
regardless of the quality of the contribution.**

---

## What You CAN Contribute To

### UI Components — `src/components/`

All terminal UI components are MIT licensed. These are the visual building blocks
of the TUI and benefit most from broad community input.

| File | What it does |
|------|-------------|
| `src/components/Prompt.tsx` | Input line with history navigation and tab completion |
| `src/components/StatusBar.tsx` | Real-time status bar (docker, api, quantum, auth) |
| `src/components/AIStream.tsx` | Token-by-token AI response rendering; tool approval UI |
| `src/components/CommandPalette.tsx` | Fuzzy-search command picker (Fuse.js) |
| `src/components/FilePreview.tsx` | Syntax-highlighted file viewer with scrolling |
| `src/components/ProgressBar.tsx` | Animated progress indicator with ETA and speed |
| `src/components/QuantumPanel.tsx` | Quantum classification results display |
| `src/components/DataTable.tsx` | Sortable, scrollable data table |

**Good contributions for components:**
- Rendering bug fixes
- Cross-platform terminal compatibility
- Keyboard shortcut improvements
- Accessibility improvements
- Performance optimizations
- Visual polish (following the style guide below)

### General Utilities — `src/utils/config.ts`, `src/utils/history.ts`

Generic utilities with no backend coupling.

| File | What it does |
|------|-------------|
| `src/utils/config.ts` | Reads/writes `~/.opencern/config.json`; default config values |
| `src/utils/history.ts` | Command history (max 1000), deduplication, sensitive filtering |

**Good contributions:**
- Cross-platform path handling
- Config schema additions (open an issue first to discuss)
- History performance improvements

### Informational Commands — `src/commands/`

These commands report status and diagnostics. They have no proprietary logic.

| File | What it does |
|------|-------------|
| `src/commands/help.ts` | Help text and command listings |
| `src/commands/status.ts` | System health check output |
| `src/commands/doctor.ts` | Node.js / Docker / API diagnostics |
| `src/commands/update.ts` | npm version comparison and update prompts |
| `src/commands/viz.ts` | 3D visualization launcher (desktop/browser/ASCII fallback) |

### Entry Point — `bin/opencern.js`

The bootstrap script that validates Node.js version and parses top-level flags
(`--version`, `--help`, `--debug`). Plain JavaScript, MIT licensed.

---

## What You CANNOT Contribute To (Enterprise Components)

The following files contain proprietary intellectual property. You may read them
to understand integration points, but you may **not** submit modifications.

| File | Why it is proprietary |
|------|-----------------------|
| `src/app.tsx` | The core agentic REPL: human-in-the-loop tool approval, command routing, state orchestration |
| `src/services/anthropic.ts` | AI model integration, system prompt engineering, tool definitions, agentic loop |
| `src/services/executor.ts` | Sandboxed Python/bash execution engine with safety blocklist and resource estimation |
| `src/services/cern-api.ts` | Internal HTTP client for the CERN data processing API |
| `src/services/quantum.ts` | Quantum ML service client (Qiskit / IBM Quantum / AWS Braket) |
| `src/services/docker.ts` | Container orchestration, GHCR image management, health checks |
| `src/utils/keystore.ts` | Multi-platform credential storage (macOS Keychain / Secret Service / AES fallback) |
| `src/utils/auth.ts` | JWT token management and authentication middleware |
| `src/commands/auth.ts` | OAuth2 device code flow against OpenCERN auth service |
| `src/commands/ask.ts` | AI analysis orchestration (context injection, streaming) |
| `src/commands/opask.ts` | Split-view file + AI analysis |
| `src/commands/quantum.ts` | Quantum classification job orchestration |
| `src/commands/download.ts` | CERN dataset download pipeline |
| `src/commands/process.ts` | ROOT file processing pipeline |
| `src/commands/config.ts` | API key management, config wizard, key validation |
| `src/commands/open.ts` | File opening with CERN API integration for ROOT metadata |

> If you have found a bug in an Enterprise Component, please file an issue —
> bug reports are always welcome. We will fix it internally.

---

## Contribution Workflow

### 1. Before You Start

- Search [existing issues](https://github.com/opencern/opencern-cli/issues) — avoid
  duplicating work already in progress
- For new features, **open an issue first** to confirm it is in scope before writing code
- Verify the file(s) you intend to change are in the Open Source layer above

### 2. Development Setup

```bash
# Prerequisites: Node.js >= 18, npm

# Fork and clone
git clone https://github.com/YOUR_USERNAME/opencern-cli
cd opencern-cli

# Install dependencies
npm install

# Compile TypeScript
npm run build

# Run the CLI
node bin/opencern.js

# Type checking only (no emit)
npm run typecheck

# Watch mode during development
npm run dev
```

### 3. Making Changes

- Branch off `main`: `git checkout -b feat/short-description`
- Keep changes **focused and minimal** — one issue per PR
- Do not refactor code you are not directly fixing
- Do not add features that were not discussed in an issue first
- Test your changes manually across terminal sizes

### 4. Code Style

OpenCERN CLI follows strict conventions:

**General:**
- TypeScript strict mode — no implicit `any`
- Named exports — no default exports
- Functional React components with hooks
- Error messages must be actionable ("Cannot connect to Docker. Is Docker Desktop running?")

**No emojis in output.** Use clean ASCII indicators:
- `[+]` — success / ok
- `[-]` — error / failure
- `[~]` — warning / in progress
- `[ ]` — pending

**Do not add:**
- Docstrings or comments to code you did not change
- Extra error handling for scenarios that cannot happen
- Abstractions for one-time operations
- Backwards-compatibility shims

### 5. Submitting a Pull Request

Use the [PR template](.github/PULL_REQUEST_TEMPLATE.md). Required fields:

- Reference the issue: `Closes #123`
- Describe **why** not just what changed
- List which open-source files were modified
- Include a screenshot or terminal recording for UI changes

PRs without an associated issue may be closed.

---

## Reporting Bugs

Bug reports are welcome for **all** parts of the CLI, including Enterprise
Components. Use the [bug report template](.github/ISSUE_TEMPLATE/bug_report.md).

Required information:
```
opencern --version
node --version
OS: macOS 15 / Ubuntu 24.04 / etc.
Docker version (if relevant): ...

Steps to reproduce:
1.
2.
3.

Expected:
Actual:
```

---

## Feature Requests

Use the [feature request template](.github/ISSUE_TEMPLATE/feature_request.md).

Note:
- Features touching Enterprise Components are evaluated internally against roadmap
- UI/UX improvements to Open Source Components have the highest acceptance rate
- Features requiring new backend endpoints depend on the API roadmap

---

## Style Guide Reference

| Element | Style |
|---------|-------|
| Status indicators | `[+]` ok · `[-]` error · `[~]` warning |
| Prompt | `opencern > ` |
| Code blocks | Round border, monospace |
| Tool cards | Round border, yellow (pending), gray (result) |
| Banners | ASCII art only, no Unicode box-drawing |
| Colors | Chalk — no hardcoded ANSI codes |

---

## License Agreement

By submitting a pull request you confirm that:

1. Your contribution is your original work and you have the right to submit it
2. You grant OpenCERN a perpetual, worldwide, irrevocable, royalty-free license
   to use, reproduce, modify, and distribute your contribution
3. Your contribution is submitted under the MIT License
4. You have read and agree to this CONTRIBUTING.md in its entirety

---

## Contact

| Purpose | Contact |
|---------|---------|
| General questions | Open a GitHub Discussion |
| Enterprise / partnership licensing | enterprise@opencern.io |
| Security vulnerabilities | security@opencern.io — **do not open a public issue** |
| Legal / IP inquiries | legal@opencern.io |

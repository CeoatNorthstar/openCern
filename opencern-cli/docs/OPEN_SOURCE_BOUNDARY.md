# Open Source Boundary — Technical Reference

This document defines the precise boundary between Open Source Components (MIT)
and Enterprise Components (proprietary) in OpenCERN CLI. It is the authoritative
reference for contributors, auditors, and the engineering team.

Last updated: 2026-02-28

---

## Decision Framework

The following criteria were used to classify each file:

**Classify as OPEN SOURCE if the component:**
- Contains no competitive advantage logic
- Is a generic UI/utility pattern any CLI project could use
- Benefits from broad community eyes (bug discovery, accessibility, polish)
- Does not expose internal API surface, endpoint URLs, or security implementation
- Contains no system prompt engineering, AI tool definitions, or model selection logic

**Classify as ENTERPRISE/PROPRIETARY if the component:**
- Contains the core value proposition (agentic AI loop, quantum ML pipeline)
- Exposes internal backend architecture, API routes, or service endpoint URLs
- Contains security-sensitive implementation (credential storage, token management)
- Includes proprietary system prompt engineering or AI tool definitions
- Orchestrates the integration between services in a way that is hard to replicate

---

## Complete File Classification

### OPEN SOURCE — MIT License

```
bin/
  opencern.js                     MIT   Node.js bootstrap, version gate, flag parsing

src/components/
  AIStream.tsx                    MIT   UI renderer for AI tokens and tool approval cards
  CommandPalette.tsx              MIT   Fuzzy-search command picker (no business logic)
  DataTable.tsx                   MIT   Generic sortable data table
  FilePreview.tsx                 MIT   Syntax-highlighted file viewer
  ProgressBar.tsx                 MIT   Animated progress indicator
  Prompt.tsx                      MIT   Terminal input with history and tab completion
  QuantumPanel.tsx                MIT   Quantum results display (rendering only)
  StatusBar.tsx                   MIT   Status indicator bar

src/utils/
  config.ts                       MIT   JSON config file at ~/.opencern/config.json
  history.ts                      MIT   Command history with deduplication

src/commands/
  doctor.ts                       MIT   Node.js, Docker, and API diagnostics
  help.ts                         MIT   Help text and ASCII banner
  status.ts                       MIT   System health check summary
  update.ts                       MIT   npm version comparison and update prompts
  viz.ts                          MIT   3D visualization launcher (desktop/browser/ASCII)

Configuration:
  package.json                    MIT   npm package manifest
  tsconfig.json                   MIT   TypeScript compiler configuration
  README.md                       MIT   Public documentation
```

### ENTERPRISE — Proprietary (LICENSE.enterprise)

```
src/
  app.tsx                    ENTERPRISE  Core REPL: agentic loop, command router,
                                         human-in-the-loop tool approval, state management

src/services/
  anthropic.ts               ENTERPRISE  @anthropic-ai/sdk wrapper; system prompt
                                         engineering; tool definitions (execute_python,
                                         execute_bash, opencern_cli); streaming loop;
                                         model management; usage tracking
  cern-api.ts                ENTERPRISE  Internal HTTP client for CERN data API
                                         (port 8080); dataset/download/process endpoints;
                                         auth header injection; retry logic
  docker.ts                  ENTERPRISE  Docker container orchestration; GHCR image
                                         registry references; service health polling;
                                         docker-compose template generation
  executor.ts                ENTERPRISE  Sandboxed Python/bash execution engine;
                                         safety blocklist (destructive patterns);
                                         matplotlib interception; resource estimation;
                                         image extraction from plots
  quantum.ts                 ENTERPRISE  Qiskit quantum service client (port 8082);
                                         job polling; IBM Quantum / AWS Braket backend
                                         selection; classification results parsing

src/utils/
  auth.ts                    ENTERPRISE  JWT token retrieval and requireAuth middleware
  keystore.ts                ENTERPRISE  Multi-platform credential storage:
                                         macOS Keychain → Linux Secret Service →
                                         AES-256-CBC encrypted file fallback

src/commands/
  ask.ts                     ENTERPRISE  AI analysis handler; file context injection;
                                         session context (datasets, processed files)
  auth.ts                    ENTERPRISE  OAuth2 device code flow against auth.opencern.io;
                                         browser launch; token polling; JWT storage
  config.ts                  ENTERPRISE  API key management (set/remove/list);
                                         interactive config wizard; key validation
  download.ts                ENTERPRISE  CERN dataset download pipeline (cern-api.ts)
  open.ts                    ENTERPRISE  File opening with CERN API ROOT metadata integration
  opask.ts                   ENTERPRISE  Split-view file preview + AI analysis
  process.ts                 ENTERPRISE  ROOT file data processing pipeline (cern-api.ts)
  quantum.ts                 ENTERPRISE  Quantum classification orchestration; event
                                         extraction; job polling; backend management
```

---

## Rationale for Key Decisions

### Why `src/app.tsx` is Enterprise

`app.tsx` is the orchestration layer that ties every service together into the
agentic REPL. It contains:
- The human-in-the-loop tool approval flow (competitive differentiator)
- Session state management connecting AI to data operations
- The command routing logic that reveals internal product architecture

Exposing the full orchestration would allow competitors to replicate the product's
core behavior with minimal effort.

### Why `src/components/` is Open Source

Components are pure UI rendering logic. `AIStream.tsx` for example renders tokens
and shows a tool approval card — but it has no knowledge of *which* tool is being
called or *why*. The decision logic lives in `app.tsx` (enterprise). Components
benefit significantly from community contributions: accessibility improvements,
cross-platform rendering fixes, keyboard handling edge cases.

### Why `src/services/anthropic.ts` is Enterprise

This file contains the system prompt that defines how the AI behaves as a particle
physics assistant. System prompt engineering is a core product capability. The
tool definitions (execute_python, execute_bash, opencern_cli) define the exact
interface between AI reasoning and code execution — this is the agentic
architecture that powers the product.

### Why `src/services/executor.ts` is Enterprise

The sandboxed execution engine's safety blocklist and resource estimation
heuristics represent significant engineering investment. The matplotlib interception
strategy (injecting Agg backend, capturing plt.show() calls, extracting images as
base64) is a non-obvious solution to a hard problem.

### Why `src/utils/keystore.ts` is Enterprise

Exposing the exact fallback chain (Keychain → Secret Service → AES file) and the
key derivation strategy could help attackers target the weakest link in specific
deployment environments. Security implementation benefits from defense-in-depth
through obscurity at the implementation layer.

### Why `src/commands/auth.ts` is Enterprise

Contains the OAuth2 device code endpoint URL (`auth.opencern.io`), polling
intervals, timeout values, and token storage logic. Exposing this makes the auth
infrastructure a targeted attack surface and reveals backend deployment details.

### Why `src/services/docker.ts` is Enterprise

Contains GHCR image registry paths, internal container names and port assignments,
and the docker-compose template. This reveals internal deployment architecture.

---

## What Contributors Can Build

Based on this boundary, community contributors can meaningfully improve:

1. **Terminal rendering quality** — better colors, layouts, border styles
2. **Keyboard navigation** — additional shortcuts, vim-mode, readline bindings
3. **File preview** — support for more file types in FilePreview.tsx
4. **Accessibility** — screen reader compatibility, reduced-motion support
5. **Internationalization** — output string externalization
6. **Diagnostics** — additional checks in doctor.ts
7. **Documentation** — README, command help text in help.ts
8. **Cross-platform** — Windows terminal support, WSL compatibility

---

## Keeping This Document Current

When adding a new source file, the author must:

1. Classify it as MIT or Enterprise using the framework at the top of this doc
2. Update the relevant table above
3. Add the appropriate license header to the file (see CONTRIBUTING.md)
4. Update `LICENSE.enterprise` Section 3 if the file is Enterprise
5. Update `CONTRIBUTING.md` tables if the file is Open Source

The `.github/CODEOWNERS` file must also be updated to include new files.

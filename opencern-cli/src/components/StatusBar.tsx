// TODO: Status Bar Component
//
// A persistent top bar showing real-time system health and session info.
//
// Layout:
//   ╔══════════════════════════════════════════════════════════════╗
//   ║  ⚛️ OpenCERN CLI v1.0.0  │  Docker ✅  │  API ✅  │  ⚛️ Q: local  ║
//   ╚══════════════════════════════════════════════════════════════╝
//
// Indicators:
//   - Docker: ✅ connected / ❌ not running / 🔄 connecting
//   - API: ✅ healthy / ❌ unreachable / 🔄 starting
//   - Quantum: "local" (simulator) / "ibm_brisbane" (real hardware) / ❌ not configured
//   - AI: ✅ configured / ⚠️ no API key
//
// Additional info (shown on hover or /status):
//   - Datasets cached locally (count + total size)
//   - Current working directory
//   - Active quantum backend + qubit count
//   - Anthropic model being used (claude-sonnet-4-20250514, etc.)

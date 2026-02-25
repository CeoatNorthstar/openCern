// TODO: Progress Bar Component
//
// A reusable animated progress bar for long-running operations.
//
// Styles:
//   - Download:  ⬇ Downloading atlas-higgs.zip ████████░░░░ 67%  45.2 MB/s
//   - Process:   ⚙ Processing 7/12 files       ██████░░░░░░ 58%
//   - Quantum:   ⚛ Running VQC circuit          ████░░░░░░░░ 33%  Shot 234/1000
//   - Upload:    ⬆ Uploading results            █████████░░░ 82%
//
// Features:
//   - Animated fill with smooth transition
//   - ETA calculation based on elapsed time and progress
//   - Speed display (MB/s for downloads, events/s for processing)
//   - Indeterminate mode (spinner) when total is unknown
//   - Color coding: blue for active, green for complete, red for error
//   - Multi-bar support (show multiple parallel operations)

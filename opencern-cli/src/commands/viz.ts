// TODO: /viz Command Handler
//
// Launches the 3D particle visualization.
//
// Usage:
//   /viz                    → Opens visualization of last processed data
//   /viz --file data.json   → Opens visualization of specific file
//   /viz --browser          → Opens in default browser instead of Electron
//
// Flow:
//   1. Checks if Electron desktop app is available
//   2. If yes: sends deep link (opencern://viz?file=data.json) to open Electron
//   3. If no: opens http://localhost:3000 in default browser
//   4. Falls back to a terminal-based ASCII visualization if neither available
//
// Terminal fallback (ASCII mode):
//   Shows a simplified 2D projection of particle tracks:
//     ° · · · * · · → muon (pT=45.2 GeV)
//     · · * · · · · → electron (pT=32.1 GeV)
//     · · · · · ° · → photon (pT=28.4 GeV)
//
// This command is a bridge between the CLI and desktop app — one of the
// reasons users might upgrade from CLI-only to the full desktop experience.

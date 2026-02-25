// TODO: Command Palette / Autocomplete Dropdown
//
// A floating dropdown that appears when the user types "/" in the prompt.
// Inspired by VS Code's command palette and Discord's slash commands.
//
// Behavior:
//   - Appears inline below/above the prompt (depending on terminal height)
//   - Shows all available slash commands with descriptions
//   - Fuzzy-filters as the user continues typing (e.g., "/do" matches "/download")
//   - Highlights the currently selected item
//   - ↑/↓ to navigate, Enter to select, Esc to dismiss
//   - Tab to autocomplete the selected command
//   - Shows command-specific argument hints after selection
//     (e.g., after selecting /ask, shows "--file <path>" as a hint)
//
// Commands to list:
//   /download    Download datasets from CERN Open Data
//   /process     Process ROOT files with C++ engine
//   /ask         Ask AI about physics or your data
//   /open        Inspect a ROOT or JSON file
//   /opask       Open a file and start AI analysis
//   /quantum     Run quantum computing analysis
//   /viz         Launch 3D particle visualization
//   /status      Show system status and connections
//   /config      Configure API keys and preferences
//   /history     Show command history
//   /clear       Clear the terminal
//   /help        Show help and shortcuts
//   /exit        Exit OpenCERN

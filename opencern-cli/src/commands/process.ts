// TODO: /process Command Handler
//
// Processes ROOT files using the C++ physics engine via Docker.
//
// Usage:
//   /process                      → Pick from local ROOT files interactively
//   /process --all                → Process all ROOT files in current dataset
//   /process --file data.root     → Process a specific file
//   /process --folder atlas-2024  → Process all ROOT files in a folder
//
// Flow:
//   1. Lists available ROOT files (calls API /files)
//   2. User selects file(s) to process
//   3. Calls API /process (single) or /process/folder (batch)
//   4. Polls /process/status for progress
//   5. Shows ProgressBar with file-by-file progress
//   6. On completion, shows summary: events found, particle types, peak HT
//   7. Asks if user wants to /open or /ask about the results
//   8. Updates session context with processing results
//
// The actual C++ processing happens inside Docker — this command
// just orchestrates the API calls and shows the TUI.

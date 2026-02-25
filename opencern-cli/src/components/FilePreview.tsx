// TODO: File Preview Component
//
// Renders a scrollable, syntax-highlighted preview of a file in the terminal.
//
// Supports:
//   - JSON files: pretty-printed with colored keys/values/brackets
//   - ROOT file metadata: shows tree names, branch counts, entry counts
//   - Plain text: raw display with line numbers
//
// Features:
//   - Scrollable with ↑/↓ when focused
//   - Line numbers in dim color on the left
//   - Search within file (Ctrl+F)
//   - Collapsible JSON nodes (press Enter on a key to expand/collapse)
//   - Truncation for very large files with "... N more lines" indicator
//   - Shows file stats at the bottom: size, lines, last modified
//
// Used by:
//   - /open command (full screen preview)
//   - /opask command (side panel preview alongside AI response)
//   - /ask --file (inline file reference)

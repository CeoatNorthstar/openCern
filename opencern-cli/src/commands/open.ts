// TODO: /open Command Handler
//
// Opens and inspects ROOT or JSON files in the terminal.
//
// Usage:
//   /open --root data.root     → Show ROOT file structure (trees, branches, entries)
//   /open --json results.json  → Pretty-print processed JSON with syntax highlighting
//   /open                      → Pick from local files interactively
//
// For ROOT files:
//   - Calls the API to extract metadata (tree names, branch names, entry counts)
//   - Shows a tree view of the ROOT file structure
//   - Allows drilling into specific branches
//
// For JSON files:
//   - Reads the processed event JSON
//   - Renders with <FilePreview /> component
//   - Shows event count, metadata summary at the top
//   - Collapsible sections for events array
//   - Searchable (Ctrl+F to find specific particle types, values)
//
// For any file:
//   - Shows file stats: size, created, modified
//   - Esc to close and return to prompt

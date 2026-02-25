// TODO: Command History Manager
//
// Persists and retrieves command history across sessions.
//
// Storage: ~/.opencern/history.json
//
// Key methods:
//   - add(command): Add a command to history
//   - getAll(): Get full history (newest first)
//   - search(query): Fuzzy search history
//   - getPrevious(): Navigate backward (↑ key)
//   - getNext(): Navigate forward (↓ key)
//   - clear(): Clear all history
//
// Features:
//   - Persists across CLI sessions (saved to disk)
//   - Deduplicates consecutive identical commands
//   - Max 1000 entries (FIFO eviction)
//   - Timestamps for each entry
//   - Excludes sensitive commands (/config --set ai-key) from history
//   - Reverse-search mode (Ctrl+R): fuzzy-find through history

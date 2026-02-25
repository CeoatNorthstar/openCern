// TODO: Main Input Prompt Component
//
// The persistent input line at the bottom of the TUI: `opencern ❯ _`
//
// Responsibilities:
//   - Renders the prompt prefix with styled "opencern ❯" text
//   - Captures user keyboard input character-by-character
//   - Supports full line editing (cursor movement, backspace, delete, home/end)
//   - Triggers autocomplete dropdown on Tab key
//   - Triggers command palette on "/" key
//   - Submits input on Enter and calls onSubmit(input) prop
//   - Navigates command history on ↑/↓ arrow keys
//   - Passes through global shortcuts (Ctrl+D, etc.) to parent
//   - Shows inline hint text when input is empty ("Type / for commands, or ask a question")
//   - Supports multi-line input for long AI prompts (Shift+Enter for newline)

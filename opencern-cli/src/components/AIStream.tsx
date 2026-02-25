// TODO: AI Streaming Response Component
//
// Renders Claude's responses token-by-token as they stream in,
// similar to how Claude Code displays AI output in the terminal.
//
// Features:
//   - Token-by-token rendering with a blinking cursor at the end
//   - Markdown rendering in terminal (bold, italic, code blocks, lists)
//   - Code blocks with syntax highlighting (uses chalk or similar)
//   - Thinking/reasoning indicator: "🤔 Analyzing your dataset..." spinner
//   - Stop generation button (Esc to cancel mid-stream)
//   - Auto-scroll as new tokens arrive
//   - Copy full response to clipboard (Ctrl+C after completion)
//   - Response metadata footer: model used, tokens consumed, latency
//
// Props:
//   - messages: conversation history for context display
//   - isStreaming: boolean for cursor/spinner state
//   - onCancel: callback when user hits Esc during streaming

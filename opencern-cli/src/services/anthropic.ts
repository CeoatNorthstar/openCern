// TODO: Anthropic Claude SDK Service
//
// Wrapper around the @anthropic-ai/sdk package for AI-powered physics analysis.
//
// Responsibilities:
//   - Initialize Anthropic client with user's API key (from keystore)
//   - Maintain conversation history per session
//   - Build physics-aware system prompts
//   - Stream responses with token-by-token callbacks
//   - Handle rate limits, errors, and retries gracefully
//   - Track token usage for user awareness
//
// System prompt template:
//   "You are a particle physics analysis assistant integrated into OpenCERN,
//    an open-source CERN data analysis platform. You have access to the user's
//    current session context including datasets, processed results, and
//    quantum analysis outputs. Explain physics clearly using proper terminology.
//    Reference real papers when relevant. Suggest analysis steps."
//
// Key methods:
//   - initClient(apiKey): Initialize with user's Anthropic API key
//   - streamMessage(prompt, context, onToken): Stream a response
//   - addContext(sessionData): Update session context for AI
//   - getUsage(): Return token count for current session
//   - clearHistory(): Reset conversation
//
// Models supported:
//   - claude-sonnet-4-20250514 (default — best balance of speed + quality)
//   - claude-3-5-haiku (fast, cheaper — for quick queries)
//   - claude-3-opus (deepest reasoning — for complex physics analysis)

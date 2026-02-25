// TODO: /ask Command Handler
//
// AI-powered analysis and Q&A using the Anthropic Claude SDK.
//
// Usage:
//   /ask what particles are in my data?     → General question with session context
//   /ask --file atlas.json                  → Analyze a specific processed file
//   /ask --explain                          → Explain the last operation's results
//
// Flow:
//   1. Builds a system prompt with physics context:
//      - What datasets are loaded in this session
//      - What was processed and results summary
//      - Relevant physics terminology and units
//   2. If --file specified, reads the JSON and includes event data in context
//   3. Sends message to Anthropic API with streaming enabled
//   4. Renders response via <AIStream /> component (token-by-token)
//   5. Maintains conversation history for follow-up questions
//   6. User can keep asking follow-ups without re-specifying /ask
//
// AI Context includes:
//   - Session history (what was downloaded, processed, analyzed)
//   - Dataset metadata (experiment, energy, luminosity)
//   - Event statistics (particle counts, energy distributions)
//   - Previous AI responses in this conversation
//
// Special capabilities:
//   - Can suggest /quantum analysis when appropriate
//   - Can recommend specific cuts or filters
//   - Explains physics concepts at the user's level
//   - References real papers and CERN documentation

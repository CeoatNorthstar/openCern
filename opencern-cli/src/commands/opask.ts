// TODO: /opask Command Handler
//
// Combined Open + Ask — opens a file and immediately starts AI analysis.
// This is the power-user command for quick insights.
//
// Usage:
//   /opask results.json           → Open file + AI analysis in split view
//   /opask atlas-higgs.json       → Same, but for a specific dataset
//
// Layout (split terminal):
//   ┌─ AI Analysis ──────────┬─ File Preview ──────────────┐
//   │                        │  {                           │
//   │  This dataset shows    │    "events": [               │
//   │  evidence of Z→μμ      │      { "pt": 45.2, ... }    │
//   │  decays with a peak    │    ],                        │
//   │  at 91.2 GeV...        │    "metadata": { ... }       │
//   │                        │  }                           │
//   └────────────────────────┴─────────────────────────────┘
//
// Flow:
//   1. Reads the specified JSON file
//   2. Renders side-by-side: <AIStream /> on left, <FilePreview /> on right
//   3. Sends file contents to Claude with physics analysis prompt
//   4. AI streams its analysis while user can scroll through the file
//   5. After analysis, user can ask follow-up questions
//   6. File preview highlights sections that AI references

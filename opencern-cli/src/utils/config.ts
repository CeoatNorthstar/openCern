// TODO: User Configuration Manager
//
// Reads and writes user preferences from ~/.opencern/config.json
//
// Config schema:
//   {
//     "dataDir": "~/opencern-datasets",      // Where downloads are stored
//     "defaultModel": "claude-sonnet-4-20250514",   // Anthropic model
//     "quantumBackend": "local",              // local | ibm | braket
//     "theme": "dark",                        // Color theme
//     "autoStartDocker": true,                // Auto-start containers on launch
//     "maxEvents": 5000,                      // Max events to display
//     "apiBaseUrl": "http://localhost:8080",   // OpenCERN API URL
//     "quantumShots": 1000,                   // Default quantum shots
//     "debug": false                          // Verbose logging
//   }
//
// Key methods:
//   - load(): Read config from disk (create defaults if missing)
//   - save(config): Write config to disk
//   - get(key): Get a single config value
//   - set(key, value): Set a single config value
//   - reset(): Reset to defaults
//   - getConfigPath(): Return ~/.opencern/config.json path
//
// First-run:
//   - Creates ~/.opencern/ directory if missing
//   - Creates config.json with sensible defaults
//   - Prompts user to configure required settings

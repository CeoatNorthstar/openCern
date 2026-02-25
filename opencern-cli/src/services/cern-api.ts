// TODO: OpenCERN API Client
//
// HTTP client for communicating with the OpenCERN API container (port 8080).
// Wraps all the API endpoints used by the CLI commands.
//
// Endpoints used:
//   GET  /health                    → Health check
//   GET  /datasets/search           → Search CERN Open Data catalog
//   POST /downloads/start           → Start a file download
//   GET  /downloads/status          → Check download progress
//   GET  /files                     → List local files
//   GET  /files/:folder             → List folder contents
//   POST /process                   → Process single ROOT file
//   POST /process/folder            → Process all ROOT files in folder
//   GET  /process/status            → Check processing progress
//   DELETE /files/:name             → Delete a file or folder
//
// Features:
//   - Base URL configurable (default http://localhost:8080)
//   - Automatic retry with exponential backoff
//   - Timeout handling (30s default, 5min for downloads)
//   - Error normalization (convert API errors to user-friendly messages)
//   - Request/response logging in debug mode

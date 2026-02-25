// TODO: Docker Service
//
// Manages Docker container lifecycle for the CLI.
// Starts/stops the OpenCERN containers that the CLI depends on.
//
// Key methods:
//   - isDockerRunning(): Check if Docker daemon is available
//   - startContainers(): Run `docker compose -p opencern up -d`
//   - stopContainers(): Run `docker compose -p opencern stop`
//   - getContainerStatus(): Check which containers are running
//   - isApiReady(): Poll localhost:8080/health
//   - isQuantumReady(): Poll quantum container health
//   - getLogs(container): Stream container logs
//
// Auto-start behavior:
//   - On CLI launch, check if containers are running
//   - If not, offer to start them (or auto-start if configured)
//   - Show startup progress in StatusBar
//   - Don't start quantum container unless /quantum is used
//
// The CLI requires these containers:
//   - opencern-api (port 8080) — Required always
//   - opencern-streamer (port 9001/9002) — For data streaming
//   - opencern-xrootd (port 8081) — For CERN data downloads
//   - opencern-quantum (new) — Only when /quantum is used
//   - opencern-frontend (port 3000) — NOT needed for CLI

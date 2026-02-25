const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain
const shell = electron.shell
const dialog = electron.dialog
const path = require('path')
const fs = require('fs')
const { exec, spawn } = require('child_process')
const http = require('http')

let win;
let nextServer; // Child process for Next.js standalone server

// Full PATH for finding Docker on macOS (Homebrew, system, Docker Desktop)
const DOCKER_PATH = '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin:/Applications/Docker.app/Contents/Resources/bin';

process.on('uncaughtException', (err) => {
  console.error("FATAL UNCAUGHT:", err);
});

// Enforce single instance lock so deep links route to the existing window
const gotTheLock = app ? app.requestSingleInstanceLock() : false;

if (!gotTheLock) {
  if (app) app.quit()
} else {
  // Register opencern:// protocol
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('opencern', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('opencern')
  }
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      const url = commandLine.pop()
      if (url.startsWith('opencern://')) {
        win.webContents.send('sso-auth-callback', url)
      }
    }
  })

  // ── Docker helpers ──

  async function checkDocker() {
    return new Promise((resolve) => {
      exec('docker info', { env: { ...process.env, PATH: DOCKER_PATH } }, (error) => resolve(!error));
    });
  }

  function dockerExec(command, cwd) {
    /**
     * Run a docker compose command, always using -p opencern for a consistent
     * project name regardless of where the compose file lives.
     */
    return new Promise((resolve) => {
      const fullCmd = `docker compose -p opencern ${command}`;
      console.log(`[Docker] Running: ${fullCmd}`);
      console.log(`[Docker] CWD: ${cwd}`);
      
      exec(fullCmd, {
        cwd,
        env: { ...process.env, PATH: DOCKER_PATH },
        timeout: 300000, // 5 minute timeout for builds
      }, (err, stdout, stderr) => {
        if (stdout) console.log(`[Docker] stdout: ${stdout.trim()}`);
        if (stderr) console.log(`[Docker] stderr: ${stderr.trim()}`);
        if (err) console.error(`[Docker] Error: ${err.message}`);
        resolve({ err, stdout, stderr });
      });
    });
  }

  // ── Splash Screen ──

  function showLoadingWindow() {
    const loadWin = new BrowserWindow({
      width: 900, height: 600, frame: false, transparent: true, backgroundColor: '#080b14', alwaysOnTop: true,
      webPreferences: { nodeIntegration: true, webSecurity: false }
    });
    
    const videoPath = app.isPackaged 
        ? path.join(process.resourcesPath, 'media/videos/startup_video/720p30/StartupLogo.mp4')
        : path.join(__dirname, '../../../../app/electron/media/videos/startup_video/720p30/StartupLogo.mp4');

    const videoUrl = 'file://' + videoPath.replace(/\\/g, '/');

    const htmlContent = `
      <body style="font-family: sans-serif; background: #080b14; color: white; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100vh; margin:0; overflow:hidden;">
        <video width="900" height="600" autoplay loop muted playsinline style="object-fit: cover;">
            <source src="${videoUrl}" type="video/mp4">
        </video>
        <div style="position: absolute; bottom: 20px; display: flex; flex-direction: column; align-items: center;">
            <p id="status" style="color:#9ca3af; font-size:13px; margin-bottom:8px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">Starting isolated physics environments...</p>
            <div style="width:20px; height:20px; border:2px solid #1f2937; border-top:2px solid #3b82f6; border-radius:50%; animation: spin 1s linear infinite;"></div>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      </body>`;
      
    loadWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    return loadWin;
  }

  // ── Port polling ──

  async function pollPort(port, timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const ok = await new Promise((resolve) => {
          const req = http.get(`http://127.0.0.1:${port}`, (res) => {
            resolve(res.statusCode >= 200 && res.statusCode < 500);
          });
          req.on('error', () => resolve(false));
          req.setTimeout(2000, () => { req.destroy(); resolve(false); });
        });
        if (ok) return true;
      } catch(e) {}
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  // ── Next.js standalone server ──

  function startNextServer() {
    if (!app.isPackaged) {
      console.log("Dev mode — skipping Next.js server start (use `npm run dev` in next-ui)");
      return null;
    }

    const standaloneDir = path.join(process.resourcesPath, 'next-standalone');
    const serverScript = path.join(standaloneDir, 'server.js');
    
    // Verify the server script exists
    if (!fs.existsSync(serverScript)) {
      console.error("FATAL: Next.js server.js not found at:", serverScript);
      console.error("Contents of standalone dir:", fs.readdirSync(standaloneDir).join(', '));
      return null;
    }

    console.log("Starting Next.js standalone server...");
    console.log("  Script:", serverScript);
    console.log("  CWD:", standaloneDir);

    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
      PORT: '3000',
      HOSTNAME: '0.0.0.0',
      NODE_ENV: 'production',
    };

    const child = spawn(process.execPath, [serverScript], {
      cwd: standaloneDir,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => {
      console.log(`[Next.js] ${data.toString().trim()}`);
    });
    child.stderr.on('data', (data) => {
      console.error(`[Next.js ERR] ${data.toString().trim()}`);
    });
    child.on('error', (err) => {
      console.error("Next.js server process error:", err);
    });
    child.on('exit', (code, signal) => {
      console.log(`Next.js server exited: code=${code} signal=${signal}`);
    });

    return child;
  }

  // ── Main Window ──

  async function createWindow() {
    win = new BrowserWindow({
      width: 1400,
      height: 900,
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#080b14',
      show: false,
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false, 
      },
    })

    // 1. Check Docker
    console.log("=== OpenCERN Startup ===");
    console.log("Packaged:", app.isPackaged);
    if (app.isPackaged) {
      console.log("Resources:", process.resourcesPath);
    }

    console.log("Step 1: Checking Docker...");
    const hasDocker = await checkDocker();
    console.log("Docker available:", hasDocker);
    if (!hasDocker) {
      dialog.showErrorBox("Docker Required", "OpenCERN requires Docker Desktop. Please install and launch Docker Desktop, then restart OpenCERN.");
      app.quit();
      return;
    }

    // 2. Show splash
    const loadWin = showLoadingWindow();
    const splashStartTime = Date.now();

    // 3. Wait for splash video
    console.log("Step 2: Playing startup video...");
    const elapsedVideo = Date.now() - splashStartTime;
    if (elapsedVideo < 6000) {
      await new Promise(r => setTimeout(r, 6000 - elapsedVideo));
    }

    // 4. Start Next.js server (packaged only)
    console.log("Step 3: Starting Next.js frontend...");
    nextServer = startNextServer();

    // 5. Start Docker containers
    //    In packaged mode: just `up -d` (no --build) using pre-built images
    //    In dev mode: `up -d --build` to rebuild from source
    console.log("Step 4: Starting Docker containers...");
    const composePath = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../../../../');
    
    if (app.isPackaged) {
      // For packaged app, just start containers (don't rebuild)
      // Images should already exist from dev builds
      await dockerExec('up -d', composePath);
    } else {
      await dockerExec('up -d --build', composePath);
    }

    // 6. Wait for API backend
    console.log("Step 5: Waiting for API (port 8080)...");
    const isApiHealthy = await pollPort(8080, 60000);
    console.log("API ready:", isApiHealthy);
    if (!isApiHealthy) {
      loadWin.close();
      dialog.showErrorBox(
        "Backend Timeout",
        "Docker containers failed to start within 60 seconds.\n\n" +
        "Make sure the OpenCERN containers are built:\n" +
        "  1. Open Terminal\n" +
        "  2. cd to the opencern project\n" +
        "  3. Run: docker compose up -d --build\n\n" +
        "Then restart OpenCERN."
      );
      app.exit(1);
      return;
    }

    // 7. Wait for Next.js frontend
    console.log("Step 6: Waiting for frontend (port 3000)...");
    const isFrontendReady = await pollPort(3000, 30000);
    console.log("Frontend ready:", isFrontendReady);
    if (!isFrontendReady) {
      loadWin.close();
      dialog.showErrorBox(
        "Frontend Timeout",
        "The Next.js frontend failed to start within 30 seconds.\n\n" +
        "Please restart OpenCERN. If this persists, run the app\n" +
        "from Terminal to see logs:\n" +
        "  /Applications/OpenCERN.app/Contents/MacOS/OpenCERN"
      );
      app.exit(1);
      return;
    }

    // 8. Show main window
    console.log("Step 7: Loading main window...");
    loadWin.close();
    win.show();
    win.loadURL('http://localhost:3000')
    console.log("=== OpenCERN Ready ===");
  }

  app.whenReady().then(createWindow)

  // macOS deep link handler
  app.on('open-url', (event, url) => {
    event.preventDefault()
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      win.webContents.send('sso-auth-callback', url)
    } else {
      app.whenReady().then(() => {
        createWindow();
        win.webContents.once('did-finish-load', () => {
          win.webContents.send('sso-auth-callback', url);
        });
      });
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  // Clean shutdown
  app.on('before-quit', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      const composePath = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../../../../');
      console.log("Shutting down...");

      // Kill Next.js server
      if (nextServer) {
        console.log("Stopping Next.js server...");
        nextServer.kill('SIGTERM');
        nextServer = null;
      }

      // Stop Docker containers
      exec(`docker compose -p opencern stop`, {
        cwd: composePath,
        env: { ...process.env, PATH: DOCKER_PATH },
      }, () => {
        app.isQuiting = true;
        app.exit(0);
      });
    }
  });

  // Proxy shell.openExternal requests from Renderer
  ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url)
  })
}

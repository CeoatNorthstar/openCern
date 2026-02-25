const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain
const shell = electron.shell
const dialog = electron.dialog
const path = require('path')
const { exec, spawn } = require('child_process')
const http = require('http')

let win;
let nextServer; // Child process for Next.js standalone server

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
    // Windows/Linux deep link handler
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      
      const url = commandLine.pop()
      if (url.startsWith('opencern://')) {
        win.webContents.send('sso-auth-callback', url)
      }
    }
  })

  async function checkDocker() {
    return new Promise((resolve) => {
      exec('docker info', { env: { ...process.env, PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin' } }, (error) => resolve(!error));
    });
  }

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
            <p style="color:#9ca3af; font-size:13px; margin-bottom:8px; text-shadow: 0 2px 4px rgba(0,0,0,0.8);">Starting isolated physics environments...</p>
            <div style="width:20px; height:20px; border:2px solid #1f2937; border-top:2px solid #3b82f6; border-radius:50%; animation: spin 1s linear infinite;"></div>
        </div>
        <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
      </body>`;
      
    loadWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));
    return loadWin;
  }

  async function pollPort(port, timeoutMs=30000) {
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
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
  }

  function startNextServer() {
    if (!app.isPackaged) {
      // In dev mode, Next.js dev server is started separately via `npm run dev`
      console.log("Dev mode — skipping Next.js server start (use `npm run dev` in next-ui)");
      return null;
    }

    // In packaged mode, spawn the standalone Next.js server
    const standaloneDir = path.join(process.resourcesPath, 'next-standalone');
    const serverScript = path.join(standaloneDir, 'server.js');
    
    console.log("Starting Next.js standalone server from:", standaloneDir);

    const env = {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',  // Critical: makes Electron binary act as Node.js
      PORT: '3000',
      HOSTNAME: '127.0.0.1',
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
      console.error(`[Next.js] ${data.toString().trim()}`);
    });
    child.on('error', (err) => {
      console.error("Next.js server failed to start:", err);
    });
    child.on('exit', (code) => {
      console.log(`Next.js server exited with code ${code}`);
    });

    return child;
  }

  async function createWindow() {
    win = new BrowserWindow({
      width: 1400,
      height: 900,
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#080b14',
      show: false, // hide initially securely
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false, 
      },
    })

    console.log("Checking for Docker presence...");
    const hasDocker = await checkDocker();
    console.log("Docker presence resolved:", hasDocker);
    if (!hasDocker) {
      dialog.showErrorBox("Docker Required", "OpenCERN requires Docker Desktop to containerize its physics simulation backends. Please install and launch Docker Desktop to proceed.");
      app.quit();
      return;
    }

    const loadWin = showLoadingWindow();
    const splashStartTime = Date.now();

    const composePath = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../../../../');
    
    const env = { ...process.env, PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin' };
    
    // Ensure the intro video finishes playing before booting Docker
    console.log("Waiting for video to finish prior to Docker boot...");
    const elapsedVideo = Date.now() - splashStartTime;
    if (elapsedVideo < 6000) {
        await new Promise(r => setTimeout(r, 6000 - elapsedVideo));
    }

    // Start the Next.js standalone server (production only)
    console.log("Starting Next.js frontend server...");
    nextServer = startNextServer();

    console.log("Building and Starting Containers...");
    await new Promise((resolve) => {
      exec('docker compose up -d --build', { cwd: composePath, env }, (err, stdout, stderr) => {
        if (err && !app.isPackaged) {
            console.warn("Docker compose up warning:", err);
        }
        resolve();
      });
    });

    // Wait for API backend (port 8080)
    console.log("Waiting for API backend (port 8080)...");
    const isApiHealthy = await pollPort(8080, 30000);
    console.log("API backend ready:", isApiHealthy);
    if (!isApiHealthy) {
       loadWin.close();
       dialog.showErrorBox("Backend Timeout", "The physics microservices failed to boot within 30 seconds. Please check Docker or restart OpenCERN.");
       app.exit(1);
       return;
    }

    // Wait for Next.js frontend (port 3000)
    console.log("Waiting for Next.js frontend (port 3000)...");
    const isFrontendReady = await pollPort(3000, 15000);
    console.log("Frontend ready:", isFrontendReady);
    if (!isFrontendReady) {
       loadWin.close();
       dialog.showErrorBox("Frontend Timeout", "The Next.js frontend failed to start within 15 seconds. Please restart OpenCERN.");
       app.exit(1);
       return;
    }

    loadWin.close();
    win.show();
    win.loadURL('http://localhost:3000')
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
      // If the app was closed and opened via deep link
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

  // Ensure Docker cleanly spins down background tasks when exiting OpenCERN
  app.on('before-quit', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      const composePath = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../../../../');
      console.log("Shutting down local physics containers...");
      const env = { ...process.env, PATH: '/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin' };

      // Kill the Next.js server
      if (nextServer) {
        console.log("Stopping Next.js server...");
        nextServer.kill('SIGTERM');
        nextServer = null;
      }

      exec('docker compose stop', { cwd: composePath, env }, () => {
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

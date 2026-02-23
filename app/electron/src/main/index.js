const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain
const shell = electron.shell
const dialog = electron.dialog
const path = require('path')
const { exec } = require('child_process')
const http = require('http')

let win;

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
    
    // We must load an actual local HTML file or construct a data URI 
    // that has the correct privileges to load local file:// resources.
    // The safest way is to use a Data URL but encode the video as absolute path.
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

  async function pollHealth(timeoutMs=30000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const ok = await new Promise((resolve) => {
          const req = http.get('http://127.0.0.1:8080/health', (res) => {
            resolve(res.statusCode === 200);
          });
          req.on('error', () => resolve(false));
        });
        if (ok) return true;
      } catch(e) {}
      await new Promise(r => setTimeout(r, 500));
    }
    return false;
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

    console.log("Building and Starting Containers...");
    await new Promise((resolve) => {
      exec('docker compose up -d --build', { cwd: composePath, env }, (err, stdout, stderr) => {
        if (err && !app.isPackaged) {
            console.warn("Docker compose up warning:", err);
        }
        resolve();
      });
    });

    console.log("Entering healthcheck polling loop...");
    // Block the renderer URL from loading until the Python FastAPI healthcheck succeeds
    const isHealthy = await pollHealth();
    console.log("Healthcheck loop unblocked. isHealthy:", isHealthy);
    if (!isHealthy) {
       loadWin.close();
       dialog.showErrorBox("Backend Timeout", "The physics microservices failed to boot within 30 seconds. Please check Docker or restart OpenCERN.");
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

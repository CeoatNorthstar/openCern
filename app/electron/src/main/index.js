const electron = require('electron')
const app = electron.app
const BrowserWindow = electron.BrowserWindow
const ipcMain = electron.ipcMain
const shell = electron.shell
const dialog = electron.dialog
const path = require('path')
const { exec } = require('child_process')
const http = require('http')
const DockerManager = require('./docker-manager')

let win;

// Full PATH that covers Docker on all macOS installations
const DOCKER_PATH = [
  '/usr/local/bin',
  '/opt/homebrew/bin',
  '/usr/bin',
  '/bin',
  '/usr/sbin',
  '/sbin',
  '/Applications/Docker.app/Contents/Resources/bin',
  process.env.PATH || '',
].join(':');

process.on('uncaughtException', (err) => {
  console.error("FATAL:", err);
});

const gotTheLock = app ? app.requestSingleInstanceLock() : false;

if (!gotTheLock) {
  if (app) app.quit()
} else {
  // Protocol registration
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient('opencern', process.execPath, [path.resolve(process.argv[1])])
    }
  } else {
    app.setAsDefaultProtocolClient('opencern')
  }

  app.on('second-instance', (event, commandLine) => {
    if (win) {
      if (win.isMinimized()) win.restore()
      win.focus()
      const url = commandLine.pop()
      if (url && url.startsWith('opencern://')) {
        win.webContents.send('sso-auth-callback', url)
      }
    }
  })

  // ── Helpers ──

  function dockerEnv() {
    return { ...process.env, PATH: DOCKER_PATH };
  }

  function composePath() {
    return app.isPackaged ? process.resourcesPath : path.resolve(__dirname, '../../../../');
  }

  function runDocker(args) {
    return new Promise((resolve) => {
      const cmd = `docker compose -p opencern ${args}`;
      console.log(`[Docker] ${cmd}`);
      exec(cmd, { cwd: composePath(), env: dockerEnv(), timeout: 300000 }, (err, stdout, stderr) => {
        if (stdout) console.log(`[Docker] ${stdout.trim()}`);
        if (stderr) console.log(`[Docker] ${stderr.trim()}`);
        if (err)    console.error(`[Docker] Error: ${err.message}`);
        resolve(!err);
      });
    });
  }

  async function isDockerRunning() {
    return new Promise((resolve) => {
      exec('docker info', { env: dockerEnv(), timeout: 10000 }, (err) => resolve(!err));
    });
  }

  async function waitForPort(port, timeoutMs = 90000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const ok = await new Promise((resolve) => {
        const req = http.get(`http://127.0.0.1:${port}`, (res) => {
          resolve(res.statusCode >= 200 && res.statusCode < 500);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(2000, () => { req.destroy(); resolve(false); });
      });
      if (ok) return true;
      await new Promise(r => setTimeout(r, 1000));
    }
    return false;
  }

  // ── Splash ──

  function showSplash() {
    const loadWin = new BrowserWindow({
      width: 900, height: 600, frame: false, transparent: true,
      backgroundColor: '#080b14', alwaysOnTop: true,
      webPreferences: { nodeIntegration: true, webSecurity: false }
    });

    const videoPath = app.isPackaged
      ? path.join(process.resourcesPath, 'media/videos/startup_video/720p30/StartupLogo.mp4')
      : path.join(__dirname, '../../../../app/electron/media/videos/startup_video/720p30/StartupLogo.mp4');

    const html = `<body style="font-family:sans-serif;background:#080b14;color:white;display:flex;flex-direction:column;align-items:center;justify-content:center;height:100vh;margin:0;overflow:hidden">
      <video width="900" height="600" autoplay loop muted playsinline style="object-fit:cover"><source src="file://${videoPath.replace(/\\/g,'/')}" type="video/mp4"></video>
      <div style="position:absolute;bottom:20px;display:flex;flex-direction:column;align-items:center">
        <p id="s" style="color:#9ca3af;font-size:13px;margin-bottom:8px;text-shadow:0 2px 4px rgba(0,0,0,.8)">Starting physics environments…</p>
        <div style="width:20px;height:20px;border:2px solid #1f2937;border-top:2px solid #3b82f6;border-radius:50%;animation:spin 1s linear infinite"></div>
      </div>
      <style>@keyframes spin{100%{transform:rotate(360deg)}}</style></body>`;

    loadWin.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html));
    return loadWin;
  }

  // ── Main ──

  async function createWindow() {
    console.log("=== OpenCERN ===");
    console.log("Packaged:", app.isPackaged);
    console.log("Compose dir:", composePath());

    // 1. Docker check
    const dockerOk = await isDockerRunning();
    console.log("Docker:", dockerOk ? "OK" : "NOT RUNNING");
    if (!dockerOk) {
      dialog.showErrorBox("Docker Required",
        "Docker Desktop is not running.\n\nPlease start Docker Desktop and try again.");
      app.quit();
      return;
    }

    // 2. Splash
    const splash = showSplash();
    await new Promise(r => setTimeout(r, 5000)); // Let video play

    // 3. Docker Auto-Pull & Update Check
    const dockerManager = new DockerManager(dockerEnv(), composePath());
    const imagesPresent = await dockerManager.areImagesPresent();

    if (!imagesPresent) {
      console.log("First launch: missing images. Pulling...");
      await splash.webContents.executeJavaScript(`document.getElementById('s').innerText = 'Downloading OpenCERN Engine... This may take a few minutes.'`);
      try {
        await dockerManager.pullImages((msg) => {
          splash.webContents.executeJavaScript(`document.getElementById('s').innerText = ${JSON.stringify('Downloading: ' + msg)}`).catch(()=>{});
        });
      } catch (err) {
        dialog.showErrorBox("Startup Failed", "Failed to download the OpenCERN Engine containers.\\n\\n" + err.message);
        app.quit();
        return;
      }
      await splash.webContents.executeJavaScript(`document.getElementById('s').innerText = 'Starting physics environments...'`);
    } else {
      console.log("Images present. Checking for updates in background...");
      // Check for updates asynchronously so we don't block startup too long
      const hasUpdate = await Promise.race([
        dockerManager.checkForUpdates(),
        new Promise(r => setTimeout(() => r(false), 3000)) // 3s timeout for ping check
      ]);
      
      if (hasUpdate) {
        const result = dialog.showMessageBoxSync({
          type: 'info',
          buttons: ['Update Now', 'Skip for now'],
          title: 'Update Available',
          message: 'A newer version of the OpenCERN engine is available. Would you like to download it now? (Recommended for performance and bug fixes)'
        });
        if (result === 0) {
          await splash.webContents.executeJavaScript(`document.getElementById('s').innerText = 'Downloading Update... Please wait.'`);
          try {
             await dockerManager.pullImages((msg) => {
               splash.webContents.executeJavaScript(`document.getElementById('s').innerText = ${JSON.stringify('Updating: ' + msg)}`).catch(()=>{});
             });
          } catch (err) {
             console.error("Update failed", err);
          }
          await splash.webContents.executeJavaScript(`document.getElementById('s').innerText = 'Starting physics environments...'`);
        }
      }
    }

    // 4. Start ALL containers (frontend + API + streamer + xrootd)
    console.log("Starting containers...");
    await runDocker('up -d');

    // 4. Wait for frontend (port 3000) — this is the gate
    console.log("Waiting for frontend (port 3000)...");
    const frontendOk = await waitForPort(3000, 90000);
    console.log("Frontend:", frontendOk ? "READY" : "TIMEOUT");

    if (!frontendOk) {
      splash.close();
      dialog.showErrorBox("Startup Failed",
        "Containers didn't start in time.\n\n" +
        "Try running this in Terminal to debug:\n" +
        "  docker compose -p opencern up --build\n\n" +
        "Then restart OpenCERN.");
      app.exit(1);
      return;
    }

    // 6. Also wait for API (port 8080)
    console.log("Waiting for API (port 8080)...");
    const apiOk = await waitForPort(8080, 30000);
    console.log("API:", apiOk ? "READY" : "TIMEOUT (continuing anyway)");

    // 7. Show main window
    win = new BrowserWindow({
      width: 1400, height: 900,
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#080b14',
      show: false,
      webPreferences: { nodeIntegration: true, contextIsolation: false },
    });

    win.webContents.setWindowOpenHandler(({ url }) => {
      if (url.startsWith('http://') || url.startsWith('https://')) {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    });

    splash.close();
    win.show();
    win.loadURL('http://localhost:3000');
    console.log("=== Ready ===");
  }

  app.whenReady().then(createWindow);

  // macOS deep link
  app.on('open-url', (event, url) => {
    event.preventDefault();
    if (win) {
      if (win.isMinimized()) win.restore();
      win.focus();
      win.webContents.send('sso-auth-callback', url);
    }
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })

  // Shutdown
  app.on('before-quit', (e) => {
    if (!app.isQuiting) {
      e.preventDefault();
      console.log("Shutting down containers...");
      exec('docker compose -p opencern stop', { cwd: composePath(), env: dockerEnv() }, () => {
        app.isQuiting = true;
        app.exit(0);
      });
    }
  });

  ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url)
  })
}

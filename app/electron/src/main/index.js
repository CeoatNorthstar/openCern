const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')

let win;

// Register opencern:// protocol
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('opencern', process.execPath, [path.resolve(process.argv[1])])
  }
} else {
  app.setAsDefaultProtocolClient('opencern')
}

// Enforce single instance lock so deep links route to the existing window
const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
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

  function createWindow() {
    win = new BrowserWindow({
      width: 1400,
      height: 900,
      titleBarStyle: 'hiddenInset',
      backgroundColor: '#080b14',
      webPreferences: {
        nodeIntegration: true,
        contextIsolation: false, // Required for IPC and dynamic routing within Next.js shell
      },
    })

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

  // Proxy shell.openExternal requests from Renderer
  ipcMain.on('open-external-url', (event, url) => {
    shell.openExternal(url)
  })
}

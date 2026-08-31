const { app, BrowserWindow, globalShortcut } = require('electron');
const path = require('path');
const url = require('url');

let mainWindow;

// Set userData directory to avoid Windows temp lock issues
const userDataDir = path.join(app.getPath('appData'), 'BillBookPOS_Data');
app.setPath('userData', userDataDir);

// Handle single instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

function createWindow() {
  const isDev = process.env.NODE_ENV === 'development';
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    title: 'ROYAL FASHION MALL - Clothing POS & Billing System',
    icon: path.join(__dirname, '../public/favicon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false,
      devTools: true,
    },
    autoHideMenuBar: true,
    frame: true,
  });

  const distPath = path.resolve(__dirname, '..', 'dist', 'index.html');
  const fileUrl = url.pathToFileURL(distPath).href;
  console.log('Loading app from URL:', fileUrl);

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
  } else {
    mainWindow.loadURL(fileUrl).catch(err => {
      console.error('Failed to load file URL:', err);
    });
  }

  // WebContents event logs for debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Page failed to load:', errorCode, errorDescription, validatedURL);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('Page loaded successfully!');
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

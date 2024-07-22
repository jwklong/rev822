const { app, BrowserWindow } = require('electron/main')
const path = require('node:path')

function createWindow() {
    const win = new BrowserWindow({
        width: 1280,
        height: 720,
        resizable: false,
        frame: false,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            enableRemoteModule: true,
            enablePreferredSizeMode: false
        }
    })

    win.webContents.openDevTools({ mode: "detach" })
    win.setMenuBarVisibility(false)
    win.loadFile('src/pages/index.html')
}

app.whenReady().then(() => {
    createWindow()

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow()
        }
    })
})

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})
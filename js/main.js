const { app, BrowserWindow, session, ipcMain } = require('electron')
const path = require('path')
require('@electron/remote/main').initialize()

// Специальные настройки для Windows
if (process.platform === 'win32') {
    app.commandLine.appendSwitch('enable-transparent-visuals');
    app.commandLine.appendSwitch('disable-gpu');
    app.commandLine.appendSwitch('disable-gpu-compositing');
}

// Добавляем поддержку расширений Chrome
async function installExtensions() {
    try {
        // Путь к папке с расширениями Chrome
        const extensionsPath = path.join(app.getPath('userData'), 'extensions');
        // Включаем поддержку расширений Chrome
        await session.defaultSession.loadExtension(extensionsPath, {
            allowFileAccess: true
        });
    } catch (err) {
        console.error('Ошибка загрузки расширений:', err);
    }
}

// Добавляем обработчик IPC для DevTools
ipcMain.on('open-devtools', (event) => {
    // Находим webContents, который отправил событие
    const contents = event.sender;
    if (contents.isDevToolsOpened()) {
        contents.closeDevTools();
    } else {
        contents.openDevTools({ mode: 'detach' });
    }
});

function createWindow() {
    // Создаем окно браузера
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
        frame: false,
        transparent: true,
        backgroundColor: '#00000000',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webviewTag: true,
            enableRemoteModule: true
        },
        // Добавляем стили для закругления
        titleBarStyle: 'hidden',
        roundedCorners: true,
        thickFrame: false,
        vibrancy: 'under-window',
        visualEffectState: 'active'
    });

    // Включаем remote для этого окна
    require('@electron/remote/main').enable(mainWindow.webContents);

    // Загружаем index.html
    mainWindow.loadFile('index.html');

    // Отключаем меню по умолчанию
    mainWindow.setMenu(null);
}

// Обработчик ошибок сертификатов
app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
    event.preventDefault();
    callback(true);
});

// Инициализация приложения
app.whenReady().then(async () => {
    await installExtensions();
    createWindow();

    // macOS specific
    app.on('activate', function () {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Закрытие приложения
app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') app.quit();
});

// Глобальный обработчик ошибок
process.on('uncaughtException', (error) => {
    console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (error) => {
    console.error('Необработанный промис:', error);
}); 
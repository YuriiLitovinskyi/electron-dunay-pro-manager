const { app, BrowserWindow, Menu, globalShortcut, ipcMain } = require('electron');
const Firebird = require('node-firebird');

process.env.NODE_ENV = 'development';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;

let mainWindow;
let aboutWindow;
const appVersion = 'v1.0.0';

function createMainWindow(){
    mainWindow = new BrowserWindow({
        title: `Dunay-128 Connection Statistics ${appVersion}`,
        width: isDev ? 1000 : 600,
        height: 600,
        icon: './assets/icons/D_512x512.png',
        resizable: isDev ? true : false,
        webPreferences: {
            nodeIntegration: true
        }
    });

    if(isDev){
        mainWindow.webContents.openDevTools();
    };

    mainWindow.loadFile('./app/index.html');
};

function createAboutWindow(){
    aboutWindow = new BrowserWindow({
        title: 'About this application',
        width: 400,
        height: 400,
        icon: './assets/icons/D_512x512.png',
        resizable: false,
        alwaysOnTop: true    
    });
    aboutWindow.setMenuBarVisibility(false);
    
    aboutWindow.loadFile('./app/about.html');   
};

function exitApplication(){
    // close connection to Firebird DB
    // Exit app
    app.quit();
};

app.on('ready', () => {
    createMainWindow();

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    globalShortcut.register('CmdOrCtrl+R', () => mainWindow.reload());
    globalShortcut.register('Ctrl+Shift+I', () => mainWindow.toggleDevTools());

    mainWindow.on('ready', () => {
        mainWindow = null;
    })
});

const menu = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Exit',               
                click:  () => exitApplication()
            }
        ]
    },
    {
        label: 'Help',
        submenu: [
            {
                label: 'About',               
                click:  createAboutWindow
            }           
        ]       
    }
];

function connectToDb(options){
    Firebird.attach(options, (err, db) => {
        if(err) throw err;

        console.log('Connected to db successfully!');
        db.detach();
    });
};

ipcMain.on('app:connectToDb', (e, connectionOptions) => {
    connectionOptions.role = null;
    connectionOptions.lowercase_keys = false;
    console.log(connectionOptions);

    connectToDb(connectionOptions);
});

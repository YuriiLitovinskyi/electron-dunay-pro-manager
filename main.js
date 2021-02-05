const { app, BrowserWindow, Menu, globalShortcut, ipcMain } = require('electron');
const Firebird = require('node-firebird');
const moment = require('moment');

process.env.NODE_ENV = 'development';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;

let mainWindow;
let aboutWindow;
const appVersion = 'v1.0.0';
let connectedDb;

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

app.on('ready', () => {
    createMainWindow();

    //mainWindow.webContents.send('db:disconectTimeout', disconnectFromDbTimeout);

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    globalShortcut.register('CmdOrCtrl+R', () => mainWindow.reload());
    globalShortcut.register('Ctrl+Shift+I', () => mainWindow.toggleDevTools());

    mainWindow.on('ready', () => {
        mainWindow = null;
    })
});

app.on('before-quit', () => {
    if(connectedDb){
        disconnectFromDb(connectedDb);
        connectedDb = null;
    };
});

const menu = [
    {
        label: 'File',
        submenu: [
            {
                label: 'Exit',               
                click:  () => app.quit()
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

        connectedDb = db;
        console.log('Connected to db successfully!');
        //db.detach();       

        setTimeout(() => {
            if(connectedDb){
                disconnectFromDb(connectedDb);
                connectedDb = null;
            };
        }, 60000);
    });
};

function disconnectFromDb(db){
    console.log('Disconnected from db!');
    db.detach();
};

function fidnDevicesAccordingToDates(db, dates){
    if(db){
        //console.log(convertDate(dates.beginDate));
        //console.log(convertDate(dates.endDate));
        const findPpkIds = `SELECT OBJECT, EVENT_TIMESTAMP FROM (SELECT OBJECT, min(EVENT_TIMESTAMP) AS EVENT_TIMESTAMP FROM events WHERE EVENT_CLASS = 58 GROUP BY OBJECT) WHERE EVENT_TIMESTAMP between '${convertDate(dates.beginDate)}' AND '${convertDate(dates.endDate)}';`;  //between '27.03.2017 10:38' AND '27.03.2020 11:50';
        
        db.query(findPpkIds, (err, result) => {
            if(err) throw err;
            console.log('result: ', result);
            // loop, get ids and insert in query
            //const findPpkData = `SELECT OID, NAME, DESCRIPTION FROM objects WHERE ID IN (11210, 11884);`;
        });
    };
};

function convertDate(inputDate){   
    return moment(inputDate).format('DD.MM.YYYY HH:mm');
};

ipcMain.on('app:connectToDb', (e, connectionOptions) => {
    connectionOptions.role = null;
    connectionOptions.lowercase_keys = false;
    console.log(connectionOptions);

    connectToDb(connectionOptions);
});

ipcMain.on('app:disconnectFromDb', (e) => {
    if(connectedDb){
        disconnectFromDb(connectedDb);
        connectedDb = null;
    };
});

ipcMain.on('app:findDevices', (e, dates) => {
    console.log(dates);
    fidnDevicesAccordingToDates(connectedDb, dates);
});
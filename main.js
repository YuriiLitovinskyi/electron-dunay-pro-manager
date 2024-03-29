const { app, BrowserWindow, Menu, globalShortcut, ipcMain, dialog } = require('electron');
const Firebird = require('node-firebird');
const moment = require('moment');
const { findEmplStat } = require('./queries')

process.env.NODE_ENV = 'production';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;

let mainWindow;
let aboutWindow;
const appVersion = 'v1.0.1';
let connectedDb;
let disconnectionTimer = 240;
let timerDb = 0;

function createMainWindow(){
    mainWindow = new BrowserWindow({
        title: `Dunay-PRO Statistics ${appVersion}`,
        width: isDev ? 1000 : 600,
        height: 650,
        icon: './assets/icons/D_512x512.png',
        resizable: isDev ? true : false,
        webPreferences: {
            nodeIntegration: true,
            devTools: isDev ? true : false,
            contextIsolation: false
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
        width: 550,
        height: 550,
        icon: './assets/icons/D_512x512.png',
        resizable: false,
        alwaysOnTop: true    
    });
    aboutWindow.setMenuBarVisibility(false);
    
    aboutWindow.loadFile('./app/about.html');   
};

app.on('ready', () => {
    createMainWindow();    

    const mainMenu = Menu.buildFromTemplate(menu);
    Menu.setApplicationMenu(mainMenu);

    globalShortcut.register('CmdOrCtrl+R', () => mainWindow.reload());
    globalShortcut.register('Ctrl+Shift+I', () => mainWindow.toggleDevTools());

    mainWindow.on('ready', () => {
        mainWindow = null;
    });
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
        if(err) throw new Error(`Cannot connect to DB! Please check connection settings and try again! \n${err}`);       

        connectedDb = db;    
        console.log('Connected to db successfully!');
        //db.detach();       
        mainWindow.webContents.send('app:dbConnectionStatus',  { connection: 'OK', disconnectionTimer });

        timerDb = setTimeout(() => {
            if(connectedDb){
                disconnectFromDb(connectedDb);
                connectedDb = null;
            };
        }, disconnectionTimer * 1000);
    });
};

function disconnectFromDb(db){
    console.log('Disconnected from db!');
    clearTimeout(timerDb);
    db.detach();
};

function findDevicesAccordingToDates(db, dates){
    if(db){       
        const findPpkIds = `SELECT OBJECT, EVENT_TIMESTAMP FROM (SELECT OBJECT, min(EVENT_TIMESTAMP) AS EVENT_TIMESTAMP FROM events WHERE EVENT_CLASS = 58 GROUP BY OBJECT) WHERE EVENT_TIMESTAMP between '${convertDate(dates.beginDate)}' AND '${convertDate(dates.endDate)}';`;
        
        db.query(findPpkIds, (err, result) => {
            if(err) throw new Error(`Cannot execute query one! \n${err}`);                 

            if(result.length === 0){              
                  showDialogWindow('info', 'Unsuccess', 'No devices found!', 'Please try another range of dates!');   
            } else {
                let queryStringPpksIds = '';           

                for(let i = 0; i < result.length; i++){
                    result[i].EVENT_TIMESTAMP = convertDate(result[i].EVENT_TIMESTAMP);  // convert date
                    queryStringPpksIds += result[i].OBJECT + ', '; // build ids string
                };
                queryStringPpksIds = queryStringPpksIds.replace(/,\s*$/, "");  // remove last comma and whitespace            
                    
                const findPpkData = `SELECT ID, OID AS PPK_NUMBER, NAME AS PPK_NAME FROM objects WHERE ID IN (${queryStringPpksIds});`; 

                db.query(findPpkData, (err, resultPpkData) => {
                    if(err) throw new Error(`Cannot execute query two! \n${err}`);                
    
                    for(let i = 0; i < resultPpkData.length; i++){
                        for(let j = i; j < result.length; j++){
                            if(resultPpkData[i].ID === result[j].OBJECT){
                                resultPpkData[i].FIRST_RESTART_TIME = result[j].EVENT_TIMESTAMP;
                            };                
                        };
                    };                   
                    mainWindow.webContents.send('app:resultPpkData',  resultPpkData);
                });
            };       
        });
    };
};

function findEmplStatistic(db){
    return new Promise((resolve, reject) => {
        if(db){                                     
            db.query(findEmplStat, (err, resultEmplStat) => {
                if(err) throw new Error(`Cannot execute query for employees statistics! ${err.message}`)                      
                const res = JSON.parse(JSON.stringify(resultEmplStat))  // removes or sets to NULL all BLOB(binary) results of query execution            
                resolve(res)              
            })
        } else {
            reject('Error! Cannot connect to DB!')
        }
    })
}

function convertDate(inputDate){   
    return moment(inputDate).format('DD.MM.YYYY HH:mm');
};

process.on("uncaughtException", (err) => {
    const messageBoxOptions = {
         type: "error",
         title: "An Error Occurred",
         message: "Something failed",
         detail: err.message
     };
     dialog.showMessageBox(messageBoxOptions);
     //throw err;
     console.log(err);
 });

function showDialogWindow(type, title, message, detail){
    const options = {
        type,
        buttons: ['Ok'],
        defaultId: 1,
        title,
        message,
        detail                 
    };
    
    dialog.showMessageBox(null, options, (response) => {
    console.log(response);                 
    });
};

ipcMain.on('errorInWindow', function(event, data){
    throw new Error(`Error in renderer! \n${data}`)
});

ipcMain.on('app:connectToDb', (e, connectionOptions) => {
    connectionOptions.role = null;
    connectionOptions.lowercase_keys = false;
   
    connectToDb(connectionOptions);
});

ipcMain.on('app:disconnectFromDb', (e) => {
    if(connectedDb){
        disconnectFromDb(connectedDb);
        connectedDb = null;
    };
});

ipcMain.on('app:findDevices', (e, dates) => {  
    findDevicesAccordingToDates(connectedDb, dates);
});

ipcMain.handle('app:findEmployeesStatistic', async (e) => {
    const res = await findEmplStatistic(connectedDb)
    return res
})
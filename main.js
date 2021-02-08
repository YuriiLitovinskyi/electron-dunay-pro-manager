const { app, BrowserWindow, Menu, globalShortcut, ipcMain, dialog } = require('electron');
const Firebird = require('node-firebird');
const moment = require('moment');

process.env.NODE_ENV = 'development';

const isDev = process.env.NODE_ENV !== 'production' ? true : false;


let mainWindow;
let aboutWindow;
const appVersion = 'v1.0.0';
let connectedDb;
let disconnectionTimer = 60;
let timerDb = 0;

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
        const findPpkIds = `SELECT OBJECT, EVENT_TIMESTAMP FROM (SELECT OBJECT, min(EVENT_TIMESTAMP) AS EVENT_TIMESTAMP FROM events WHERE EVENT_CLASS = 58 GROUP BY OBJECT) WHERE EVENT_TIMESTAMP between '${convertDate(dates.beginDate)}' AND '${convertDate(dates.endDate)}';`;  //between '27.03.2017 10:38' AND '27.03.2020 11:50';
        
        db.query(findPpkIds, (err, result) => {
            if(err) throw new Error(`Cannot execute query one! \n${err}`);
            console.log('result: ', result);        

            
            
            if(result.length === 0){
                const options = {
                    type: 'question',
                    buttons: ['Ok'],
                    defaultId: 1,
                    title: 'Unsuccess',
                    message: 'No devices found!',
                    detail: 'Please try another range of dates!'                 
                  };
                
                  dialog.showMessageBox(null, options, (response) => {
                    console.log(response);                 
                  });
                //throw new Error('No devices found! Please try another range of dates!');
            } else {
                let queryStringPpksIds = '';           

                for(let i = 0; i < result.length; i++){
                    result[i].EVENT_TIMESTAMP = convertDate(result[i].EVENT_TIMESTAMP)  // convert date
                    queryStringPpksIds += result[i].OBJECT + ', '; // build ids string
                };
                queryStringPpksIds = queryStringPpksIds.replace(/,\s*$/, "");  // remove last comma and whitespace            
                    
                const findPpkData = `SELECT ID, OID AS PPK_NUMBER, NAME AS PPK_NAME FROM objects WHERE ID IN (${queryStringPpksIds});`;    //, DESCRIPTION   blob?  

                db.query(findPpkData, (err, resultPpkData) => {
                    if(err) throw new Error(`Cannot execute query two! \n${err}`);                
    
                    for(let i = 0; i < resultPpkData.length; i++){
                        for(let j = i; j < result.length; j++){
                            if(resultPpkData[i].ID === result[j].OBJECT){
                                resultPpkData[i].FIRST_RESTART_TIME = result[j].EVENT_TIMESTAMP;
                            }                  
                        }
                    }
                    console.log('resultPpkData', resultPpkData);
                    mainWindow.webContents.send('app:resultPpkData',  resultPpkData);
                });
            }
            
        });
    };
};

function convertDate(inputDate){   
    return moment(inputDate).format('DD.MM.YYYY HH:mm');
};
// process.on("uncaughtException", (err) => {
//     const messageBoxOptions = {
//          type: "error",
//          title: "Error in Main process",
//          message: "Something failed"
//      };
//      dialog.showMessageBox(messageBoxOptions);
//      throw err;
//  });

ipcMain.on('errorInWindow', function(event, data){
    throw new Error(`Error in renderer! \n${data}`)
});

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
    findDevicesAccordingToDates(connectedDb, dates);
});
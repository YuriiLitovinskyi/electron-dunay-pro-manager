// const path = require('path');
// const os = require('os');
const fs = require('fs');
const { ipcRenderer } = require('electron');
const { jsonToExcel } = require('nested-json-to-table');

window.onerror = function(error, url, line) {
    ipcRenderer.send('errorInWindow', error);
};

const connectDbForm = document.getElementById('connection-form');
const host = document.getElementById('host');
const port = document.getElementById('port');
const databaseName = document.getElementById('databaseName');
const username = document.getElementById('username');
const password = document.getElementById('password');
const disconnectFromDb = document.getElementById('disconnectFromDb');
const connectionButton = document.getElementById('connectionButton');
//const applyDatesBtn = document.getElementById('applyDatesBtn');
const applyDatesForm = document.getElementById('apply-dates-form');
const beginDate = document.getElementById('beginDate');
const endDate = document.getElementById('endDate');
const dun128Amount = document.getElementById('dun128Amount');
const exportDataToExcel = document.getElementById('exportDataToExcel');
const connectionWindow = document.getElementById('connectionWindow');
const ppkDataWindow = document.getElementById('ppkDataWindow');
const disconnectionTimerSpan = document.getElementById('disconnectionTimerSpan');

disconnectFromDb.disabled = true;
ppkDataWindow.style.display = 'none';
exportDataToExcel.disabled = true;
beginDate.value = setInputDate(1);
endDate.value = setInputDate();

let data = [];
let disconnectionTimer = 0;
let timer;
let timeleft = 0;
let timerInterf = 0;

ipcRenderer.on('app:resultPpkData', (e, resultPpkData) => {
    console.log(resultPpkData);
    data = [...resultPpkData];
    dun128Amount.innerText = resultPpkData.length;
    if(resultPpkData.length > 0){        
        dun128Amount.innerText = resultPpkData.length;
        exportDataToExcel.disabled = false;
    };
});

function setInputDate(month = 0){
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    now.setMonth(now.getMonth() - month);
    return now.toISOString().slice(0,16);
};

// Event Listeners
connectDbForm.addEventListener('submit', (e) => {
    e.preventDefault();   

    ipcRenderer.send('app:connectToDb', {
        host: host.value,
        port: port.value,
        database: databaseName.value,
        user: username.value,
        password: password.value
    });

    ipcRenderer.on('app:dbConnectionStatus', (e, data) => {
        //console.log(data.disconnectionTimer);
        disconnectionTimer = data.disconnectionTimer;

        if(data.connection === 'OK'){
            connectionButton.disabled = true;
            disconnectFromDb.disabled = false;
            connectionWindow.style.display = 'none';
            ppkDataWindow.style.display = 'block';

            //setInterval(setTime, 1000); 
            if(timer){
                clearInterval(timer);
            }
            if(timerInterf){
                clearTimeout(timerInterf);
            }
            timeleft = disconnectionTimer - 1;           
            timer = setInterval(() => {
                if(timeleft <= 0){
                    clearInterval(timer);
                }
                disconnectionTimerSpan.innerHTML = timeleft;
                timeleft -= 1;
            }, 1000);
        
            timerInterf = setTimeout(() => {
                connectionButton.disabled = false;
                disconnectFromDb.disabled = true;
                connectionWindow.style.display = 'block';
                ppkDataWindow.style.display = 'none';
                dun128Amount.innerText = '';
                data = [];
                exportDataToExcel.disabled = true;
            }, disconnectionTimer * 1000);
        }
    })
});

disconnectFromDb.addEventListener('click', () => {
    ipcRenderer.send('app:disconnectFromDb');

    disconnectFromDb.disabled = true;
    connectionButton.disabled = false;
    connectionWindow.style.display = 'block';
    ppkDataWindow.style.display = 'none';
    dun128Amount.innerText = '';
    data = [];
    exportDataToExcel.disabled = true;

    // if(timer){
        clearInterval(timer);
        clearTimeout(timerInterf);
        timeleft = 0;
        disconnectionTimerSpan.innerHTML = '';
    // }
});

applyDatesForm.addEventListener('submit', (e) => {
    e.preventDefault(); 
    dun128Amount.innerText = '';
    data = [];
    exportDataToExcel.disabled = true;

    ipcRenderer.send('app:findDevices', {
        beginDate: beginDate.value,
        endDate: endDate.value
    })
});

exportDataToExcel.addEventListener('click', () => {
    //console.log('data global', data);

    if(data.length === 0){
        console.error('Cannot create a file, data is empty. Choose another range of dates and press Apply button!');  
        throw new Error('Cannot create a file, data is empty. Choose another range of dates and press Apply button!');
    } else {    
        const tableExcel = jsonToExcel(data);       

        // fs.writeFile('Statistics.xlsx', tableExcel, 'utf8', (err) => {
        //     if(err) throw err;
        //     console.log(`Exporting excel file to: ${__dirname}`);
        // });   
        
        const content = tableExcel;
        const element = document.createElement("a");
        const file = new Blob([content], {type: "text/plain"});
        element.href = URL.createObjectURL(file);
        element.download = "Statistics.xlsx";
        element.click();
        console.log('Created and exported excel file');
    }
});

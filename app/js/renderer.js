// const path = require('path');
// const os = require('os');
const { ipcRenderer } = require('electron');

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

disconnectFromDb.disabled = true;

ipcRenderer.on('app:resultPpkData', (e, resultPpkData) => {
    console.log(resultPpkData);
    dun128Amount.innerText = resultPpkData.length;
});

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

    connectionButton.disabled = true;
    disconnectFromDb.disabled = false;

    setTimeout(() => {
        connectionButton.disabled = false;
        disconnectFromDb.disabled = true;
    }, 60000);
});

disconnectFromDb.addEventListener('click', () => {
    ipcRenderer.send('app:disconnectFromDb');

    disconnectFromDb.disabled = true;
    connectionButton.disabled = false;
});

applyDatesForm.addEventListener('submit', (e) => {
    e.preventDefault(); 

    //console.log('Begin date: ', beginDate.value);
    //console.log('End date: ', endDate.value);
    ipcRenderer.send('app:findDevices', {
        beginDate: beginDate.value,
        endDate: endDate.value
    })
});
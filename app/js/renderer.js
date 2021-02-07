// const path = require('path');
// const os = require('os');
const fs = require('fs');
const { ipcRenderer } = require('electron');
const { jsonToExcel } = require('nested-json-to-table');

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

disconnectFromDb.disabled = true;

let data = [];

ipcRenderer.on('app:resultPpkData', (e, resultPpkData) => {
    console.log(resultPpkData);
    data = [...resultPpkData];
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

    ipcRenderer.send('app:findDevices', {
        beginDate: beginDate.value,
        endDate: endDate.value
    })
});

exportDataToExcel.addEventListener('click', () => {
    //console.log('data global', data);

    if(data.length === 0){
        console.log('Cannot create a file, data is empty. Choose another range of dates and press Apply button');
    } else {    
        const tableExcel = jsonToExcel(data);       

        fs.writeFile('Statistics.xlsx', tableExcel, 'utf8', (err) => {
            if(err) throw err;
            console.log(`Exporting excel file to: ${__dirname}`);
        });       
    }
});

document.querySelector('#fileDialog')
    .addEventListener("change", function() {
    var filePath = this.value;
    alert(filePath);
});

// renderer javascript file
function saveFile() {
    const content = "File content to save";
    const element = document.createElement("a");
    const file = new Blob([content], {type: "text/plain"});
    element.href = URL.createObjectURL(file);
    element.download = "file.txt";
    element.click();
}



// const path = require('path');
// const os = require('os');
const { ipcRenderer } = require('electron');

const connectDbForm = document.getElementById('connection-form');
const host = document.getElementById('host');
const port = document.getElementById('port');
const databaseName = document.getElementById('databaseName');
const username = document.getElementById('username');
const password = document.getElementById('password');

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
});
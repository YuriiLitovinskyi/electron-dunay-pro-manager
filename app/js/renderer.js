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
const applyDatesForm = document.getElementById('apply-dates-form');
const beginDate = document.getElementById('beginDate');
const endDate = document.getElementById('endDate');
const dun128Amount = document.getElementById('dun128Amount');
const exportDataToExcel = document.getElementById('exportDataToExcel');
const connectionWindow = document.getElementById('connectionWindow');
const ppkDataWindow = document.getElementById('ppkDataWindow');
const disconnectionTimerSpan = document.getElementById('disconnectionTimerSpan');

const exportEmployeeDataToExcel = document.getElementById('exportEmployeeToExcel');

disconnectFromDb.disabled = true;
ppkDataWindow.style.display = 'none';
exportDataToExcel.disabled = true;
beginDate.value = setInputDate(1);
endDate.value = setInputDate();

let data = [];
//let emplData = [];
let disconnectionTimer = 0;
let timer;
let timeleft = 0;
let timerInterf = 0;

ipcRenderer.on('app:resultPpkData', (e, resultPpkData) => {   
    data = [...resultPpkData];
    dun128Amount.innerText = resultPpkData.length;
    if(resultPpkData.length > 0){        
        dun128Amount.innerText = resultPpkData.length;
        exportDataToExcel.disabled = false;
    };
});

// ipcRenderer.on('app:resultEmployeesStatistic', (e, resultEmployeesStatistic) => {
//     console.log(resultEmployeesStatistic);

//     emplData = [...resultEmployeesStatistic];
// })

function setInputDate(month = 0){
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    now.setMonth(now.getMonth() - month);
    return now.toISOString().slice(0,16);
};

function exportFile(content, dates){
    const element = document.createElement('a');
    const file = new Blob([content], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    if(dates){
        element.download = `Statistics_from_${dates.beginDate}_to_${dates.endDate}.xlsx`;
    } else {
        element.download = `Employees Statistics.xlsx`
    }
    element.click();    
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
        disconnectionTimer = data.disconnectionTimer;

        if(data.connection === 'OK'){
            connectionButton.disabled = true;
            disconnectFromDb.disabled = false;
            connectionWindow.style.display = 'none';
            ppkDataWindow.style.display = 'block';

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
    });
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

    clearInterval(timer);
    clearTimeout(timerInterf);
    timeleft = 0;
    disconnectionTimerSpan.innerHTML = '';
  
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
    if(data.length === 0){        
        throw new Error('Cannot create a file with empty data. Choose another range of dates and press Apply button!');
    } else {    
        const tableExcel = jsonToExcel(data);
        const dates = {
            beginDate: beginDate.value,
            endDate: endDate.value
        };
        exportFile(tableExcel, dates);
    };
});

exportEmployeeDataToExcel.addEventListener('click', async () => {
  
        console.log('Exporting Employees...');
    
        const emplData = await ipcRenderer.invoke('app:findEmployeesStatistic')
        console.log(emplData);
    
        const tableEmplExcel = jsonToExcel(emplData)
    
        exportFile(tableEmplExcel, null)   

})

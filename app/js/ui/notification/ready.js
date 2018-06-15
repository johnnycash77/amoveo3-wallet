window.readyHandlers = [];
window.ready = function ready(handler) {
  window.readyHandlers.push(handler);
  handleState();
};

window.handleState = function handleState () {
  if (['interactive', 'complete'].indexOf(document.readyState) > -1) {
    while(window.readyHandlers.length > 0) {
      (window.readyHandlers.shift())();
    }
  }
};

var ip;
var port;

document.onreadystatechange = window.handleState;

function hideElementById(id) {
    document.getElementById(id).classList.add('hidden');
}

function showElementById(id) {
    document.getElementById(id).classList.remove('hidden');
    document.getElementById(id).classList.remove('invisible');
}

function hideBackButton() {
    document.getElementById("back-button").classList.add('invisible');
}

function showBackButton() {
    document.getElementById("back-button").classList.remove('invisible');
}

function setStorage(values, callback) {
    chrome.storage.local.set(values, callback);
}

function getStorage(key, callback) {
    chrome.storage.local.get(key, callback);
}

function pushStorage(key, item, callback) {
    getStorage({key: []}, function (result) {
        var items = result.key;
        items.push(item);
        setStorage({key: items}, function () {
            console.log("header " + header[1] + " saved");
            return callback(undefined, items);
        });
    });
}

getStorage({connectionInfo: {url: "http://159.65.120.84", port: 8080}}, function(result) {
    var connectionInfo = result.connectionInfo;
    ip = connectionInfo.url;
    port = connectionInfo.port;
});
const BlocksController = require('./controller/blocks-controller')
const storage = require('./lib/storage')
const NotificationManager = require('./lib/notification-manager')
const notificationManager = new NotificationManager()

const blocksController = new BlocksController({});
var syncId;
var passwordId;

var openPort;

var password = "";

sync();

reloadWeb();

function sync(callback) {
    clearInterval(syncId);
    blocksController.startSyncing(function() {
        syncId = setInterval(function() {
            blocksController.startSyncing(function() {
                if (callback) {
                    callback();
                }
            });
        }, 10000);
    });
}

function resetPasswordTimer() {
    clearInterval(passwordId);
    passwordId = setInterval(function() {
        password = "";
    }, 30 * 60 * 1000);
}

chrome.extension.onMessage.addListener(
    function onSync(request, sender, sendResponse) {
        if (request.msg === "sync") {
            sync(function() {
                chrome.extension.sendMessage({ msg: "stopSync" });
                // chrome.extension.onMessage.removeListener(onSync);
            });
        } if (request.msg === "resync") {
            blocksController.reset();
        } else if (request.msg === "password") {
            password = request.data;
            resetPasswordTimer();
        } else if (request.msg === "getPassword") {
            chrome.extension.sendMessage({ msg: "getPassword", data: password });
            resetPasswordTimer();
        } else if (request.msg === "setState") {
            sendMessageToPage(request.data)
        }
    }
);

function sendMessageToPage(data) {
    if (openPort) {
        openPort.postMessage(data);
    } else {
        console.error("Port not connected");
    }
}

chrome.runtime.onConnectExternal.addListener(function(port) {
    openPort = port;

    openPort.onMessage.addListener(function(data) {
        if (data.opts) {
            notificationManager.showPopup(data.opts);
        }
    });

    storage.getAccounts(password, function (error, accounts) {
        if (error) {
            sendMessageToPage({
                selectedAddress: "",
                channels: [],
                isLocked: true
            });
        } else {
            if (accounts.length > 0) {
                storage.getChannels(function (error, channels) {
                    sendMessageToPage({
                        selectedAddress: accounts[0].publicKey,
                        channels: channels,
                        isLocked: false
                    })
                })
            } else {
                sendMessageToPage({
                    selectedAddress: "",
                    channels: [],
                    isLocked: false
                })
            }
        }
    });
});

function reloadWeb() {
    chrome.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.url.indexOf("localhost:8000") !== -1 || tab.url.indexOf("amoveobook") !== -1) {
                chrome.tabs.reload(tab.id);
            }
        }
    });
};

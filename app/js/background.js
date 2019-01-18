const BlocksController = require('./controller/blocks-controller')
const storage = require('./lib/storage')
const NotificationManager = require('./lib/notification-manager')
const notificationManager = new NotificationManager()

const blocksController = new BlocksController({});
let syncId;
let passwordId;
let openPort;
let password = "";

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
        if (request.type === "sync") {
            sync(function() {
                chrome.extension.sendMessage({ type: "stopSync" });
                // chrome.extension.onMessage.removeListener(onSync);
            });
        } if (request.type === "resync") {
            blocksController.clearCache(function() {
	            sync(function() {
		            chrome.extension.sendMessage({ type: "stopSync" });
		            // chrome.extension.onMessage.removeListener(onSync);
	            });
            });
        } else if (request.type === "password") {
            password = request.data;
            resetPasswordTimer();
        } else if (request.type === "getPassword") {
            chrome.extension.sendMessage({ type: "getPassword", data: password });
            resetPasswordTimer();
        } else if (request.type === "setState" || request.type === "sign" || request.type === "channel"
            || request.type === "cancel" || request.type === "market" ) {
            sendMessageToPage(request)
        } else if (request.type === "reload") {
		    sendMessageToPage(request)
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
        if (data) {
            notificationManager.showPopup(data);
        }
    });

    storage.getAccounts(password, function (error, accounts) {
        if (error) {
            sendMessageToPage({
                type: "setState",
                data: {
	                selectedAddress: "",
	                channels: [],
	                isLocked: true,
                }
            });
        } else {
            if (accounts.length > 0) {
                storage.getChannels(function (error, channels) {
                    sendMessageToPage({
	                    type: "setState",
	                    data: {
		                    selectedAddress: accounts[0].publicKey,
		                    channels: channels,
		                    isLocked: false
	                    }
                    })
                })
            } else {
                sendMessageToPage({
	                type: "setState",
	                data: {
		                selectedAddress: "",
		                channels: [],
		                isLocked: false
	                }
                })
            }
        }
    });
});

function reloadWeb() {
    chrome.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.url.indexOf("localhost") !== -1 || tab.url.indexOf("amoveobook") !== -1) {
                chrome.tabs.reload(tab.id);
            }
        }
    });
};

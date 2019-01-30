const extension = require('extensionizer')
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

extension.runtime.onMessage.addListener(
    function onSync(request, sender, sendResponse) {
	    console.log("message");

        if (request.type === "sync") {
            sync(function() {
	            extension.runtime.sendMessage({ type: "stopSync" });
                // extension.runtime.onMessage.removeListener(onSync);
            });
        } if (request.type === "resync") {
            blocksController.clearCache(function() {
	            sync(function() {
		            extension.runtime.sendMessage({ type: "stopSync" });
		            // extension.runtime.onMessage.removeListener(onSync);
	            });
            });
        } else if (request.type === "password") {
            password = request.data;
            resetPasswordTimer();
        } else if (request.type === "getPassword") {
		    extension.runtime.sendMessage({ type: "getPassword", data: password });
            resetPasswordTimer();
        } else if (request.type === "setState" || request.type === "sign" || request.type === "channel") {
            sendMessageToPage(request)
        } else if (request.type === "market" || request.type === "cancel") {
		    sendMessageToPage(request);
		    sendCurrentState();
	    } else if (request.type === "reload") {
		    sendMessageToPage(request)
        }
    }
);

var portFromCS;

function connected(port) {
	console.log("CONNECTTED " + port);
	portFromCS = port;
	portFromCS.postMessage({greeting: "hi there content script!"});
	portFromCS.onMessage.addListener(function(request) {
		console.log("In background script, received message from content script")
		console.log(request);
	});
}

browser.runtime.onConnect.addListener(connected);

browser.browserAction.onClicked.addListener(function() {
	portFromCS.postMessage({greeting: "they clicked the button!"});
});


function sendMessageToPage(data) {
    if (openPort) {
        openPort.postMessage(data);
    } else {
        console.error("Port not connected");

	    portFromCS.postMessage(data);
    }
}

extension.runtime.onConnectExternal.addListener(function(port) {
	console.log("CONNECTTED EXTERNAL");

    openPort = port;

    openPort.onMessage.addListener(function(data) {
        if (data) {
            notificationManager.showPopup(data);
        }
    });

	sendCurrentState();
});

function sendCurrentState() {
	storage.getSelectedNetwork(function (error, network) {
		storage.getAccounts(password, function (error, accounts) {
			if (error) {
				sendMessageToPage({
					type: "setState",
					data: {
						selectedAddress: "",
						channels: [],
						isLocked: true,
						network: network,
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
								isLocked: false,
								network: network,
							}
						})
					})
				} else {
					sendMessageToPage({
						type: "setState",
						data: {
							selectedAddress: "",
							channels: [],
							isLocked: false,
							network: network,
						}
					})
				}
			}
		});
	});
}

function reloadWeb() {
    extension.tabs.query({}, function (tabs) {
        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            if (tab.url.indexOf("localhost") !== -1 || tab.url.indexOf("amoveobook") !== -1) {
                extension.tabs.reload(tab.id);
            }
        }
    });
};

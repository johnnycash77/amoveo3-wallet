const extension = require('extensionizer');
const views = require('../lib/views.js');
const storage = require('../lib/storage.js');
const fileUtility = require('../lib/file-utility.js');
const network = require('../controller/network-controller.js');

function initSettingsContainer(account) {
    views.hide(views.ids.accountContainer);
    views.show(views.ids.settingsContainer);

    views.setText(views.ids.title, "Settings");

    initBackButton();

    initExportAccount(account);

    initConnection();

    initResync();
}

function resetTitle() {
    views.setText(views.ids.title, "Amoveo3 Wallet");
}

function initBackButton() {
    views.showBackButton();
    var backButton = views.find(views.ids.navbar.backButton);
    backButton.onclick = function (e) {
	    views.hideBackButton();
	    views.show(views.ids.accountContainer);
	    views.hide(views.ids.settingsContainer);
	    views.hide(views.ids.accountSwitchContainer);
	    resetTitle();
    };
}

function initExportAccount(account) {
    var exportButton = views.find(views.ids.settings.exportButton);
    exportButton.onclick = function (e) {
        fileUtility.download(account.privateKey, account.publicKey + "_key_" + new Date() + ".txt", "text/plain");
    }
}

function showExportError() {
    views.show(views.ids.settings.exportError);
}

function initConnection() {
    storage.getConnectionInfo(function(error, connectionInfo) {
        var url = views.find(views.ids.settings.connect.url)
        url.value = connectionInfo.url;

        var portText = views.find(views.ids.settings.connect.port);
        portText.value = connectionInfo.port;

        var connectedTo = views.find(views.ids.settings.connect.current);
        connectedTo.innerHTML = connectionInfo.url + ":" + connectionInfo.port;

        var connectButton = views.find(views.ids.settings.connect.button);
        connectButton.onclick = function (e) {
            if (url.value && portText.value) {
                var info = url.value + ":" + portText.value;
                var safeIp = info.replace("http://", "").replace("https://", "");
                try {
                    network.send(["height"], function(error, server_height) {
                        if (!error) {
                            storage.setConnectionInfo({url: safeIp, port: portText.value}, function () {
                                connectedTo.innerHTML = info;
                            });
                        } else {
                            showConnectError("Failed to connect");
                        }
                    });
                } catch(e) {
                    showConnectError("Failed to connect");
                }
            } else {
                showConnectError("Failed to connect");
            }
        }
    });
}

function initResync() {
    var resyncButton = views.find(views.ids.settings.resyncButton);
    resyncButton.onclick = function (e) {
        storage.setTopHeader(0, function () {
            storage.setHeaders({}, function () {
	            doResync();
            });
        });
    };
}

function doResync() {
	views.setText(views.ids.latestBlock, "Latest Block: 0");
	extension.runtime.sendMessage({ type: "resync"});
}

function showConnectError(text) {
    views.show(views.ids.settings.connect.error)
    views.find(views.ids.settings.connect.error).innerHTML = text;
}

exports.init = initSettingsContainer;
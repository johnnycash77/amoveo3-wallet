var views = require('../lib/views.js');
var formatUtility = require('../lib/format-utility.js');
var storage = require('../lib/storage.js');
const accountController = require('./account.js');
const elliptic = require('../lib/elliptic.min.js');
const fileUtility = require('../lib/file-utility.js');

function initSettingsContainer(account) {
    views.hide(views.ids.accountContainer);
    views.show(views.ids.settingsContainer);

    views.setText(views.ids.title, "Settings");

    initBackButton(function (e) {
        views.invisible(views.ids.navbar.backButton);
        views.show(views.ids.accountContainer);
        views.hide(views.ids.settingsContainer);
        views.hide(views.ids.accountSwitchContainer);
        resetTitle();
    });

    initExportAccount(account);

    initConnection();
}

function resetTitle() {
    views.setText(views.ids.title, "Amoveo3 Wallet");
}

function initBackButton(callback) {
    views.visible(views.ids.navbar.backButton);
    var backButton = views.find(views.ids.navbar.backButton);
    backButton.onclick = callback;
}

function initExportAccount(account) {
    var exportButton = views.find(views.ids.settings.exportButton);
    exportButton.onclick = function (e) {
        fileUtility.download(account.privateKey, account.publicKey + "_key_" + new Date() + ".txt", "text/plain");
    }
}

function showExportError() {
    views.visible(views.ids.settings.exportError);
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

function showConnectError(text) {
    views.show(views.ids.settings.connect.error)
    views.find(views.ids.settings.connect.error).innerHTML = text;
}

exports.init = initSettingsContainer;
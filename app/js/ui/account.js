var views = require('../lib/views.js');
var settingsController = require('./settings.js');
var userController = require('../controller/user-controller.js');
var storage = require('../lib/storage.js');
var fileUtility = require('../lib/file-utility.js');

var refreshId = "";

function initAccountsPage(account) {
    reset();

    views.hideBackButton();

    views.setText(views.ids.title, "Amoveo3 Wallet");

    views.show(views.ids.accountContainer);
    views.hide(views.ids.settingsContainer);
    views.hide(views.ids.firefoxImportContainer);
    views.hide(views.ids.firefoxChannelImportContainer);
    views.hide(views.ids.accountSwitchContainer);

    addListeners(account);
    addCopyListener(account);
    addExportKeyListener(account);

    setAddress(account);
    setIcon(account);

    syncHeaders(account);
}

function syncHeaders(account) {
    refresh(account, function() {
        refreshId = setInterval(function () {
            refresh(account, function() {

            });
        }, 3000)
    })
}

function reset() {
    clearInterval(refreshId)
}

function refresh(account, callback) {
    storage.getTopHeader(function(error, header) {
        var height = header[1];
        updateBlockNumber(height);
        updateSyncing(height);

        userController.getBalance(account, header, function (error, result) {
            views.setText(views.ids.account.balance, result);
            if (callback) {
                callback();
            }
        });
    });
}

function updateBlockNumber(height) {
    var blockNumber = views.find(views.ids.latestBlock);
    views.show(views.ids.latestBlock);
    if (height) {
        blockNumber.innerHTML = "Latest Block: " + height;
    } else {
        blockNumber.innerHTML = "Latest Block: " + 0;
    }
}

function updateSyncing(height) {
    var syncing = document.getElementById("syncing-progress");
    syncing.setAttribute('aria-valuenow', height);
    var max = syncing.getAttribute('aria-valuemax');
    syncing.style.width = (100 * height / max) + "%";
}

function addListeners(account) {
    var settingsButton = views.find(views.ids.navbar.settingsButton);
    views.show(views.ids.navbar.settingsButton);
    settingsButton.onclick = function(e) {
        settingsController.init(account);
    };
}


function stopRefreshing() {
    var refreshButton = views.find(views.ids.navbar.refreshButton);
    refreshButton.classList.remove('fa-spin');
    refreshButton.classList.remove('disabled');
}

function startRefreshing() {
    var refreshButton = views.find(views.ids.navbar.refreshButton);
    refreshButton.classList.add('fa-spin');
    refreshButton.classList.add('disabled');
}

function addCopyListener(account) {
    var copyButton = document.getElementById("account-copy");
    copyButton.onclick = function(e) {
        copy(account.publicKey);
        var text = document.getElementById('copy-text');
        text.classList.remove('invisible');
        setTimeout(function() {
            text.classList.add('invisible');
        }, 3000);
    }
}

function addExportKeyListener(account) {
    var exportButton = document.getElementById("export-button");
    exportButton.onclick = function(e) {
        fileUtility.download(account.privateKey, "private_key_" + new Date() + ".txt", "text/plain");
    }
}

function copy(text) {
    var input = document.createElement('input');
    input.setAttribute('value', text);
    document.body.appendChild(input);
    input.select();
    var result = document.execCommand('copy');
    document.body.removeChild(input);
    return result;
}

function setAddress(account) {

    var address = views.find(views.ids.account.address);
    address.innerHTML = account.publicKey;
}

function setIcon(account) {
    var iconContainer = views.find(views.ids.account.icon);
    views.removeAllChildren(views.ids.account.icon);

    var icon = blockies.create({
        seed: account.publicKey,
        size: 16,
        scale: 4,
    });

    iconContainer.appendChild(icon);
}

exports.init = initAccountsPage;
const extension = require('extensionizer');
var network = require('../controller/network-controller.js');
var storage = require('../lib/storage.js');
var views = require('../lib/views.js');

function initTransactionsTab(account) {
    var pendingContainer = views.find(views.ids.txs.pendingContainer);
    views.removeAllChildren(views.ids.txs.pendingContainer);

    views.find(views.ids.txs.veoscan).onclick = function(e) {
        extension.tabs.create({url: "http://veoscan.io/account/" + veoscanEscape(account.publicKey)})
    };

    network.send(["txs"], function (error, txs) {
        var rows = [];
        for (var i = 1; i < txs.length; i++) {
            var tx = txs[i][1];
            if (tx && tx.length > 1 && tx[1] === account.publicKey) {
                var row = makeTxRow(tx, true);
                rows.push(row);
            } else if (tx[4] === account.publicKey) {
                var row = makeTxRow(tx, false);
                rows.push(row);
            }
        }

        if (rows.length === 0) {
            var row = makeBlankRow();
            pendingContainer.appendChild(row);
        } else {
            for (var j = 0; j < rows.length; j++) {
                var row = rows[j];
                pendingContainer.appendChild(row);
            }
        }
    });
}

function veoscanEscape(text) {
    return text.replace(/\+/g, "%252B").replace(/\//g, "%252F").replace(/=/g, "%253D")
}

function replaceAll(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

function makeBlankRow() {
    var row = document.createElement('div');
    row.className = "tx-row";
    var container = document.createElement('div');
    var message = document.createElement('p');
    message.className = 'no-txs-message';
    message.innerHTML = "No pending transactions";

    container.appendChild(message);
    row.appendChild(container);

    return row;
}

function makeTxRow(tx, isSend) {
    var row = document.createElement('div');
    row.className = "tx-row clearfix";
    var container = document.createElement('div');
    var bottomRow = document.createElement('div');
    var clear = document.createElement('div');
    clear.className = "clear";
    var type = document.createElement('p');
    type.className = 'tx-row-type';
    var date = document.createElement('p');
    date.className = 'tx-row-date';
    var amount = document.createElement('p');
    amount.className = 'tx-row-amount';
    var to = document.createElement('p');
    to.className = 'tx-row-address address';

    if (isSend) {
        type.innerHTML = getTxSendType(tx[0]);
    } else {
        type.innerHTML = getTxReceiveType(tx[0]);
    }
    date.innerHTML = "Just now (waiting to be mined)";
    amount.innerHTML = tx[5] / 100000000 + " " + "VEO";
    to.innerHTML = "To:" + " " + tx[4];

    container.appendChild(date);
    bottomRow.appendChild(type);
    bottomRow.appendChild(amount);
    bottomRow.appendChild(to);

    row.appendChild(container);
    row.appendChild(bottomRow);
    row.appendChild(clear);

    return row;
}

function getTxSendType(type) {
    return type.replace("spend", "Send").replace("create_acc_tx", "Send").replace("nc", "New Channel");
}

function getTxReceiveType(type) {
    return type.replace("spend", "Receive").replace("create_acc_tx", "Receive").replace("nc", "New Channel");
}

module.exports = initTransactionsTab;
const views = require('../lib/views.js');
const network = require('../controller/network-controller.js');
const storage = require('../lib/storage.js');
const userController = require('../controller/user-controller.js');
const elliptic = require('elliptic');
const merkle = require('../lib/merkle-proofs.js');
const cryptoUtility = require('../lib/crypto-utility.js');
const config = require('../config.js');

function initSpend(account) {
    var max = views.find(views.ids.send.max);
    max.onclick = function () {
        storage.getTopHeader(function(error, header) {
            var spendAmount = views.find(views.ids.send.amount);
            userController.getBalance(account, header, function (error, value) {
                if (value > 0) {
                    var maxTxFee = views.find(views.ids.send.fee);
                    if (value < parseFloat(maxTxFee.value)) {
                        value = 0;
                    } else {
                        value = value - parseFloat(maxTxFee.value);
                    }
                }

                spendAmount.value = value;
            });
        })
    };

    var sendButton = views.find(views.ids.send.button);
    sendButton.onclick = function() {
        storage.getTopHeader(function(error, header) {
            userController.getBalance(account, header, function (error, balance) {
                var spendAddress = views.find(views.ids.send.address);
                var spendAmount = views.find(views.ids.send.amount);
                var maxTxFee = views.find(views.ids.send.fee);
                var address = spendAddress.value;
                var amount = parseFloat(spendAmount.value);
                var fee = parseFloat(maxTxFee.value);
                if (!address || address.length < 80) {
                    showSendMessage("Invalid address", true);
                } else if (!amount || amount <= 0) {
                    showSendMessage("Invalid amount", true);
                } else if (amount + fee > balance) {
                    showSendMessage("Not enough VEO", true);
                } else if (fee < 0) {
                    showSendMessage("Invalid fee", true);
                } else {
                    spendTokens(account);
                }
            })
        });
    }

    initFee();
}

function initFee() {
	views.setText(views.ids.send.txFeeDefault, config.defaultFee);
	views.setValue(views.ids.send.fee, config.defaultFee);

	var txFeeButton = views.find(views.ids.send.txFeeButton);
	txFeeButton.onclick = function(e) {
		views.hide(views.ids.send.defaultFeeContainer);
		views.show(views.ids.send.txFeeEdit);
    }
}

function showSendMessage(text, error) {
    var message = views.find(views.ids.send.error);
    if (error) {
        message.className = "error";
    } else {
        message.className = "success";
    }
    message.innerHTML = text
}

function spendTokens(account) {
    var from = account.publicKey;

    var spendAddress = views.find(views.ids.send.address);
    var to = spendAddress.value;

    var spendAmount = views.find(views.ids.send.amount);
    var amount = Math.floor(parseFloat(spendAmount.value, 10) * 100000000);

    var maxTxFee = views.find(views.ids.send.fee);
    var fee = Math.floor(parseFloat(maxTxFee.value, 10) * 100000000);

    function spendTokensResponse(error, tx) {
        var maxTxFee = document.getElementById("tx-fee");
        var fee = Math.floor(parseFloat(maxTxFee.value, 10) * 100000000);
        var amount = Math.floor(parseFloat(spendAmount.value, 10) * 100000000);
        var to = spendAddress.value;
        var serverAmount = tx[5];
        var serverTo = tx[4];
        var serverFee = tx[3];
        if (amount !== serverAmount) {
            console.error("abort: server changed the amount.");
            showSendMessage("Unexpected response from server.  Try selecting a different node or try again later.", true);
        } else if (to !== serverTo) {
            console.error("abort: server changed who we are sending money to.");
            showSendMessage("Unexpected response from server.  Try selecting a different node or try again later.", true);
        } else if (fee < serverFee) {
            console.error("abort: server increased the fee.");
            showSendMessage("The fee is too low ", true);
        } else {
            spendAddress.value = "";
            spendAmount.value = "";

            var ec = new elliptic.ec('secp256k1');
            var keys = ec.keyFromPrivate(account.privateKey, "hex");
            var stx = cryptoUtility.signTx(keys, tx);

            network.send(["txs", [-6, stx]], function (error, response) {
                showSendMessage("Tranaction created.  Your VEO should be sent when the next block is mined.", false);
            });
        }
    }

    storage.getTopHeader(function(error, topHeader) {
        if (topHeader === 0) {
            showSendMessage("Please wait until the wallet is synced", true);
        } else {
            network.send(["account", to],
                function (error, response) {
                    if (response === "empty") {
                        merkle.requestProof(topHeader, "governance", 14, function (error, gov_fee) {
                            fee = treeNumberToValue(gov_fee[2]) + 50;
                            network.send(["create_account_tx", amount, fee, from, to], spendTokensResponse);
                        });
                    } else {
                        merkle.requestProof(topHeader, "governance", 15, function (error, gov_fee) {
                            fee = treeNumberToValue(gov_fee[2]) + 50;
                            network.send(["spend_tx", amount, fee, from, to], spendTokensResponse);
                        });
                    }
                });
        }
    });
}

function treeNumberToValue(t) {
    if (t < 101) {
        return t;
    } else {
        var top = 101;
        var bottom = 100;
        var t2 = t - 100;
        var x = treeNumberDetPower(10000, top, bottom, t2);
        return Math.floor(x / 100);
    }
}

function treeNumberDetPower(base, top, bottom, t) {
    if (t === 1) {
        return Math.floor((base * top) / bottom);
    }
    var r = Math.floor(t % 2);
    if (r === 1) {
        var base2 = Math.floor((base * top) / bottom);
        return treeNumberDetPower(base2, top, bottom, t - 1);
    } else if (r === 0) {
        var top2 = Math.floor((top * top) / bottom);
        return treeNumberDetPower(base, top2, bottom, Math.floor(t / 2));
    }
}


exports.init = initSpend;
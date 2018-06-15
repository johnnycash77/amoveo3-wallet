function initSpend() {
    var max = document.getElementById('send-max-amount');
    max.onclick = function () {
        var spendAmount = document.getElementById("send-amount");
        getBalance(account, function (value) {
            if (value > 0) {
                var maxTxFee = document.getElementById("tx-fee");
                value = parseFloat(spendAmount.value) - parseFloat(maxTxFee.value);
            }

            spendAmount.value = value;
        });
    };

    var sendButton = document.getElementById('send-button');
    sendButton.onclick = function (error, result) {
        getStorage({accounts: []}, function (result) {
            var accounts = result.accounts;
            var account = accounts[0];
            getBalance(account, function (balance) {
                var spendAddress = document.getElementById("send-address");
                var spendAmount = document.getElementById("send-amount");
                var maxTxFee = document.getElementById("tx-fee");
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
                    spend_tokens(account);
                }
            })
        });
    }
}

function showSendMessage(text, error) {
    var message = document.getElementById("send-message");
    if (error) {
        message.className = "error";
    } else {
        message.className = "success";
    }
    message.innerHTML = text
}

function spend_tokens(account) {
    var spendAddress = document.getElementById("send-address");
    var to = spendAddress.value;
    var spendAmount = document.getElementById("send-amount");
    var amount = Math.floor(parseFloat(spendAmount.value, 10) * 100000000);
    var maxTxFee = document.getElementById("tx-fee");
    var fee = Math.floor(parseFloat(maxTxFee.value, 10) * 100000000);
    var from = account.publicKey;

    function spend_tokens2(tx, callback) {
        var maxTxFee = document.getElementById("tx-fee");
        var fee = Math.floor(parseFloat(maxTxFee.value, 10) * 100000000);
        var spendAddress = document.getElementById("send-address");
        var spendAmount = document.getElementById("send-amount");
        var amount = Math.floor(parseFloat(spendAmount.value, 10) * 100000000);
        var amount0 = tx[5];
        var to = spendAddress.value;
        var to0 = tx[4];
        var fee0 = tx[3];
        if (amount !== amount0) {
            console.error("abort: server changed the amount.");
            showSendMessage("Unexpected response from server.  Try selecting a different node or try again later.", true);
        } else if (to !== to0) {
            console.error("abort: server changed who we are sending money to.");
            showSendMessage("Unexpected response from server.  Try selecting a different node or try again later.", true);
        } else if (fee < fee0) {
            console.error("abort: server increased the fee.");
            showSendMessage("The fee is too low ", true);
        } else {
            spendAddress.value = "";
            spendAmount.value = "";

            var ec = new elliptic.ec('secp256k1');
            var keys = ec.keyFromPrivate(account.privateKey, "hex");
            var stx = signTx(keys, tx);

            variable_public_get(["txs", [-6, stx]], function (x) {
                console.log(x);
                showSendMessage("Tranaction created.  Your VEO should be sent when the next block is mined.", false);
            });
        }
    }

    getStorage({topHeader: 0}, function (result) {
        var topHeader = result.topHeader;
        if (topHeader == 0) {
            showSendMessage("Please wait until the wallet is synced", true);
        } else {
            variable_public_get(["account", to],
                function (result) {
                    if (result == "empty") {
                        merkle.request_proof(topHeader, "governance", 14, function (gov_fee) {
                            fee = tree_number_to_value(gov_fee[2]) + 50;
                            variable_public_get(["create_account_tx", amount, fee, from, to], spend_tokens2);
                        });
                    } else {
                        merkle.request_proof(topHeader, "governance", 15, function (gov_fee) {
                            fee = tree_number_to_value(gov_fee[2]) + 50;
                            variable_public_get(["spend_tx", amount, fee, from, to], spend_tokens2);
                        });
                    }
                });
        }
    });
}

function signTx(keys, tx) {
    if (tx[0] == "signed") {
        var sig = btoa(array_to_string(signSha356(tx[1], keys)));
        var pub = pubkey_64();
        if (pub == tx[1][1]) {
            tx[2] = sig;
        } else if (pub == tx[1][2]) {
            tx[3] = sig;
        } else {
            throw("sign error");
        }
        return tx;
    } else {
        var sig = btoa(array_to_string(signSha356(tx, keys)));
        return ["signed", tx, sig, [-6]];
    }
}

function signSha356(data, key) {
    //ecdsa, sha356
    var d2 = serialize(data);
    var h = hash(d2);
    var sig = key.sign(h);
    return sig.toDER();
}

function tree_number_to_value(t) {
    if (t < 101) {
        return t;
    } else {
        var top = 101;
        var bottom = 100;
        var t2 = t - 100;
        var x = tree_number_det_power(10000, top, bottom, t2);
        return Math.floor(x / 100);
    }
}

function tree_number_det_power(base, top, bottom, t) {
    if (t == 1) {
        return Math.floor((base * top) / bottom);
    }
    var r = Math.floor(t % 2);
    if (r == 1) {
        var base2 = Math.floor((base * top) / bottom);
        return tree_number_det_power(base2, top, bottom, t - 1);
    } else if (r == 0) {
        var top2 = Math.floor((top * top) / bottom);
        return tree_number_det_power(base, top2, bottom, Math.floor(t / 2));
    }
}

function serialize(data) {
    if (Number.isInteger(data)) {
        //console.log("serialize integer");
        //<<3:8, X:512>>;
        var x = integer_to_array(3, 1).concat(integer_to_array(data, 64));
        return x;
    } else if (Array.isArray(data)) {
        if (data[0] == -6) { //its a list.
            //<<1:8, S:32, A/binary>>;
            var d0 = data.slice(1);
            var rest = serialize_list(d0);
            return integer_to_array(1, 1).concat(integer_to_array(rest.length, 4)).concat(rest);
        } else if (data[0] == -7) { //it is a tuple
            //<<2:8, S:32, A/binary>>;
            var d0 = data.slice(1);
            var rest = serialize_list(d0);
            return integer_to_array(2, 1).concat(integer_to_array(rest.length, 4)).concat(rest);
        } else if (typeof(data[0]) == "string") { //assume it is a record. a tuple where the first element is an atom. This is the only place that atoms can occur.
            var h = data[0];
            var d0 = data.slice(1);
            //<<4:8, S:32, A/binary>>;
            var atom_size = h.length;
            var first = integer_to_array(4, 1).concat(integer_to_array(atom_size, 4)).concat(string_to_array(h));
            var rest = first.concat(serialize_list(d0));
            return integer_to_array(2, 1).concat(integer_to_array(rest.length, 4)).concat(rest);
        }
    }
    //assume it is a binary
    //console.log("serialize binary");
    //<<0:8, S:32, X/binary>>;
    if (typeof(data) === "string") {
        var rest = string_to_array(atob(data));
        return integer_to_array(0, 1).concat(integer_to_array(rest.length, 4)).concat(rest);
    } else {
        return integer_to_array(0, 1).concat(integer_to_array(data.length, 4)).concat(data);
    }

    function serialize_list(l) {
        var m = [];
        for (var i = 0; i < l.length; i++) {
            m = m.concat(serialize(l[i]));
        }
        return m;
    }
}

function array_to_string(x) {
    var a = "";
    for (var i = 0; i< x.length; i++) {
        a += String.fromCharCode(x[i]);
    }
    return a;
}
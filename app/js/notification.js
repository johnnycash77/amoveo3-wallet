const NotificationManager = require('./lib/notification-manager.js');
const notificationManager = new NotificationManager();
const formatUtility = require('./lib/format-utility');
const cryptoUtility = require('./lib/crypto-utility');
const storage = require('./lib/storage');
const userController = require('./controller/user-controller');
const passwordController = require('./controller/password-controller');
const merkle = require('./lib/merkle-proofs');
const network = require('./controller/network-controller');
const elliptic = require('./lib/elliptic.min.js');

const fee = 152050;
const DECIMALS = 100000;

const ec = new elliptic.ec('secp256k1');

function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
	const regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)");
	let results = regex.exec(url);
	console.log(results);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2]);
}

if (getParameterByName('type') === "channel") {
    initChannel();
} else if (getParameterByName('type') === "market") {
    initBet();
} else if (getParameterByName('type') === "cancel") {
    initCancel();
}

function setTitle(title) {
    document.getElementById("notification-title").innerHTML = title;
}

function initChannel() {
    setTitle("New Channel");

    //xss safety
	const div = document.createElement('div');
	div.setAttribute('data-ip', getParameterByName('ip'));
	const ip = div.getAttribute('data-ip');
	div.setAttribute('data-duration', getParameterByName('duration'));
	const duration = div.getAttribute('data-duration');
	div.setAttribute('data-locked', getParameterByName('locked'));
	const locked = div.getAttribute('data-locked');
	div.setAttribute('data-delay', getParameterByName('delay'));
	const delay = div.getAttribute('data-delay');

	const ipInput = document.getElementById('channel-ip-address');
	ipInput.innerHTML = ip;
	const lockedInput = document.getElementById('new-channel-amount');
	lockedInput.innerHTML = locked;
	const delayInput = document.getElementById('new-channel-delay');
	delayInput.innerHTML = delay;
	const lengthInput = document.getElementById('new-channel-length');
	lengthInput.innerHTML = duration;

    document.getElementById('new-channel-container').classList.remove('hidden');

    document.getElementById('cancel-channel-button').onclick = function() {
        notificationManager.closePopup();
    };

    document.getElementById('channel-advanced-button').onclick = function() {
        document.getElementById('channel-advanced-container').classList.remove('hidden');
    };

    network.send(["time_value"], function(error, timeValue) {
        initFee(timeValue);

	    const channelButton = document.getElementById('create-channel-button');
	    channelButton.onclick = function() {
	        const locked = safeFloat(lockedInput.value);
	        const delay = safeFloat(delayInput.value);
	        const length = safeFloat(lengthInput.value);

	        if (locked === 0 || delay === 0 || length === 0) {
                showChannelError("Fields may not be 0.")
            } else {
                makeChannel(locked, delay, length, timeValue);
            }
        }
    });

    getUserBalance();
}

function safeFloat(f) {
	let val = parseFloat(f);
	if (isNaN(val)) {
        val = 0;
    }
    return val;
}

function reloadWeb() {
    chrome.tabs.query({}, function (tabs) {
        for (let i = 0; i < tabs.length; i++) {
	        const tab = tabs[i];
	        if (tab.url.indexOf("localhost:8000") !== -1 || tab.url.indexOf("amoveobook") !== -1) {
                chrome.tabs.reload(tab.id);
            }
        }
    });
}

function showChannelError(message) {
	const error = document.getElementById("new-channel-error-text");
	error.classList.remove("invisible");
    error.innerHTML = message;
}

function showBetError(message) {
	const error = document.getElementById("bet-error-text");
	error.classList.remove("invisible");
    error.innerHTML = message;
}

function initFee(timeValue) {
    function updateFee() {
	    const timeValueFee = timeValue / 100000000;
	    let amount = parseFloat(document.getElementById('new-channel-amount').value);
	    if (isNaN(amount)) {
            amount = 0;
        }
	    let length = parseFloat(document.getElementById('new-channel-length').value);
	    if (isNaN(length)) {
            length = 0;
        }

	    const rate = document.getElementById('total-rate');
	    const blocks = document.getElementById('fee-block-number');
	    const locked = document.getElementById('fee-amount-number');
	    const total = document.getElementById('total-fee');
	    const total2 = document.getElementById('total-fee2');

	    rate.innerHTML = timeValueFee;
        blocks.innerHTML = length;
        locked.innerHTML = amount;
	    const totalFee = 0.0015205 + timeValueFee * amount * length;
	    total.innerHTML = totalFee + " " + "VEO";
        total2.innerHTML = totalFee + " " + "VEO";
    }

    document.getElementById('new-channel-amount').oninput = updateFee;
    document.getElementById('new-channel-delay').oninput = updateFee;
    document.getElementById('new-channel-length').oninput = updateFee;

    updateFee();
}

function initBet() {
    setTitle("Confirm Bet");
	document.getElementById('make-bet-container').classList.remove('hidden');

	const amount = parseFloat(getParameterByName('amount'));
	const side = getParameterByName('side');
	const oid = getParameterByName('oid');
	const price = parseFloat(getParameterByName('price'));

	const amountText = document.getElementById('bet-amount');
	const oddsText = document.getElementById('bet-price');
	const sideText = document.getElementById("bet-side");
	const betButton = document.getElementById('create-bet-button');
	const cancelButton = document.getElementById('cancel-bet-button');

	amountText.value = amount;
    oddsText.value = price;
	sideText.innerText = capitalize(side);

	betButton.onclick = function() {
	    const amount = parseFloat(amountText.value);
	    const odds = parseFloat(oddsText.value) * 100;

	    if (amount > 0 && odds > 0) {
            makeBet(amount, odds, side, oid, function() {
                reloadWeb();

                notificationManager.closePopup();
            });
        } else {
            showBetError("Values must not be 0.")
        }
    };

	cancelButton.onclick = function() {
        notificationManager.closePopup();
    };

    showMaxBalance(amount, price);
}

function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
}

function makeChannel(amount, delay, length, timeValue) {
    network.send(["pubkey"], function(error, pubkey) {
        storage.getTopHeader(function(error, topHeader) {
            if (topHeader !== 0) {
                passwordController.getPassword(function(password) {
                    if (!password) {
                        showChannelError("Your wallet is locked.  Please unlock your wallet and try again.")
                    } else {
                        storage.getAccounts(password, function(error, accounts) {
                            if (accounts.length === 0) {
                                showChannelError("Please open the wallet and create an account.")
                            } else {
	                            const account = accounts[0];
	                            amount = Math.floor(parseFloat(amount, 10) * DECIMALS) - fee;
                                delay = parseInt(delay, 10);
	                            const expiration = parseInt(length, 10) + topHeader[1];
	                            const bal2 = amount - 1;

	                            const acc1 = account.publicKey;
	                            const acc2 = pubkey;

	                            userController.getBalance(account, topHeader, function (error, balance) {
                                    if ((amount / DECIMALS) > balance) {
                                        showChannelError("You do not have enough VEO.")
                                    } else {
                                        network.send(["new_channel_tx", acc1, pubkey, amount, bal2, delay, fee],
                                            function (error, x) {
                                                makeChannelCallback2(x, amount, bal2, acc1, acc2, delay, expiration, pubkey, topHeader, timeValue);
                                            }
                                        );
                                    }
                                });
                            }
                        })
                    }
                })
            } else {
                showChannelError("Wallet not synced. Please open the wallet and let it sync.")
            }
        });
    });
}

function makeChannelCallback2(tx, amount, bal2, acc1, acc2, delay, expiration, pubkey, topHeader, timeValue) {
	const amount0 = tx[5];
	const bal20 = tx[6];
	const fee0 = tx[3];
	const acc10 = tx[1];
	const acc20 = tx[2];
	const cid = tx[8];
	const delay0 = tx[7];
	if ((delay !== delay0) || (amount !== amount0) || (bal2 !== bal20) || (fee !== fee0) ||
        (acc1 !== acc10) || (acc2 !== acc20)) {
        console.log(JSON.stringify([[delay, delay0], [amount, amount0], [bal2, bal20], [fee, fee0], [acc1, acc10], [acc2, acc20]]));
        console.log("server edited the tx. aborting");
    } else {
	    const lifespan = expiration - topHeader[1];
	    const spk_amount = Math.floor((timeValue * (delay + lifespan) * (amount + bal2)) / DECIMALS);
	    const spk = ["spk", acc1, acc2, [-6], 0, 0, cid, spk_amount, 0, delay];
	    passwordController.getPassword(function(password) {
            if (!password) {
                showChannelError("Your wallet is locked.  Please unlock your wallet and try again.")
            } else {
                storage.getAccounts(password, function (error, accounts) {
                    if (accounts.length === 0) {
                        showChannelError("Please open the wallet and create account");
                    } else {
	                    const account = accounts[0];
	                    const keys = ec.keyFromPrivate(account.privateKey, "hex");
	                    const stx = cryptoUtility.signTx(keys, tx);
	                    const sspk = cryptoUtility.signTx(keys, spk);

	                    try {
                            network.send(["new_channel", stx, sspk, expiration],
                                function(error, x) {
                                    return channels3(x, expiration, pubkey, spk, tx)
                                }
                            );
                        } catch(e) {
                            console.error(e);
                            showChannelError("An error occurred, please try again later");
                        }
                    }
                });
            }
        });
    }
}

function channels3(x, expiration, pubkey, spk, tx_original) {
	let sstx = x[1];

	if (!sstx || sstx.length < 1) {
        showChannelError("An error occurred.");
        return;
    }

	const s2spk = x[2];
	const tx = sstx[1];
	if (JSON.stringify(tx) !== JSON.stringify(tx_original)) {
        console.log(JSON.stringify(tx));
        console.log(JSON.stringify(tx_original));
        throw("the server illegally manipulated the tx");
    }
	let a = verifyBoth(sstx);
	if (!(a)) {
        throw("bad signature on tx in channels 3");
    }
    a = verify2(s2spk);
    if (!a) {
        throw("bad signature on spk in channels 3");
    }
    if (JSON.stringify(spk) !== JSON.stringify(s2spk[1])) {
        throw("the server illegally manipulated the spk");
    }
	const cid = tx[8];
	const acc2 = tx[2];

	var spk = s2spk[1];
	const channel = newChannel(spk, s2spk, [], [], expiration, cid);
	channel["serverPubKey"] = pubkey;

    console.log(JSON.stringify(channel));

    saveChannel(channel, function() {
        reloadWeb();

        notificationManager.closePopup();
    });
}

function saveChannel(channel, callback) {
    storage.getChannels(function(error, channels) {
        channels.push(channel);
        storage.setChannels(channels, function() {
            callback();
        })
    })
}

function verify(data, sig0, key) {
	const sig = bin2rs(atob(sig0));
	const d2 = serialize(data);
	const h = hash(d2);
	return key.verify(h, sig, "hex");
}

function bin2rs(x) {
    /*
      0x30 b1 0x02 b2 (vr) 0x02 b3 (vs)
      where:

      b1 is a single byte value, equal to the length, in bytes, of the remaining list of bytes (from the first 0x02 to the end of the encoding);
      b2 is a single byte value, equal to the length, in bytes, of (vr);
      b3 is a single byte value, equal to the length, in bytes, of (vs);
      (vr) is the signed big-endian encoding of the value "r", of minimal length;
      (vs) is the signed big-endian encoding of the value "s", of minimal length.
    */
	const h = formatUtility.toHex(x);
	const a2 = x.charCodeAt(3);
	const r = h.slice(8, 8 + (a2 * 2));
	const s = h.slice(12 + (a2 * 2));
	return {"r": r, "s": s};
}

function verify1(tx) {
    return verify(tx[1], tx[2], ec.keyFromPublic(formatUtility.toHex(atob(tx[1][1])), "hex"));
}

function verify2(tx) {
    return verify(tx[1], tx[3], ec.keyFromPublic(formatUtility.toHex(atob(tx[1][2])), "hex"));
}

function verifyBoth(tx) {
    return (verify1(tx) && verify2(tx));
}

function newChannel(me, them, ssme, ssthem, expiration, cid) {
    return {"me": me, "them": them, "ssme": ssme, "ssthem": ssthem, "cid":cid, "expiration": expiration};
}

function newSs(code, prove, meta) {
    if (meta === undefined) {
        meta = 0;
    }
    return {"code": code, "prove": prove, "meta": meta};
}

function makeBet(amount, price, type, oid, callback) {
    network.send(["market_data", oid], function (error, l) {
	    const price_final = Math.floor(100 * parseFloat(price, 10));
	    let type_final;
	    const ttv = type;
	    if ((ttv === "true") ||
            (ttv === 1) ||
            (ttv === "yes") ||
            (ttv === "si") ||
            (ttv === "cierto") ||
            (ttv === "lon") ||
            (ttv === "真正") ||
            (ttv === "既不是")) {
            type_final = 1;
        } else if ((ttv === "false") ||
            (ttv === 0) ||
            (ttv === 2) ||
            (ttv === "falso") ||
            (ttv === "no") ||
            (ttv === "lon ala") ||
            (ttv === "也不是") ||
            (ttv === "假")) {
            type_final = 2;
        }
	    const amount_final = Math.floor(parseFloat(amount, 10) * DECIMALS);
	    const oid_final = oid;
	    const expires = l[1];
	    const server_pubkey = l[2];
	    const period = l[3];

	    storage.getTopHeader(function(error, topHeader) {
            if (topHeader !== 0) {
                passwordController.getPassword(function(password) {
                    if (!password) {
                        showBetError("Your wallet is locked.  Please unlock your wallet and try again.")
                    } else {
                        storage.getAccounts(password, function(error, accounts) {
	                        const account = accounts[0];
	                        const sc = marketContract(type_final, expires, price_final, server_pubkey, period, amount_final, oid_final, topHeader[1]);
	                        storage.getChannels(function (error, channels) {
	                            let channelFound = false;
	                            let channel;
	                            for (let i = 0; i < channels.length; i++) {
                                    channel = channels[i];
                                    if (channel.me[1] === account.publicKey && channel.serverPubKey === server_pubkey) {
                                        channelFound = true;
                                        break;
                                    }
                                }

                                if (channelFound) {
	                                const spk = marketTrade(channel, amount_final, price_final, sc, server_pubkey, oid_final);
	                                const keys = ec.keyFromPrivate(account.privateKey, "hex");
	                                const sspk = cryptoUtility.signTx(keys, spk);

	                                const trie_key = channel.me[6];

	                                try {
                                        merkle.requestProof(topHeader, "channels", trie_key, function(error, val) {
	                                        const spk = channel.them[1];
	                                        const expiration = channel.expiration;
	                                        const height = topHeader[1];
	                                        const amount = spk[7];
	                                        const betAmount = sumBets(spk[3]);
	                                        const mybalance = ((val[4] - amount - betAmount));
	                                        const serverbalance = ((val[5] + amount) / DECIMALS);

	                                        if (amount_final > mybalance) {
                                                showBetError("You do not have enough VEO in this channel.")
                                            } else {
                                                try {
                                                    return network.send(["trade", account.publicKey, price_final, type_final, amount_final, oid_final, sspk, fee], function (error, x) {
                                                        make_bet3(x, sspk, server_pubkey, oid_final, callback);
                                                    });
                                                } catch (e) {
                                                    console.error(e);
                                                    showBetError("An error occurred.  Please verify you have a channel open and the \"new channel\" transaction has been added to the blockchain.")
                                                }
                                            }
                                        });
                                    } catch(e) {
                                        console.error(e);
                                        callback(row);
                                    }
                                } else {
                                    showBetError("No channel found.  You must first open a channel in order to make bets.")
                                }
                            });
                        });
                    }
                });
            }
        });
    });
}

function sumBets(bets) {
	let x = 0;
	for (let i = 1; i < bets.length; i++) {
        x += bets[i][2];
    }
    return x;
}

function marketContract(direction, expires, maxprice, server_pubkey, period, amount, oid, bet_height) {
	let a;
	const a2 = formatUtility.stringToArray(atob("AAAAAAJ4AA=="));
	const b = formatUtility.stringToArray(atob("AAAAAAN4AA=="));
	const c = formatUtility.stringToArray(atob("AAAAAAR4AgAAACA="));
	const d = formatUtility.stringToArray(atob("AAAAAAV4AA=="));
	const e = formatUtility.stringToArray(atob("AAAAAAZ4AgAAAEE="));
	let f;
	if (direction === 1) {
		a = formatUtility.stringToArray(atob("AAAAJxAAAAAAAXgA"));
		f = formatUtility.stringToArray(atob("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"));
	} else if (direction === 2) {
		a = formatUtility.stringToArray(atob("AAAAAAAAAAAAAXgA"));
		f = formatUtility.stringToArray(atob("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"));
	} else {
        console.log("that is an invalid direction");
        console.log(direction);
        return("invalid direction to bet");
    }

    console.log("market oid is ");
    console.log(oid);
	const g = a.concat(formatUtility.intToArray(bet_height, 4)).concat(a2).concat(formatUtility.intToArray(expires, 4))
	.concat(b).concat(formatUtility.intToArray(maxprice, 4)).concat(c).concat(formatUtility.intToArray(atob(oid)))
	.concat(d).concat(formatUtility.intToArray(period, 4)).concat(e).concat(formatUtility.intToArray(atob(server_pubkey)))
	.concat(f);
	console.log("compiled contract");
    console.log(JSON.stringify(g));
	const contract = btoa(formatUtility.arrayToString(g));
	const codekey = ["market", 1, oid, expires, server_pubkey, period, oid];
	return ["bet", contract, amount, codekey, [-7, direction, maxprice]]; //codekey is insttructions on how to re-create the contract, so we can do pattern matching when updating channels.
}

function marketTrade(channel, amount, price, bet, oid) { //oid unused
	const market_spk = channel.me;
	console.log("market trade spk before ");
    console.log(JSON.stringify(market_spk));
	const cid = market_spk[6];
	const time_limit = 10000;//actually constants:time_limit div 10
	const space_limit = 100000;
	const cGran = 10000;
	const a = Math.floor((amount * price) / cGran);
	market_spk[3][0] = bet;
    market_spk[3] = ([-6]).concat(market_spk[3]);//add new bet to front
    market_spk[8] = market_spk[8] + 1; //nonce
    market_spk[5] = market_spk[5] + time_limit;// time_gas/10
    market_spk[4] = Math.max(market_spk[4], space_limit); //space_gas
    market_spk[7] = market_spk[7] - a; //amount
    console.log("market trade spk after ");
    console.log(JSON.stringify(market_spk));
    return market_spk;
}

function make_bet3(sspk2, sspk, server_pubkey, oid_final, callback) {
    if (!verifyBoth(sspk2)) {
        throw("make bet3, badly signed sspk2");
    }
	const hspk2 = JSON.stringify(sspk2[1]);
	const hspk = JSON.stringify(sspk[1]);
	if (hspk !== hspk2) {
        console.log("error, we calculated the spk differently from the server. you calculated this: ");
        console.log(JSON.stringify(sspk[1]));
        console.log("the server calculated this: ");
        console.log(JSON.stringify(sspk2[1]));
    }

    storage.getChannels(function(error, channels) {
        for (let i = 0; i < channels.length; i++) {
	        const channel = channels[i];
	        if (channel.serverPubKey === server_pubkey) {
                channel.me = sspk[1];
                channel.them = sspk2;
	            const newss = newSs([0, 0, 0, 0, 4], [-6, ["oracles", oid_final]]);
	            channel.ssme = ([newss]).concat(channel.ssme);
                channel.ssthem = ([newss]).concat(channel.ssthem);
                break;
            }
        }
        storage.setChannels(channels, function() {
            callback();
        })
    })
}

function initCancel() {
    setTitle("Are you sure you want to cancel?");

    document.getElementById('cancel-container').classList.remove('hidden');

	const index = parseInt(getParameterByName('index'));
	const amount = parseInt(getParameterByName('amount'));
	const price = parseFloat(getParameterByName('price'));
	const side = getParameterByName('side');

	document.getElementById("cancel-bet-side").innerHTML = capitalize(side);
    document.getElementById("cancel-bet-amount").innerHTML = "" + amount;
    document.getElementById("cancel-bet-price").innerHTML = "" + price;

	const cancelButton = document.getElementById("cancel-button");
	cancelButton.onclick = function() {
        network.send(["pubkey"], function(error, pubkey) {
            cancelTrade(index + 2, pubkey);
        });
    };

    document.getElementById('cancel-cancel-button').onclick = function() {
        notificationManager.closePopup();
    }
}

function cancelTrade(n, server_pubkey) {
    storage.getChannels(function(error, channels) {
	    let oldCD;
	    for (let i = 0; i < channels.length; i++) {
	        const channel = channels[i];
	        if (channel.serverPubKey === server_pubkey) {
                oldCD = channel;
                break;
            }
        }

        if (oldCD) {
	        const spk = oldCD.me;
	        const ss = oldCD.ssme[n - 2];

	        if (JSON.stringify(ss.code) === JSON.stringify([0,0,0,0,4])) {//this is what an unmatched trade looks like.
	            const spk2 = removeBet(n - 1, spk);
	            spk2[8] += 1000000;
                passwordController.getPassword(function(password) {
                    if (!password) {
                        showCancelError("Your wallet is locked.  Please unlock your wallet and try again.")
                    } else {
                        storage.getAccounts(password, function (error, accounts) {
	                        const account = accounts[0];
	                        const keys = ec.keyFromPrivate(account.privateKey, "hex");
	                        const sspk2 = cryptoUtility.signTx(keys, spk2);
	                        const pubPoint = keys.getPublic("hex");
	                        const pubKey = btoa(formatUtility.fromHex(pubPoint));
	                        const msg = ["cancel_trade", pubKey, n, sspk2];
	                        network.send(msg, function (error, x) {
                                return cancelTradeResponse(x, sspk2, server_pubkey, n - 2);
                            });
                        })
                    }
                });
            } else {
                console.log(ss);
                showCancelError("This trade has already been partially or fully matched. It cannot be canceled now.");
            }
        } else {
            showCancelError("Channel not found");
        }
    });
}

function showCancelError(message) {
	const error = document.getElementById("cancel-error-text");
	error.classList.remove("invisible");
    error.innerHTML = message;
}

function removeBet(n, spk0) {
	const spk = JSON.parse(JSON.stringify(spk0));
	const bets = spk[3];
	const bet = bets[n];
	const bets2 = removeNth(n, bets);
	const bet_meta = bet[4];
	let a;
	if (bet_meta === 0) {
        a = 0;
    } else {
	    const bet_amount = bet[2];
	    const cgran = 10000;
	    const price = bet_meta[2];
	    a = Math.floor((bet_amount * price) / cgran);
    }
    spk[3] = bets2;
    spk[7] = spk[7] + a;
    return spk;
}

function cancelTradeResponse(sspk2, sspk, server_pubkey, n) {
    storage.getChannels(function(error, channels) {
        for (let i = 0; i < channels.length; i++) {
	        const channel = channels[i];
	        if (channel.serverPubKey === server_pubkey) {
                console.log("cancel trade2, fail to verify this: ");
                console.log(JSON.stringify(sspk2));
	            const bool = verifyBoth(sspk2);
	            if (!(bool)) {
                    throw("cancel trade badly signed");
                }
	            const spk = sspk[1];
	            const spk2 = sspk2[1];
	            if (JSON.stringify(spk) !== JSON.stringify(spk2)) {
                    console.log("the server didn't calculate the same update as us");
                    console.log(spk);
                    console.log(spk2);
                    throw("cancel trade spk does not match");
                }
                channel.them = sspk2;
                channel.me = spk;
                channel.ssme = removeNth(n, channel.ssme);
                channel.ssthem = removeNth(n, channel.ssthem);
            }
        }

        storage.setChannels(channels, function() {
            reloadWeb();

            notificationManager.closePopup();
        })
    })
}

function removeNth(n, a) {
	const b = a.slice(0, n);
	const c = a.slice(n + 1, a.length);
	return b.concat(c);
}

function showMaxBalance(amount, price) {
	const priceFinal = Math.floor(100 * parseFloat(price, 10));
	network.send(["pubkey"], function(error, serverPubkey) {
		storage.getTopHeader(function (error, topHeader) {
			if (topHeader !== 0) {
				passwordController.getPassword(function (password) {
					if (!password) {
						showBetError("Your wallet is locked.  Please unlock your wallet and try again.")
					} else {
						storage.getAccounts(password, function (error, accounts) {
							const account = accounts[0];
							storage.getChannels(function (error, channels) {
								let channelFound = false;
								let channel;
								for (let i = 0; i < channels.length; i++) {
									channel = channels[i];
									if (channel.me[1] === account.publicKey && channel.serverPubKey === serverPubkey) {
										channelFound = true;
										break;
									}
								}

								if (channelFound) {
									const spk = marketTrade(channel, amount, priceFinal, sc, serverPubkey, oid_final);
									const keys = ec.keyFromPrivate(account.privateKey, "hex");
									const sspk = cryptoUtility.signTx(keys, spk);

									const trie_key = channel.me[6];

									merkle.requestProof(topHeader, "channels", trie_key, function (error, val) {
										const spk = channel.them[1];
										const amount = spk[7];
										const betAmount = sumBets(spk[3]);
										const mybalance = ((val[4] - amount - betAmount));

										const userBalance = document.getElementById("bet-user-balance");
										userBalance.classList.remove("invisible");
										userBalance.innerHTML = "Max bet: " + mybalance + " VEO";

										if (amount > userBalance) {
											showBetError("Your maximum possible bet is " + mybalance + "VEO");
										}
									});
								} else {
									showBetError("No channel found.  You must first open a channel in order to make bets.")
								}
							});
						});
					}
				});
			}
		});
	});
}

function getUserBalance() {
    storage.getTopHeader(function(error, topHeader) {
        if (topHeader !== 0) {
            passwordController.getPassword(function(password) {
                if (!password) {
                    showChannelError("Your wallet is locked.  Please unlock your wallet and try again.")
                } else {
                    storage.getAccounts(password, function(error, accounts) {
                        if (accounts.length === 0) {
                            showChannelError("Please open the wallet and create an account.")
                        } else {
	                        const account = accounts[0];
	                        userController.getBalance(account, topHeader, function (error, balance) {
	                            const userBalance = document.getElementById("channel-user-balance");
	                            userBalance.classList.remove("invisible");
                                userBalance.innerHTML = "Max: " + balance + " VEO";
                            });
                        }
                    })
                }
            })
        } else {
            showChannelError("Wallet not synced. Please open the wallet and let it sync.")
        }
    });
}
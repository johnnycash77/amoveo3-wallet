let NotificationManager = require('./lib/notification-manager.js');
let notificationManager = new NotificationManager();
const cryptoUtility = require('./lib/crypto-utility');
const formatUtility = require('./lib/format-utility');
const storage = require('./lib/storage');
const userController = require('./controller/user-controller');
const passwordController = require('./controller/password-controller');
const merkle = require('./lib/merkle-proofs');
const network = require('./controller/network-controller');
const elliptic = require('./lib/elliptic.min.js');

const lightningFee = 20;
const fee = 152050;
const DECIMALS = 100000000

let messageSent = false;

let ec = new elliptic.ec('secp256k1');

let notificationType = parseParam('type')

if (notificationType === "channel") {
	initChannel();
} else if (notificationType === "market") {
	initBet();
} else if (notificationType === "cancel") {
	initCancel();
} else if (notificationType === "sign") {
	initSigning();
}

window.onunload = function(e) {
	if (!messageSent) {
		chrome.extension.sendMessage({type: notificationType, error: "Rejected by user"});
	}
}

function parseParam(name) {
	const param = getParameterByName(name);

	//xss safety
	const div = document.createElement('div');
	div.setAttribute('data-message', param);
	const safeParam = div.getAttribute('data-message');
	return safeParam;
}

function getParameterByName(name, url) {
	if (!url) url = window.location.href;

	name = name.replace(/[\[\]]/g, "\\$&");
	let regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
		results = regex.exec(url);
	console.log(results);
	if (!results) return null;
	if (!results[2]) return '';
	return decodeURIComponent(results[2]);
}

function initSigning() {
	document.getElementById('signing-container').classList.remove('hidden');

	const message = parseParam('message');

	let messageInput = document.getElementById('sign-message');
	messageInput.innerHTML = message;

	initButtons(function() {
		passwordController.getPassword(function(password) {
			if (!password) {
				showSignedError("Your wallet is locked.  Please unlock your wallet and try again.")
			} else {
				storage.getAccounts(password, function (error, accounts) {
					if (accounts.length === 0) {
						showSignedError("Please open the wallet and create account");
					} else {
						let account = accounts[0];
						let keys = ec.keyFromPrivate(account.privateKey, "hex");
						let signed = keys.sign(message);

						sendMessageAndClose({ type: notificationType, signed: signed});
					}
				});
			}
		});
	}, function() {
		sendMessageAndClose({ type: notificationType, error: "Rejected by user"});
	});
}

function showSignedError(message) {
	let error = document.getElementById("sign-error-text");
	error.classList.remove("invisible");
	error.innerHTML = message;
}

function setTitle(title) {
	document.getElementById("notification-title").innerHTML = title;
}

function initButtons(confirmCallback, cancelCallback) {
	const yes = document.getElementById('yes-button');
	yes.onclick = function() {
		if (confirmCallback) {
			confirmCallback();
		}
	}

	const no = document.getElementById('no-button');
	no.onclick = function() {
		if (cancelCallback) {
			cancelCallback();
		}
	}
}

function initChannel() {
	setTitle("New Channel");

	//xss safety
	let ip = parseParam('ip');
	let duration = parseParam('duration');
	let locked = parseParam('locked');
	let delay = parseParam('delay');

	let ipInput = document.getElementById('channel-ip-address');
	ipInput.innerHTML = ip;
	let lockedInput = document.getElementById('new-channel-amount');
	lockedInput.innerHTML = locked;
	let delayInput = document.getElementById('new-channel-delay');
	delayInput.innerHTML = delay;
	let lengthInput = document.getElementById('new-channel-length');
	lengthInput.innerHTML = duration;

	document.getElementById('new-channel-container').classList.remove('hidden');

	document.getElementById('channel-advanced-button').onclick = function() {
		document.getElementById('channel-advanced-container').classList.remove('hidden');
	};

	getUserBalance();

	network.send(["time_value"], function(error, timeValue) {
		initFee(timeValue);


		initButtons(function() {
			let locked = safeFloat(lockedInput.value);
			let delay = safeFloat(delayInput.value);
			let length = safeFloat(lengthInput.value);

			if (locked === 0 || delay === 0 || length === 0) {
				showChannelError("Fields may not be 0.")
			} else {
				makeChannel(locked, delay, length, timeValue);
			}
		}, function() {
			sendMessageAndClose({ type: notificationType, error: "Rejected by user"});
		});
	});
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
			let tab = tabs[i];
			if (tab.url.indexOf("localhost:8000") !== -1 || tab.url.indexOf("amoveobook") !== -1) {
				chrome.tabs.reload(tab.id);
			}
		}
	});
}

function showChannelError(message) {
	let error = document.getElementById("new-channel-error-text");
	error.classList.remove("invisible");
	error.innerHTML = message;
}

function showBetError(message) {
	let error = document.getElementById("bet-error-text");
	error.classList.remove("invisible");
	error.innerHTML = message;
}

function initFee(timeValue) {
	function updateFee() {
		let timeValueFee = timeValue / 100000000;
		let amount = parseFloat(document.getElementById('new-channel-amount').value);
		if (isNaN(amount)) {
			amount = 0;
		}
		let length = parseFloat(document.getElementById('new-channel-length').value);
		if (isNaN(length)) {
			length = 0;
		}

		let rate = document.getElementById('total-rate');
		let blocks = document.getElementById('fee-block-number');
		let locked = document.getElementById('fee-amount-number');
		let total = document.getElementById('total-fee');
		let total2 = document.getElementById('total-fee2');

		rate.innerHTML = timeValueFee;
		blocks.innerHTML = length;
		locked.innerHTML = amount;
		let totalFee = 0.0015205 + timeValueFee * amount * length;
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

	let amountText = document.getElementById('bet-amount');
	let oddsText = document.getElementById('bet-price');

	let price = parseFloat(getParameterByName('price'));
	let amount = parseFloat(getParameterByName('amount'));
	let side = getParameterByName('side');
	let oid = getParameterByName('oid');
	let marketType = getParameterByName('marketType');

	amountText.value = amount;
	oddsText.value = price;

	document.getElementById("bet-side").innerText = capitalize(side);

	initButtons(function() {
		price = price * 100;

		if (amount > 0 && price > 0) {
			makeBet(amount, price, side, oid, function() {
				sendMessageAndClose(
					{
						type: notificationType,
						bet: {
							amount: amount,
							marketType: marketType,
							odds: price,
							side: side,
							oid: oid,
						}
					}
				);
			});
		} else {
			showBetError("Values must not be 0.")
		}
	}, function() {
		sendMessageAndClose({ type: notificationType, error: "Rejected by user"});
	});
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
								let account = accounts[0];
								amount = Math.floor(parseFloat(amount, 10) * DECIMALS) - fee;
								delay = parseInt(delay, 10);
								let expiration = parseInt(length, 10) + topHeader[1];
								let bal2 = amount - 1;

								let acc1 = account.publicKey;
								let acc2 = pubkey;

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
	let amount0 = tx[5];
	let bal20 = tx[6];
	let fee0 = tx[3];
	let acc10 = tx[1];
	let acc20 = tx[2];
	let cid = tx[8];
	let delay0 = tx[7];
	if ((delay !== delay0) || (amount !== amount0) || (bal2 !== bal20) || (fee !== fee0) ||
		(acc1 !== acc10) || (acc2 !== acc20)) {
		console.log(JSON.stringify([[delay, delay0], [amount, amount0], [bal2, bal20], [fee, fee0], [acc1, acc10], [acc2, acc20]]));
		console.log("server edited the tx. aborting");
	} else {
		let lifespan = expiration - topHeader[1];
		let spk_amount = Math.floor((timeValue * (delay + lifespan) * (amount + bal2) ) / DECIMALS);
		let spk = ["spk", acc1, acc2, [-6], 0, 0, cid, spk_amount, 0, delay];
		passwordController.getPassword(function(password) {
			if (!password) {
				showChannelError("Your wallet is locked.  Please unlock your wallet and try again.")
			} else {
				storage.getAccounts(password, function (error, accounts) {
					if (accounts.length === 0) {
						showChannelError("Please open the wallet and create account");
					} else {
						let account = accounts[0];
						let keys = ec.keyFromPrivate(account.privateKey, "hex");
						let stx = cryptoUtility.signTx(keys, tx);
						let sspk = cryptoUtility.signTx(keys, spk);

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

	if (!sstx || sstx.lenght < 1) {
		showChannelError("An error occurred.");
		return;
	}

	let s2spk = x[2];
	let tx = sstx[1];
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
	let cid = tx[8];
	let acc2 = tx[2];

	let channel = newChannel(s2spk[1], s2spk, [], [], expiration, cid);
	channel["serverPubKey"] = pubkey;

	console.log(JSON.stringify(channel));

	saveChannel(channel, function() {
		sendMessageAndClose({ type: notificationType, channel: channel});
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
	let sig = formatUtility.binToRs(atob(sig0));
	let d2 = cryptoUtility.serialize(data);
	let h = cryptoUtility.hash(d2);
	return key.verify(h, sig, "hex");
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
	if (meta == undefined) {
		meta = 0;
	}
	return {"code": code, "prove": prove, "meta": meta};
}

function makeBet(amount, price, type, oid, callback) {
	network.send(["market_data", oid], function (error, marketData) {
		let price_final = Math.floor(100 * parseFloat(price, 10));
		let type_final;
		let ttv = type;
		if ((ttv == "true") ||
			(ttv == "long") ||
			(ttv == 1) ||
			(ttv == "yes") ||
			(ttv == "si") ||
			(ttv == "cierto") ||
			(ttv == "lon") ||
			(ttv == "真正") ||
			(ttv == "既不是")) {
			type_final = 1;
		} else if ((ttv == "false") ||
			(ttv == "short") ||
			(ttv == 0) ||
			(ttv == 2) ||
			(ttv == "falso") ||
			(ttv == "no") ||
			(ttv == "lon ala") ||
			(ttv == "也不是") ||
			(ttv == "假")) {
			type_final = 2;
		}

		let amount_final = Math.floor(parseFloat(amount, 10) * DECIMALS);
		let oid_final = oid;
		let expires = marketData[1];
		let server_pubkey = marketData[2];
		let period = marketData[3];

		storage.getTopHeader(function(error, topHeader) {
			if (topHeader !== 0) {
				passwordController.getPassword(function(password) {
					if (!password) {
						showBetError("Your wallet is locked.  Please unlock your wallet and try again.")
					} else {
						storage.getAccounts(password, function(error, accounts) {
							let account = accounts[0];

							let sc;
							console.log(JSON.stringify(marketData));
							if (marketData[4][0] === "binary") {
								sc = marketContract(type_final, expires, price_final, server_pubkey, period, amount_final, oid_final, topHeader[1]);
							} else {
								let lower_limit = marketData[4][1];
								let upper_limit = marketData[4][2];
								// sanity-check, verify 10 == l[4][3];
								//all scalar markets currently use 10 binary oracles to measure values.
								sc = scalarMarketContract(type_final, expires, price_final, server_pubkey, period, amount_final, oid_final, topHeader[1], lower_limit, upper_limit, 10);
							}

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
									let marketExpiration = sc[3][3]
									let spk = marketTrade(channel, amount_final, price_final, sc, server_pubkey, oid_final);
									let keys = ec.keyFromPrivate(account.privateKey, "hex");
									let sspk = cryptoUtility.signTx(keys, spk);

									let trie_key = channel.me[6];

									try {
										merkle.requestProof(topHeader, "channels", trie_key, function(error, val) {
											let spk = channel.them[1];
											let expiration = channel.expiration;
											let height = topHeader[1];
											let amount = spk[7];
											let betAmount = sumBets(spk[3]);
											let mybalance = ((val[4] - amount - betAmount));
											let serverbalance = ((val[5] + amount) / DECIMALS);

											if (amount_final + lightningFee > mybalance) {
												showBetError("You do not have enough VEO in this channel.")
											} if (expiration < marketExpiration) {
												showBetError("Your channel is expiring before this market closes. This market requires a channel that is open to block " + marketExpiration + ".");
											} else {
												try {
													return network.send(["trade", account.publicKey, price_final, type_final, amount_final, oid_final, sspk, lightningFee], function (error, x) {
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
	let a2 = formatUtility.stringToArray(atob("AAAAAAJ4AA=="));
	let b = formatUtility.stringToArray(atob("AAAAAAN4AA=="));
	let c = formatUtility.stringToArray(atob("AAAAAAR4AgAAACA="));
	let d = formatUtility.stringToArray(atob("AAAAAAV4AA=="));
	let e = formatUtility.stringToArray(atob("AAAAAAZ4AgAAAEE="));
	let f;
	if (direction == 1) {
		a = formatUtility.stringToArray(atob("AAAAJxAAAAAAAXgA"));
		f = formatUtility.stringToArray(atob("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"));
	} else if (direction == 2) {
		a = formatUtility.stringToArray(atob("AAAAAAAAAAAAAXgA"));
		f = formatUtility.stringToArray(atob("AAAAAAd4AAAAAMgAAAAACHgWAAAAAAA6RhQUAAAAAAZ5FV4WNQAAAAAARxQAAAAAATpGFBQWAAAAACiHFRcAAAAAB3kpAAAAAAA6RgAAAAAIeQ1HAAAAAAh5AAAAAAEyAAAAAAh4SBQUAAAAAASHFgAAAAAChwIAAAACAAAWhhYAAAAAAocCAAAAAgAAFoYWAAAAAAV5OgAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFBQUGBUAAAAAAnk3UAAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFBcAAAAACXgVAAAAAAp4FQAAAAAEeQAAACcQFjM3UAAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFB4AAAAAC3iDFIMWAAAAAAU6RhQURw1IgxYAAAAABXk6RhQURw1IgxQAAAAAIIcUAAAAAAGHFhQCAAAAAwAAABaGAAAAAAE6RhQUAAAAAAAAAAAAAwAAAAABeUcUAAAAAAI6RhQUAAAAAAAAAAAAAwAAACcQAAAAAAF5M0cUAAAAAAM6RhQUAAAAAAAAAAAAAwAAACcQAAAAAAR5M0cUAAAAAAA6RhQUAAAAAAEAAAAAAQAAACcQAAAAAAR5M0dISEhIGAAAAAADeV4ZNkYzRxQUAAAAAABIAAAAAAN5MjQXFgAAAAADeQAAAAALeRk2RjNHFBQAAAAAAEgyFgAAAAAKeQAAACcQFjMAAAAABHk6RhQUAAAAAAl5NAAAACcQNQAAACcQAAAAAAR5MwAAACcQAAAAAAl5MzQAAAAnEDUyRxYzMkhHFAAAAAACOkYUFBQAAAAAKIcVFwAAAAAHeSkAAAAAADpGAAAAAAh5DUcAAAAACHkAAAAAATIAAAAACHhIFBQAAAAABIcWAAAAAAKHAgAAAAIAABaGFgAAAAAChwIAAAACAAAWhhYAAAAABXk6AAAAAAA6RgAAAAAIeQ1HAAAAAAh5AAAAAAEyAAAAAAh4SBQUFBQYFQAAAAACeTdQAAAAAAA6RgAAAAAIeQ1HAAAAAAh5AAAAAAEyAAAAAAh4SBQUFwAAAAAMeB4eAAAAACiHFRcAAAAAB3kpAAAAAAA6RgAAAAAIeQ1HAAAAAAh5AAAAAAEyAAAAAAh4SBQUAAAAAASHFgAAAAAChwIAAAACAAAWhhYAAAAAAocCAAAAAgAAFoYWAAAAAAV5OgAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFBQUGBUAAAAAAnk3UAAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFBcAAAAADXgWHxkZNkYWFEcUSB4ZNkYURxYUSB8zAAAAAAZ5AAAAAAI1NwAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFB86UBcUFAAAAAAMeQAAAAANeTpQFxQUUgAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFAAAAAAAAAAPQkAAAA9CQDIAAAAAAEcUAAAAAAM6RhQUFAAAAAAohxUXAAAAAAd5KQAAAAAAOkYAAAAACHkNRwAAAAAIeQAAAAABMgAAAAAIeEgUFAAAAAAEhxYAAAAAAocCAAAAAgAAFoYWAAAAAAKHAgAAAAIAABaGFgAAAAAFeToAAAAAADpGAAAAAAh5DUcAAAAACHkAAAAAATIAAAAACHhIFBQUFBgVAAAAAAJ5N1AAAAAAADpGAAAAAAh5DUcAAAAACHkAAAAAATIAAAAACHhIFBQXXgAAAAAGeTM2AAAAAAA6RgAAAAAIeQ1HAAAAAAh5AAAAAAEyAAAAAAh4SBQUFAAAAAAGeTUAAAAAATIeAAAAAAN5XjMfAAAAJxAAAAAABHkzRxQAAAAABDpGFBSDFIMWAAAAAAU6RhQURw1IgxYAAAAABXk6RhQURw1IgxQAAAAAIIcUAAAAAAGHFhQCAAAAAwAAABaGAAAAAAA6RgAAAAADeQAAAAAGeTIAAAAH0DIAAAAAAAAAACcQAAAAAAR5M0cAAAAABnkAAAAAAQAAACcQAAAAAAR5M0hHFEhISEhIAAAAJxA0AAAAAAR5AAAAJxAyNQs="));
	} else {
		console.log("that is an invalid direction");
		console.log(direction);
		return("invalid direction to bet");
	}

	console.log("market oid is ");
	console.log(oid);
	let g = a.concat(formatUtility.intToArray(bet_height, 4)).concat(a2).concat(formatUtility.intToArray(expires, 4))
	.concat(b).concat(formatUtility.intToArray(maxprice, 4)).concat(c).concat(formatUtility.stringToArray(atob(oid)))
	.concat(d).concat(formatUtility.intToArray(period, 4)).concat(e).concat(formatUtility.stringToArray(atob(server_pubkey)))
	.concat(f);
	console.log("compiled contract");
	console.log(JSON.stringify(g));
	let contract =  btoa(formatUtility.arrayToString(g));
	let codekey = ["market", 1, oid, expires, server_pubkey, period, oid]
	let amount2 = Math.floor(amount * ((10000 + maxprice) / 10000));
	return ["bet", contract, amount2, codekey, [-7, direction, maxprice]];
}

function scalarMarketContract(direction, expires, maxprice, server_pubkey, period, amount, oid, bet_height, lower_limit, upper_limit, many) {
	let a;
	if (direction == 1) {
		a = formatUtility.stringToArray(atob("AAAAJxAAAAAAAngA"));
	} else if (direction == 2) {
		a = formatUtility.stringToArray(atob("AAAAAAAAAAAAAngA"));
	}
	let b = formatUtility.stringToArray(atob("/wAAAAADeAA="));
	let c = formatUtility.stringToArray(atob("AAAAAAR4AA=="));
	let d = formatUtility.stringToArray(atob("AAAAAAV4AA=="));
	let e = formatUtility.stringToArray(atob("AAAAAAZ4AA=="));
	let f = formatUtility.stringToArray(atob("AAAAAAd4AgAAACA="));
	let g = formatUtility.stringToArray(atob("AAAAAAF4AA=="));
	let h = formatUtility.stringToArray(atob("AAAAAAh4AgAAAEE="));
	let i;
	if (direction == 1) {
		i = formatUtility.stringToArray(atob("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"));
	} else if (direction == 2) {
		i = formatUtility.stringToArray(atob("AAAAAAl4AAAABAAAAAAACnhuHoQ6RhQUiB8URxSDFiAegxYAAAAABTpGFBRHDUiDFgAAAAABeR8WAAAAAByHFzKGOkYUFEcNSIMUAAAAACCHFAAAAAABhxYUAgAAAAMAAAAWhhiCFh8AAAAAATJwcUhvboQ6RhQUAAAAAABHFIMWAAAAAAM6RhQUFAAAAAABRxQUcHFISG9uhDpGFBQAAAAAAEcUgxYAAAAAADpGFBQUAAAAAAFHFBRwcUhIb26EOkYUFIhHFIMWAAAAAAI6RhQUAAAAAABHFBQAAAAAAUgYghZwcUhvbhaEOkYUFEcUgxYYAAAAAAI0MnBxSG8AAAAAyAAAAAALeBYAAAAAADpGFBQAAAAACHkVXhY1AAAAAABHFAAAAAABOkYUFBYAAAAAKIcVFwAAAAAJeSkAAAAAADpGAAAAAAt5DUcAAAAAC3kAAAAAATIAAAAAC3hIFBQAAAAABIcWAAAAAAKHAgAAAAIAABaGFgAAAAAChwIAAAACAAAWhhYAAAAAAXk6AAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUFBQYFQAAAAAFeTdQAAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUFwAAAAAMeBUAAAAADXgVAAAAAAd5AAAAJxAWMzdQAAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUHgAAAAAOeIQWAAAAAAACAAAAIH5AO9lhryo2Wc24OQNskdc37jR3aLL3CstCbDiPm66DcRUCAAAAIAW6FSxPQ1iOzWgIaCXkY2ECBvWfNSU9U0+qrwvQYRVzcUYAAAAAAAAAAAADAAAAJxAAAAAAB3kzRxUCAAAAIHuEuzGB+Hpzi6rWPnL6PnFwTmtUwr58lD3/DkJHlSXDcUYAAAAAAQAAAAABAAAAJxAAAAAAB3kzR4QWAgAAACCey4CW1RmzkjFa15hAYQeljmLEzepUmvHAMP0r0K1I2HEAAAAAAAIAAAAgvFpjV195FHNHgGuwlT8v+cSyhmGIB3mAIeTZLxhC5mxxAAAAAAR5AAAABAA0AAAAAAp5NRk2RjNHFBQAAAAAAEgAAAAACnk0AAAAAAN5AAAAAAR5MzUAAAAnEDQAAAAD/zUAAAAnEBk2RhYURxRIAAAAJxAWMwAAAAACeRYzAAAAAAAWAAAAAAMWSEgYAAAAAAZ5Xhk2RjNHFBQAAAAAAEgAAAAABnkyNBcWAAAAAAZ5AAAAAA55GTZGM0cUFAAAAAAASDIWAAAAAA15AAAAJxAWMwAAAAAHeTpGFBQAAAAADHk0AAAAJxA1AAAAJxAAAAAAB3kzAAAAJxAAAAAADHkzNAAAACcQNTJHFjMySEcUAAAAAAI6RhQUFAAAAAAohxUXAAAAAAl5KQAAAAAAOkYAAAAAC3kNRwAAAAALeQAAAAABMgAAAAALeEgUFAAAAAAEhxYAAAAAAocCAAAAAgAAFoYWAAAAAAKHAgAAAAIAABaGFgAAAAABeToAAAAAADpGAAAAAAt5DUcAAAAAC3kAAAAAATIAAAAAC3hIFBQUFBgVAAAAAAV5N1AAAAAAADpGAAAAAAt5DUcAAAAAC3kAAAAAATIAAAAAC3hIFBQXAAAAAA94Hh4AAAAAKIcVFwAAAAAJeSkAAAAAADpGAAAAAAt5DUcAAAAAC3kAAAAAATIAAAAAC3hIFBQAAAAABIcWAAAAAAKHAgAAAAIAABaGFgAAAAAChwIAAAACAAAWhhYAAAAAAXk6AAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUFBQYFQAAAAAFeTdQAAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUFwAAAAAQeBYfGRk2RhYURxRIHhk2RhRHFhRIHzMAAAAACHkAAAAAAjU3AAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUHzpQFxQUAAAAAA95AAAAABB5OlAXFBRSAAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUAAAAAAAAAA9CQAAAD0JAMgAAAAAARxQAAAAAAzpGFBQUAAAAACiHFRcAAAAACXkpAAAAAAA6RgAAAAALeQ1HAAAAAAt5AAAAAAEyAAAAAAt4SBQUAAAAAASHFgAAAAAChwIAAAACAAAWhhYAAAAAAocCAAAAAgAAFoYWAAAAAAF5OgAAAAAAOkYAAAAAC3kNRwAAAAALeQAAAAABMgAAAAALeEgUFBQUGBUAAAAABXk3UAAAAAAAOkYAAAAAC3kNRwAAAAALeQAAAAABMgAAAAALeEgUFBdeAAAAAAh5MzYAAAAAADpGAAAAAAt5DUcAAAAAC3kAAAAAATIAAAAAC3hIFBQUAAAAAAh5NQAAAAABMh4AAAAABnleMx8AAAAnEAAAAAAHeTNHFAAAAAAEOkYUFIQWAAAAAAACAAAAIH5AO9lhryo2Wc24OQNskdc37jR3aLL3CstCbDiPm66DcQIAAAAge4S7MYH4enOLqtY+cvo+cXBOa1TCvnyUPf8OQkeVJcNxRgAAAAAGeQAAAAAIeTIAAAAH0DIAAAAAAAAAACcQAAAAAAd5M0cAAAAACHkAAAAAAQAAACcQAAAAAAd5M0hHFEhISEhIAAAAJxA0AAAAAAd5AAAAJxAyNQs="));
	}
	if (many != 10) {
		console.log("many must be 10");
		return "error";
	}
	console.log("market oid is ");
	console.log(oid);
	let contract = a.concat(
		formatUtility.intToArray(upper_limit, 4)).concat(
		b).concat(
		formatUtility.intToArray(lower_limit, 4)).concat(
		c).concat(
		formatUtility.intToArray(bet_height, 4)).concat(
		d).concat(
		formatUtility.intToArray(expires, 4)).concat(
		e).concat(
		formatUtility.intToArray(maxprice, 4)).concat(
		f).concat(
		formatUtility.stringToArray(atob(oid))).concat(
		g).concat(
		formatUtility.intToArray(period, 4)).concat(
		h).concat(
		formatUtility.stringToArray(atob(server_pubkey))).concat(i);
	console.log("compiled contract");
	console.log(JSON.stringify(contract));
	let contract2 =  btoa(formatUtility.arrayToString(contract));
	let codekey = ["market", 2, oid, expires, server_pubkey, period, oid, lower_limit, upper_limit];
	let amount2 = Math.floor(amount * ((10000 + maxprice) / 10000));
	return ["bet", contract, amount2, codekey, [-7, direction, maxprice]]; //codekey is insttructions on how to re-create the contract, so we can do pattern matching when updating channels.
}

function marketTrade(channel, amount, price, bet, oid) { //oid unused
	let market_spk = channel.me;
	console.log("market trade spk before ");
	console.log(JSON.stringify(market_spk));
	let cid = market_spk[6];
	let time_limit = 10000;//actually constants:time_limit div 10
	let space_limit = 100000;
	let cGran = 10000;
	let a = Math.floor((amount * price) / cGran);
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
	let hspk2 = JSON.stringify(sspk2[1]);
	let hspk = JSON.stringify(sspk[1]);
	if (hspk !== hspk2) {
		console.log("error, we calculated the spk differently from the server. you calculated this: ");
		console.log(JSON.stringify(sspk[1]));
		console.log("the server calculated this: ");
		console.log(JSON.stringify(sspk2[1]));
	}

	storage.getChannels(function(error, channels) {
		for (let i = 0; i < channels.length; i++) {
			let channel = channels[i];
			if (channel.serverPubKey === server_pubkey) {
				channel.me = sspk[1];
				channel.them = sspk2;
				let newss = newSs([0,0,0,0,4], [-6, ["oracles", oid_final]]);
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

	let index = parseInt(getParameterByName('index'));
	let amount = parseInt(getParameterByName('amount'));
	let price = parseFloat(getParameterByName('price'));
	let side = getParameterByName('side');

	document.getElementById("cancel-bet-side").innerHTML = capitalize(side);
	document.getElementById("cancel-bet-amount").innerHTML = amount;
	document.getElementById("cancel-bet-price").innerHTML = price;

	initButtons(function() {
		network.send(["pubkey"], function(error, pubkey) {
			cancelTrade(index + 2, pubkey);
		});
	}, function() {
		sendMessageAndClose({ type: notificationType, error: "Rejected by user"});
	});
}

function cancelTrade(n, server_pubkey) {
	storage.getChannels(function(error, channels) {
		let oldCD;
		for (let i = 0; i < channels.length; i++) {
			let channel = channels[i];
			if (channel.serverPubKey === server_pubkey) {
				oldCD = channel;
				break;
			}
		}

		if (oldCD) {
			let spk = oldCD.me;
			let ss = oldCD.ssme[n - 2];

			if (JSON.stringify(ss.code) === JSON.stringify([0,0,0,0,4])) {//this is what an unmatched trade looks like.
				let spk2 = removeBet(n-1, spk);
				spk2[8] += 1000000;
				passwordController.getPassword(function(password) {
					if (!password) {
						showCancelError("Your wallet is locked.  Please unlock your wallet and try again.")
					} else {
						storage.getAccounts(password, function (error, accounts) {
							let account = accounts[0];
							let keys = ec.keyFromPrivate(account.privateKey, "hex");
							let sspk2 = cryptoUtility.signTx(keys, spk2);
							let pubPoint = keys.getPublic("hex");
							let pubKey = btoa(formatUtility.fromHex(pubPoint));
							let msg = ["cancel_trade", pubKey, n, sspk2];
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
	let error = document.getElementById("cancel-error-text");
	error.classList.remove("invisible");
	error.innerHTML = message;
}

function removeBet(n, spk0) {
	let spk = JSON.parse(JSON.stringify(spk0));
	let bets = spk[3];
	let bet = bets[n];
	let bets2 = removeNth(n, bets);
	let bet_meta = bet[4];
	let a;
	if (bet_meta == 0) {
		a = 0;
	} else {
		let bet_amount = bet[2];
		let cgran = 10000;
		let price = bet_meta[2];
		a = Math.floor((bet_amount * price) / cgran);
	}
	spk[3] = bets2;
	spk[7] = spk[7] + a;
	return spk;
}

function cancelTradeResponse(sspk2, sspk, server_pubkey, n) {
	storage.getChannels(function(error, channels) {
		for (let i = 0; i < channels.length; i++) {
			let channel = channels[i];
			if (channel.serverPubKey === server_pubkey) {
				console.log("cancel trade2, fail to verify this: ");
				console.log(JSON.stringify(sspk2));
				let bool = verifyBoth(sspk2);
				if (!(bool)) {
					throw("cancel trade badly signed");
				}
				let spk = sspk[1];
				let spk2 = sspk2[1];
				if (JSON.stringify(spk) != JSON.stringify(spk2)) {
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
			sendMessageAndClose({ type: notificationType, message: "Trade cancelled"});
		})
	})
}

function removeNth(n, a) {
	let b = a.slice(0, n);
	let c = a.slice(n+1, a.length);
	return b.concat(c);
}

function showMaxBalance() {
	network.send(["pubkey"], function (error, serverPubkey) {
		storage.getTopHeader(function (error, topHeader) {
			if (topHeader !== 0) {
				passwordController.getPassword(function (password) {
					if (!password) {
						showBetError("Your wallet is locked.  Please unlock your wallet and try again.")
					} else {
						storage.getAccounts(password, function (error, accounts) {
							let account = accounts[0];
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
									let trie_key = channel.me[6];
									merkle.requestProof(topHeader, "channels", trie_key, function (error, val) {
										let spk = channel.them[1];
										let amount = spk[7];
										let betAmount = sumBets(spk[3]);
										let mybalance = ((val[4] - amount - betAmount)) / DECIMALS

										let userBalance = document.getElementById("bet-user-balance");
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
							let account = accounts[0];
							userController.getBalance(account, topHeader, function (error, balance) {
								let userBalance = document.getElementById("channel-user-balance");
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

function sendMessageAndClose(message) {
	chrome.extension.sendMessage(message);
	messageSent = true;
	notificationManager.closePopup();
}

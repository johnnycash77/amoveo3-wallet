module.exports = AmoveoInpageProvider;

const extId = "hfojlfflnlmfjhddgodpmophmhpimahi";

function AmoveoInpageProvider(connectionStream) {
    this.port = chrome.runtime.connect(extId);
}

AmoveoInpageProvider.prototype.subscribe = function(callback) {
	if (callback) {
		this.port.onMessage.addListener(function (data) {
			callback(data);
		});
	}
}

AmoveoInpageProvider.prototype.send = function (opts, callback) {
	this.port.postMessage(opts);
	if (callback) {
		this.port.onMessage.addListener(function (data) {
			if (data.type === opts.type) {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data);
				}
			}
		});
	}
}

AmoveoInpageProvider.prototype.sign = function (opts, callback) {
    this.port.postMessage(opts);
	if (callback) {
		this.port.onMessage.addListener(function (data) {
			if (data.type === "sign") {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data.signed.s);
				}
			}
		});
	}
}

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

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
	const port = this.port;
	port.postMessage(opts);
	if (callback) {
		function sendListener(data) {
			if (data.type === opts.type) {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data);
				}
				port.onMessage.removeListener(sendListener);
			}
		}
		port.onMessage.addListener(sendListener);
	}
}

AmoveoInpageProvider.prototype.sign = function (opts, callback) {
	const port = this.port;
	port.postMessage(opts);
	if (callback) {
		function signListener(data) {
			if (data.type === "sign") {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data.signed.s);
				}
				port.onMessage.removeListener(signListener);
			}
		}
		port.onMessage.addListener(signListener);
	}
}

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

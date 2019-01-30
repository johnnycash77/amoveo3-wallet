module.exports = AmoveoInpageProvider;

const extension = require('extensionizer')

const isFirefox = typeof InstallTrigger !== 'undefined';

// const extId = "3f01d4ba001fe1cbda4d720c5f7e9a612d5963d0";

const extId = "hfojlfflnlmfjhddgodpmophmhpimahi";
// const extId = "dihkmjjoakaiagmoflhachmoolamfimp";

function AmoveoInpageProvider(connectionStream) {
	// this.port = browser.runtime.connect(extId);
    this.port = extension.runtime.connect(extId);
    // this.port = browser.runtime.connect(extId);
}

AmoveoInpageProvider.prototype.subscribe = function(callback) {
	if (callback) {
		window.addEventListener("message", (event) => {
			alert(JSON.stringify(event));
		});

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

		window.addEventListener("message", sendListener);
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

		window.addEventListener("message", sendListener);
	}
}

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

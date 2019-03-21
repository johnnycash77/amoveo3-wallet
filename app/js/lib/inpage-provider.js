module.exports = AmoveoInpageProvider;

const extension = require('extensionizer')

// const extId = "hfojlfflnlmfjhddgodpmophmhpimahi";
const extId = "dihkmjjoakaiagmoflhachmoolamfimp";

function AmoveoInpageProvider() {
	if (extension.runtime) {
		this.port = extension.runtime.connect(extId);
	}
}

AmoveoInpageProvider.prototype.subscribe = function(callback) {
	if (callback) {
		if (this.port) {
			this.port.onMessage.addListener(function (data) {
				callback(data);
			});
		} else {
			window.addEventListener("message", (event) => {
				callback(event.data);
			});
		}
	}
}

AmoveoInpageProvider.prototype.send = function (opts, callback) {
	const port = this.port;
	if (port) {
		port.postMessage(opts);
	} else {
		window.postMessage({
			direction: "from-inpage-provider",
			message: opts
		}, "*");
	}

	if (callback) {
		function sendListener(data) {
			if (data.type === opts.type) {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data);
				}
				if (port) {
					port.onMessage.removeListener(sendListener);
				}
			}
		}

		if (port) {
			port.onMessage.addListener(sendListener);
		} else {
			function windowListener(event) {
				const data = event.data;
				if (data.type === opts.type) {
					if (data.error) {
						callback(data.error, null);
					} else {
						callback(null, data);
					}
					window.removeEventListener("message", windowListener);
				}
			}

			window.addEventListener("message", windowListener);
		}
	}
}

AmoveoInpageProvider.prototype.sign = function (opts, callback) {
	const port = this.port;
	if (port) {
		port.postMessage(opts);
	} else {
		window.postMessage({
			direction: "from-inpage-provider",
			message: opts
		}, "*");
	}

	if (callback) {
		function sendListener(data) {
			if (data.type === "sign") {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data);
				}
				if (port) {
					port.onMessage.removeListener(sendListener);
				}
			}
		}

		if (port) {
			port.onMessage.addListener(sendListener);
		} else {
			function windowListener(event) {
				const data = event.data;
				if (data.type === "sign") {
					if (data.error) {
						callback(data.error, null);
					} else {
						callback(null, data);
					}
					window.removeEventListener("message", windowListener);
				}
			}

			window.addEventListener("message", windowListener);
		}
	}
}

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

module.exports = AmoveoInpageProvider;

const extension = require('extensionizer')

const extId = "hfojlfflnlmfjhddgodpmophmhpimahi";
// const extId = "dihkmjjoakaiagmoflhachmoolamfimp";

function AmoveoInpageProvider(connectionStream) {
    this.port = extension.runtime.connect(extId);
}

AmoveoInpageProvider.prototype.subscribe = function(callback) {
	if (callback) {
		this.port.onMessage.addListener(function (data) {
			callback(data);
		});

		function sendListener(event) {
			alert("si señor");
			if (event.source == window &&
				event.data.direction &&
				event.data.direction == "from-content-script") {
				alert("Page script received message: \"" + event.data.message + "\"");
			}
		}
		window.addEventListener("message", sendListener);
	}
}

AmoveoInpageProvider.prototype.send = function (opts, callback) {
	const port = this.port;
	port.postMessage(opts);
	if (callback) {
		function sendListener(data) {
			alert("si señor");
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

		function sendListener(event) {
			alert("si señor");
			if (event.source == window &&
				event.data.direction &&
				event.data.direction == "from-content-script") {
				alert("Page script received message: \"" + event.data.message + "\"");
			}
		}
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
	}
}

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

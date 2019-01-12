module.exports = AmoveoInpageProvider;

const extId = "hfojlfflnlmfjhddgodpmophmhpimahi";

function AmoveoInpageProvider(connectionStream) {
    this.port = chrome.runtime.connect(extId);
}

AmoveoInpageProvider.prototype.subscribe = function(callback) {
    this.port.onMessage.addListener(function(data) {
        callback(data);
    });
}

AmoveoInpageProvider.prototype.send = function (opts) {
    this.port.postMessage(opts);
}

AmoveoInpageProvider.prototype.sign = function (opts, callback) {
    this.port.postMessage(opts);
	this.port.onMessage.addListener(function(data) {
	    if (data.type === "sign") {
		    callback(null, data);
	    }
	});
}

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

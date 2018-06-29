module.exports = AmoveoInpageProvider;

const extId = "dihkmjjoakaiagmoflhachmoolamfimp";
// const extId = "hfojlfflnlmfjhddgodpmophmhpimahi";

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

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

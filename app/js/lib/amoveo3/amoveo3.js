var Api = require('./api');

function Amoveo3(provider) {
    this.currentProvider = provider;
    this.api = new Api();
    this.channels = [];
}

Amoveo3.prototype.setProvider = function (provider) {
    this.currentProvider = provider;
};

Amoveo3.prototype.setCoinbase = function (coinbase) {
    this.coinbase = coinbase;
};

Amoveo3.prototype.setChannels = function (channels) {
    this.channels = channels;
};

Amoveo3.prototype.isConnected = function() {
    return (this.currentProvider);
};

Amoveo3.prototype.setLocked = function (locked) {
    this.isLocked = locked;
};

Amoveo3.prototype.isLocked = function() {
    return this.isLocked;
};

Amoveo3.prototype.getTopHeader = function(callback) {
    this.api.getHeaders(function(error, response) {
        return callback(error, response);
    });
};

module.exports = Amoveo3;
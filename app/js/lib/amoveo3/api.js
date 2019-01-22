
function Api(host, timeout, headers) {
    this.host = host || 'http://159.65.120.84:8080';
    this.timeout = timeout || 1;
    this.network = "";
    this.headers = headers || {};
}

Api.prototype.getHeaders = function getHeaders(callback) {
    var header = 0;
    return callback(undefined, header);
}

module.exports = Api;

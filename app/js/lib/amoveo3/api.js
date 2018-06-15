var headers_db = {};
var top_header;
var top_height = 0;

function Api(host, timeout, headers) {
    this.host = host || 'http://159.65.120.84:8080';
    this.timeout = timeout || 0;
    this.headers = headers || {};
}

Api.prototype.getHeaders = function getHeaders(callback) {
    var header = 0;
    return callback(undefined, header);
}

module.exports = Api;
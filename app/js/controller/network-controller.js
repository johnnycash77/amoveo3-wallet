var network = require('../lib/network.js');
var storage = require('../lib/storage.js');

var retries = 0;

function getUrl(callback) {
    storage.get({connectionInfo: {url: "168.62.52.179", port: 8080}}, function(result) {
        callback(null, url(result.connectionInfo.url, result.connectionInfo.port));
    });
}

function url(ip, port) {
    return "http://".concat(ip).concat(":").concat(port.toString().concat("/"));
}

function send(data, callback) {
    getUrl(function(error, url) {
        network.post(url, {}, JSON.stringify(data), function(error, result) {
            if (error) {
                retries = 0;
                callback(error, result);
            } else {
                try {
                    var response = JSON.parse(result)[1];
                    if (response === "c3RvcCBzcGFtbWluZyB0aGUgc2VydmVy" && retries < 3) {
                        retries++;
                        setTimeout(send(data, callback), 500);
                    } else {
                        retries = 0;
                        callback(error, response);
                    }
                } catch(e) {
                    console.info(e);
                    retries = 0;
                    callback(error, result);
                }
            }
        });
    })
}


exports.send = send;
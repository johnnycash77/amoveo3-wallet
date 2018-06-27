var network = require('../lib/network.js');
var storage = require('../lib/storage.js');


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
                callback(error, result);
            } else {
                try {
                    var response = JSON.parse(result)[1];
                    if (response === "c3RvcCBzcGFtbWluZyB0aGUgc2VydmVy") {
                        setTimeout(send(data, callback), 500);
                    } else {
                        callback(error, response);
                    }
                } catch(e) {
                    console.info(e);
                    callback(error, result);
                }
            }
        });
    })
}


exports.send = send;
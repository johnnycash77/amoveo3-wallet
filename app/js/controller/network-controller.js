const network = require('../lib/network.js');
const config = require('../config');

function getUrl() {
	return config.defaultNodeUrl.concat(":").concat(config.defaultNodePort).concat("/");
}

function send(data, callback) {
	retry(data, callback, 3);
}

function retry(data, callback, attempts) {
	if (attempts === 0) {
		callback(new Error("Server overloaded"), null);
	} else {
		var url = getUrl();
		network.post(url, {}, JSON.stringify(data), function (error, result) {
			try {
				var response = JSON.parse(result)[1];
				if (response === "c3RvcCBzcGFtbWluZyB0aGUgc2VydmVy") {
					setTimeout(retry(data, callback, attempts - 1), 500);
				} else {
					callback(error, response);
				}
			} catch (e) {
				console.info(e);
				callback(error, result);
			}
		});
	}
}

exports.send = send;
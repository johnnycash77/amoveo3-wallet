const storage = require('../lib/storage.js');
const config = require('../config');

function send(data, callback) {
	storage.getSelectedNetwork(function(error, selectedNetwork) {
		const url = config[selectedNetwork].defaultNodeUrl;
		fetch(url,
			{
				method: 'POST',
				body: JSON.stringify(data)
			}
		)
		.then(function(response) {
			return response.json();
		})
		.then(function(json) {
			callback(null, json[1]);
		})
		.catch(err => {
			callback(err, null);
		});
	});
}

exports.send = send;
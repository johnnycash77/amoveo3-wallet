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
		.then(handleErrors)
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

function handleErrors(response) {
	if (!response.ok) {
		throw Error(response.statusText);
	}
	return response;
}

exports.send = send;
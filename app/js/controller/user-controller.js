var merkle = require('../lib/merkle-proofs.js');

function getBalance(account, header, callback) {
    try {
        merkle.requestProof(header, "accounts", account.publicKey, function(error, result) {
            if (error) {
                callback(error, 0);
            } else {
                var value = result[1] / 100000000;
                // var balance = value.toFixed(5);
                callback(error, value);
            }
        });
    } catch(e) {
        console.error(e);
        callback(e, 0);
    }
}

exports.getBalance = getBalance;
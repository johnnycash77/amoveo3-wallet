const extension = require('extensionizer')

function getPassword(callback) {
	extension.runtime.onMessage.addListener(
        function listener(request, sender, sendResponse) {
            if (request.type === "getPassword") {
	            extension.runtime.onMessage.removeListener(listener);
                callback(request.data);
            }
        }
    );
	extension.runtime.sendMessage({ type: "getPassword" });
}

function unlock(password, callback) {
	extension.runtime.sendMessage({ type: "password", data: password });
    callback();
}

function setState(state, callback) {
	extension.runtime.onMessage.addListener(
        function listener(request, sender, sendResponse) {
            if (request.type === "setState") {
	            extension.runtime.onMessage.removeListener(listener);
                callback(request.data);
            }
        }
    );
	extension.runtime.sendMessage({ type: "setState", data: state });
}

exports.unlock = unlock;
exports.getPassword = getPassword;
exports.setState = setState;
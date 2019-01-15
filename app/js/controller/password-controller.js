function getPassword(callback) {
    chrome.extension.onMessage.addListener(
        function listener(request, sender, sendResponse) {
            if (request.type === "getPassword") {
                chrome.runtime.onMessage.removeListener(listener);
                callback(request.data);
            }
        }
    );
    chrome.extension.sendMessage({ type: "getPassword" });
}

function unlock(password, callback) {
    chrome.extension.sendMessage({ type: "password", data: password });
    callback();
}

function setState(state, callback) {
    chrome.extension.onMessage.addListener(
        function listener(request, sender, sendResponse) {
            if (request.type === "setState") {
                chrome.runtime.onMessage.removeListener(listener);
                callback(request.data);
            }
        }
    );
    chrome.extension.sendMessage({ type: "setState", data: state });
}

exports.unlock = unlock;
exports.getPassword = getPassword;
exports.setState = setState;
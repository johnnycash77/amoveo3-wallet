function getPassword(callback) {
    chrome.extension.onMessage.addListener(
        function listener(request, sender, sendResponse) {
            if (request.msg === "getPassword") {
                chrome.runtime.onMessage.removeListener(listener);
                callback(request.data);
            }
        }
    );
    chrome.extension.sendMessage({ msg: "getPassword" });
}

function unlock(password, callback) {
    chrome.extension.sendMessage({ msg: "password", data: password });
    callback();
}

function setState(state, callback) {
    chrome.extension.onMessage.addListener(
        function listener(request, sender, sendResponse) {
            if (request.msg === "setState") {
                chrome.runtime.onMessage.removeListener(listener);
                callback(request.data);
            }
        }
    );
    chrome.extension.sendMessage({ msg: "setState", data: state });
}

exports.unlock = unlock;
exports.getPassword = getPassword;
exports.setState = setState;
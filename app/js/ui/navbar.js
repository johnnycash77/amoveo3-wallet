
function initNavbar(account) {
    addListeners(account);
}

function addListeners(account) {
    var settingsButton = document.getElementById("settings-button");
    settingsButton.onclick = function(e) {
        initSettingsContainer();
    };

    var refreshButton = document.getElementById("refresh-button");
    refreshButton.onclick = function(e) {
        startRefreshing();
        refresh(account, stopRefreshing);
    };
}

function setTitle(title) {
    document.getElementById("title").innerHTML = title
}

exports.init = initNavbar;
exports.setTitle = setTitle;
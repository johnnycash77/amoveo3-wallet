const views = require('../lib/views.js');

function initAlert(message, confirmCallback, cancelCallback) {
    views.find(views.ids.alert.message).innerHTML = message;

    views.find(views.ids.alert.confirm).onclick = function() {
        hideSelf();
        if (confirmCallback) {
            confirmCallback();
        }
    }

    views.find(views.ids.alert.cancel).onclick = function () {
        hideSelf();
        if (cancelCallback) {
            cancelCallback();
        }
    }

    showSelf();
}

function getSelf() {
    return views.ids.alertContainer;
}

function hideSelf() {
    views.hide(getSelf());
}

function showSelf() {
    views.show(getSelf());
}

exports.init = initAlert;
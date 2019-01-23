const views = require('../lib/views.js');
const storage = require('../lib/storage.js');
const setPasswordController = require('../ui/set-password.js');
const alertController = require('../ui/alert.js');
const passwordController = require('../controller/password-controller.js');
const Main = require('../ui/popup.js');

function initLocked() {
    views.hide(views.ids.accountContainer);
    views.show(views.ids.lockedContainer);

    views.hideNavbarButtons();

    views.setText(views.ids.title, "Unlock Account");

    addListeners();
}

function addListeners() {
    views.find(views.ids.locked.button).onclick = function() {
        onButtonClick();
    };

    views.find(views.ids.locked.restore).onclick = function () {
        alertController.init("By continuing, your account data will be erased and a new password will be added.  This cannot be undone.", function() {

            storage.setPasswordBeenSet(false, function() {
                views.hide(views.ids.lockedContainer);
                setPasswordController.init();
            });
        }, function() {

        })
    }

    views.find(views.ids.locked.password).addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            onButtonClick()
        }
    });
}

function onButtonClick() {
    var password = views.find(views.ids.locked.password).value;
    if (password.length < 6) {
        views.show(views.ids.locked.error)
    } else {
        storage.getAccounts(password, function(error, accounts) {
            if (error) {
                views.show(views.ids.locked.error);
            } else {
                passwordController.unlock(password, function() {
                    views.hide(views.ids.lockedContainer);
                    if (Array.isArray(accounts) && accounts.length > 0) {
                        Main.setSelectedAccount(accounts[0]);
                    }
                    Main.init(password);
                })
            }
        })
    }
}

exports.init = initLocked;
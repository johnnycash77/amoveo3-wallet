const views = require('../lib/views.js');
const storage = require('../lib/storage.js');
const welcomeController = require('../ui/welcome.js');
const Main = require('../ui/popup.js');
const passwordController = require('../controller/password-controller.js');

function init() {
    views.hide(views.ids.accountContainer);
    views.show(views.ids.newPasswordContainer);

    views.hideNavbarButtons();

    views.setText(views.ids.title, "Set Password");

    addListeners();
}

function addListeners() {
    views.find(views.ids.password.button).onclick = function() {
        onButtonClick();
    }

    views.find(views.ids.password.enter2).addEventListener("keyup", function(event) {
        event.preventDefault();
        if (event.keyCode === 13) {
            onButtonClick();
        }
    });
}

function onButtonClick() {
    var password = views.find(views.ids.password.enter).value;
    var password2 = views.find(views.ids.password.enter2).value;
    if (password !== password2) {
        views.find(views.ids.password.error).innerHTML = "Passwords do not match";
        views.show(views.ids.password.error)
    } else if (password.length < 6) {
        views.find(views.ids.password.error).innerHTML = "Password must be at least 6 characters";
        views.show(views.ids.password.error)
    } else {
        storage.getAccounts(password, function(error, encrypted) {
            if (error) {
                views.show(views.ids.locked.error);
            } else {
                passwordController.unlock(password, function() {
                    storage.setPasswordBeenSet(true, function() {
                        views.hide(views.ids.newPasswordContainer);
                        welcomeController.init(password, function() {
                            Main.createNewAccount(function(account) {
                                storage.setAccounts(password, [account], function() {
                                    views.hide(views.ids.welcomeContainer);
                                    Main.setSelectedAccount(account);
                                    Main.init(password);
                                });
                            });
                        });
                    });
                });
            }
        })

    }
}

exports.init = init;
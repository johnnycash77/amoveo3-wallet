const config = require('../config.js');
const views = require('../lib/views.js');
const elliptic = require('../lib/elliptic.min.js');
const storage = require('../lib/storage.js');
const formatUtility = require('../lib/format-utility.js');
const Main = require('./popup.js');
const accountController = require('./account.js');

var ec = new elliptic.ec('secp256k1');

function initWelcomePage(password, createAccountCallback) {
    views.hide(views.ids.accountContainer);
    views.show(views.ids.welcomeContainer);

    hideNavbarButtons();

    views.setText(views.ids.title, config.appTitle);

    initWelcomeImportAccount(password);

    initWelcomeCreateAccount(createAccountCallback);
}

function hideNavbarButtons() {
    views.hide(views.ids.settingsContainer);
    views.hide(views.ids.refreshContainer);
}

function initWelcomeCreateAccount(callback) {
    var createAccount = document.getElementById(views.ids.welcome.createAccount);
    createAccount.onclick = function(e) {
        callback();
    }
}

function initWelcomeImportAccount(password) {
    var importFile = document.getElementById(views.ids.welcome.importAccount);
    var importButton = document.getElementById(views.ids.welcome.importAccountButton);
	importButton.onclick = function () {
		const isFirefox = typeof InstallTrigger !== 'undefined';
		if (isFirefox) {
			showFirefoxImport(password);
		} else {
			importFile.click();
		}
	};

    importFile.onchange = function() {
        var file = (importFile.files)[0];
        var reader = new FileReader();
        reader.onload = function(e) {
	        var contents = reader.result.replace(/^\s+|\s+$/g, '');
	        importPrivateKey(password, contents);
        };

        if (file.type !== "text/plain" || !(file.size === 64 || file.size === 65)) {
            console.log("Invalid account data");
            showWelcomeError("Invalid file format");
        } else {
            reader.readAsText(file);
        }
    }
}

function showFirefoxImport(password) {
	views.hide(views.ids.welcomeContainer);
	views.show(views.ids.firefoxWelcomeImportContainer);

	var button = views.find(views.ids.firefoxWelcomeImport.button);

	button.onclick = function() {
		var privateKey = views.find(views.ids.firefoxWelcomeImport.import).value;

		if (!(privateKey.length === 64 || privateKey.length === 65)) {
			console.log("Invalid account data");
			showFirefoxImportError("Invalid key (should be 64 characters long");
		} else {
			importPrivateKey(password, privateKey)
		}
	}
}

function showFirefoxImportError(message) {
	var error = views.find(views.ids.firefoxWelcomeImport.error);
	error.innerHTML = message;
	views.show(views.ids.firefoxWelcomeImport.error);
}

function importPrivateKey(password, privateKey) {
	var keys = ec.keyFromPrivate(privateKey, "hex");
	var pubPoint = keys.getPublic("hex");
	var pubKey = btoa(formatUtility.fromHex(pubPoint));
	var privKey = keys.getPrivate("hex");

	var account = {
		publicKey: pubKey,
		privateKey: privKey
	};

	storage.setAccounts(password, [account], function() {
		console.log("Account imported");

		views.hide((views.ids.welcomeContainer));
		views.hide((views.ids.firefoxWelcomeImportContainer));

		Main.setSelectedAccount(account);

		Main.init(password);
	});
}

function showWelcomeError(message) {
    var error = views.find(views.ids.welcome.importAccountError);
    error.innerHTML = message;
    views.visible(views.ids.welcome.importAccountError);
}

exports.init = initWelcomePage;

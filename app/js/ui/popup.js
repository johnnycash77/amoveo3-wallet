const extension = require('extensionizer')
const fs = require('fs')
const path = require('path')
const makeTemplate = require('../lib/template.js')

const initTransactionsTab = require('./transactions.js');
const initChannelsTab = require('./channels.js');
const initMarketsTab = require('./markets.js');
const welcomeController = require('./welcome.js');
const accountController = require('./account.js');
const spendController = require('./send.js');
const lockedController = require('./locked.js');
const setPasswordController = require('./set-password.js');
const views = require('../lib/views.js');
const passwordController = require('../controller/password-controller.js');
const formatUtility = require('../lib/format-utility.js');
const userController = require('../controller/user-controller.js');
const storage = require('../lib/storage.js');
const elliptic = require('../lib/elliptic.min.js');

function init(password) {
    if (!password) {
        passwordController.getPassword(function(password) {
            if (password) {
                initUnlocked(password);
            } else {
                storage.hasPasswordBeenSet(function (error, beenSet) {
                    if (beenSet) {
                        lockedController.init();
                    } else {
                        setPasswordController.init();
                    }
                });
            }
        });
    } else {
        initUnlocked(password);
    }

    setVersion();
}

function initSwitchNetwork(account) {
	views.show(views.ids.settings.switchNetwork);
	const switchNetworks = views.find(views.ids.settings.switchNetwork);
	storage.getSelectedNetwork(function(error, selectedNetwork) {
		if (selectedNetwork === "mainnet") {
			switchNetworks.options[0].selected = 'selected';
		} else {
			switchNetworks.options[1].selected = 'selected';
		}
	});

	switchNetworks.onchange = function(e) {
		const switchNetworks = views.find(views.ids.settings.switchNetwork);
		const newNetwork = switchNetworks.selectedIndex === 0 ? "mainnet" : "testnet";
		storage.setSelectedNetwork(newNetwork, function() {
			views.setText(views.ids.latestBlock, "Latest Block: 0");
			extension.runtime.sendMessage({ type: "resync"});

			setSelectedAccount(account);
		});
	}
}

function initUnlocked(password) {
    storage.getAccounts(password, function(error, accounts) {
        if (accounts.length > 0) {
            var account = accounts[0];
            accountController.init(account);

            initTabsContainer(account);

            initAccountSwitchButton(password);

            initAddAccountButton(password);

            initImportAccount(password, accounts);

	        initSwitchNetwork(account);
        } else {
            welcomeController.init(password, function() {
                createNewAccount(function(account) {
                    storage.setAccounts(password, [account], function() {
                        views.hide(views.ids.welcomeContainer);

                        accountController.init(account);
                        setSelectedAccount(account);
	                    initUnlocked(password);
                    });
                });
            });
        }
    });
}

function initAddAccountButton(password) {
    var addAccountButton = views.find(views.ids.settings.addAccount);
    addAccountButton.onclick = function(e) {
        createNewAccount(function(account) {
            storage.getAccounts(password, function(error, accounts) {
                accounts.unshift(account);
                storage.setAccounts(password, accounts, function() {
                    accountController.init(account);
                    setSelectedAccount(account);
	                initUnlocked(password);
                });
            });
        });
    }
}

function initAccountSwitchButton(password) {
    var switchButton = views.find(views.ids.settings.accountSwitch.button);
    switchButton.onclick = function(e) {
        initAccountSwitch(password);
    }
}

function setSelectedAccount(account) {
	storage.getTopHeader(function(error, topHeader) {
		storage.getSelectedNetwork(function(error, network) {
			storage.getUserChannels(account.publicKey, function(error, channels) {
				passwordController.setState({
					selectedAddress: account.publicKey,
					channels: channels,
					isLocked: false,
					network: network,
					topHeader: topHeader,
				})
			})
		})
	})
}

function initTabsContainer(account) {
    initSendTemplate(account);

    var tabs = document.getElementsByClassName('tab');
    for(var i = 0; i < tabs.length; i++) {
        var tab = tabs[i];
        tab.onclick = function() {
            for(var j = 0; j < tabs.length; j++) {
                var tab = tabs[j];
                tab.classList.remove("active");
            }
            this.classList.add("active");

            var target = this.getAttribute('data-target');
            if (target === "send") {
                initSendTemplate(account);
            } else if (target === "channels") {
                initChannelsTemplate(account);
            } else if (target === "markets") {
                initMarketsTemplate();
            } else if (target === "transactions") {
                initTransactionsTemplate(account);
            }
        }
    }
}

function initSendTemplate(account) {
    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'send.ejs'), 'utf8').toString();
    makeTemplate(template, "tab-content-container", {});

    spendController.init(account);
}

function initChannelsTemplate(account) {
    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'channels.ejs'), 'utf8').toString();
    makeTemplate(template, "tab-content-container", {});

    initChannelsTab(account);
}

function initMarketsTemplate() {
    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'markets.ejs'), 'utf8').toString()
    makeTemplate(template, "tab-content-container", {});

    initMarketsTab();
}

function initTransactionsTemplate(account) {
    const template = fs.readFileSync(path.join(__dirname, '..', '..', 'templates', 'transactions.ejs'), 'utf8').toString()
    makeTemplate(template, "tab-content-container", {});

    initTransactionsTab(account);
}

function createNewAccount(callback) {
    var ec = new elliptic.ec('secp256k1');
    var keys = ec.genKeyPair();
    var pubPoint = keys.getPublic("hex");
    var pubKey = btoa(formatUtility.fromHex(pubPoint));
    var privKey = keys.getPrivate("hex");
    var account = {publicKey: pubKey, privateKey: privKey};

    return callback(account);
}

function initAccountSwitch(password) {
    views.hide(views.ids.settingsContainer);
    views.show(views.ids.accountSwitchContainer);

    var rows = views.find(views.ids.settings.accountSwitch.rows);
    views.removeAllChildren(views.ids.settings.accountSwitch.rows);
    storage.getAccounts(password, function(error, accounts) {
        if (accounts.length > 0) {
            for (var i = 0; i < accounts.length; i++) {
                var account = accounts[i];
                makeRow(password, account, i, function(row) {
                    rows.appendChild(row);
                });
            }
        } else {
            console.error("No account found");
        }
    });
}

function makeRow(password, account, index, callback) {
    storage.getTopHeader(function(error, header) {
        return userController.getBalance(account, header, function(error, result) {
            var row = document.createElement('div');
            row.className = 'account-switcher-row'
            var topWrapper = document.createElement('div');
            var bottomWrapper = document.createElement('div');
            var address = document.createElement('p');
            topWrapper.className = 'account-switcher-address'
            address.className = 'address'
            address.innerHTML = account.publicKey;
            address.title = account.publicKey;
            var balance = document.createElement('p');
            bottomWrapper.className = 'account-switcher-balance'

            balance.innerHTML = result + " VEO";
            topWrapper.appendChild(address);
            bottomWrapper.appendChild(balance);
            row.appendChild(topWrapper);
            row.appendChild(bottomWrapper);
            row.setAttribute("data-index", index);
            row.onclick = function(e) {
                var index = this.getAttribute("data-index");
                if (index === "0") {
                    accountController.init(account);
                } else {
                    storage.getAccounts(password, function(error, accounts) {
                        for (var i = 0; i < accounts.length; i++) {
                            var thisAccount = accounts[i];
                            if (account.publicKey === thisAccount.publicKey) {
                                accounts = moveToFront(accounts, i, 0);
                                storage.setAccounts(password, accounts, function() {
                                    accountController.init(account);
                                    setSelectedAccount(account);
	                                initUnlocked(password);
                                });
                            }
                        }
                    });
                }
            };

            return callback(row);
        });
    })
};

function moveToFront(arr, fromIndex, toIndex) {
    var element = arr[fromIndex];
    arr.splice(fromIndex, 1);
    arr.splice(toIndex, 0, element);
    return arr;
}

function initImportAccount(password, accounts) {
    var importFile = views.find(views.ids.settings.import);
    var importButton = views.find(views.ids.settings.importButton);
    importButton.onclick = function () {
	    const isFirefox = typeof InstallTrigger !== 'undefined';
	    if (isFirefox) {
		    showFirefoxImport(password, accounts);
	    } else {
		    importFile.click();
        }
    };

    importFile.onchange = function () {
        var file = (importFile.files)[0];
        var reader = new FileReader();
        reader.onload = function (e) {
            var contents = reader.result.replace(/^\s+|\s+$/g, '');

	        importPrivateKey(password, accounts, contents)
        };

        if (file.type !== "text/plain" || !(file.size === 64 || file.size === 65)) {
            console.log("Invalid account data");
            showImportError("Invalid file format");
        } else {
            reader.readAsText(file);
        }
    }
}

function importPrivateKey(password, accounts, privateKey) {
	var ec = new elliptic.ec('secp256k1');
	var keys = ec.keyFromPrivate(privateKey, "hex");
	var pubPoint = keys.getPublic("hex");
	var pubKey = btoa(formatUtility.fromHex(pubPoint));
	var privKey = keys.getPrivate("hex");

	var account = {
		publicKey: pubKey,
		privateKey: privKey
	};

	var isDuplicate = false;
	for (var i = 0; i < accounts.length; i++) {
		if (accounts[i].publicKey === account.publicKey) {
			isDuplicate = true;
			break;
		}
	}
	if (isDuplicate) {
		console.log("Duplicate account");
		showImportError("This account has already been imported");
	} else {
		accounts.unshift(account);
		storage.setAccounts(password, accounts, function () {
			console.log("Account imported");
			accountController.init(account);
			setSelectedAccount(account);
			initUnlocked(password);
		});
	}
}

function showFirefoxImport(password, accounts) {
	views.hide(views.ids.settingsContainer);
	views.show(views.ids.firefoxImportContainer);

	var button = views.find(views.ids.firefoxImport.button);

	button.onclick = function() {
		var privateKey = views.find(views.ids.firefoxImport.import).value;

		if (!(privateKey.length === 64 || privateKey.length === 65)) {
			console.log("Invalid account data");
			showFirefoxImportError("Invalid key (should be 64 characters long");
		} else {
			importPrivateKey(password, accounts, privateKey)
        }
    }
}

function showFirefoxImportError(message) {
    var error = views.find(views.ids.firefoxImport.error);
    error.innerHTML = message;
    views.show(views.ids.firefoxImport.error);
}

function showImportError(message) {
    var error = views.find(views.ids.settings.importError);
    error.innerHTML = message;
    views.show(views.ids.settings.importError);
}

function setVersion() {
	var manifestData = extension.runtime.getManifest();
	document.getElementById("version").innerHTML = manifestData.version;
}

init();

exports.init = init;
exports.createNewAccount = createNewAccount;
exports.setSelectedAccount = setSelectedAccount;
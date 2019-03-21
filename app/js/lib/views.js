function find(id) {
    return document.getElementById(id);
}

function hide(id) {
    document.getElementById(id).classList.add("hidden");
}

function show(id) {
    document.getElementById(id).classList.remove("hidden");
}

function invisible(id) {
    document.getElementById(id).classList.add("invisible");
}

function visible(id) {
    document.getElementById(id).classList.remove("invisible");
}

function setText(id, text) {
    document.getElementById(id).innerHTML = text;
}

function setValue(id, value) {
    document.getElementById(id).value = value;
}

function removeAllChildren(id) {
    var view = find(id);
    while (view.firstChild) {
        view.removeChild(view.firstChild);
    }
}

function hideBackButton() {
	hide(ids.navbar.backButton);
}

function showBackButton() {
	show(ids.navbar.backButton);
}

function hideNavbarButtons() {
    hide(ids.navbar.settingsButton);
    hide(ids.navbar.refreshButton);
}

var ids = {
    title: "title",
    accountContainer: "account-container",
    welcomeContainer: "welcome-container",
    settingsContainer: "settings-container",
    firefoxImportContainer: "firefox-import-container",
	firefoxChannelImportContainer: "firefox-import-channel-container",
	firefoxWelcomeImportContainer: "firefox-welcome-import-container",
    refreshContainer: "refresh-button",
    accountSwitchContainer: "account-switch-container",
    alertContainer: "alert-container",
    lockedContainer: "locked-container",
    newPasswordContainer: "password-container",
    latestBlock: "latest-block-container",
    account: {
        address: "account-address",
        balance: "account-balance",
        icon: "account-icon",
        blockNumber: "block-number",
    },
    navbar: {
        refreshButton: "refresh-button",
        settingsButton: "settings-button",
        backButton: "back-button",
    },
    welcome: {
        createAccount: "welcome-create-account-button",
        importAccount: "welcome-import-account",
        importAccountButton: "welcome-import-account-button",
        importAccountError: "welcome-import-error-text",
    },
    settings: {
        addAccount: "add-account-button",
        accountSwitch: {
            button: "account-switch-button",
            rows: "account-switch-rows",
        },
        import: "import-account",
        importButton: "import-account-button",
        importError: "import-error-text",
        exportButton: "export-button",
        resyncButton: "resync-button",
        exportError: "export-error-text",
        connect: {
            url: "node-url",
            port: "node-port",
            current: "node-current",
            button: "node-connect",
            error: "node-error",
        },
	    switchNetwork: "network-switch"
    },
    firefoxChannelImport: {
	    import: "firefox-channel-import",
	    error: "firefox-channel-import-error",
	    button: "firefox-channel-import-button",
    },
    firefoxImport: {
	    import: "firefox-import",
	    error: "firefox-import-error",
	    button: "firefox-import-button",
    },
    firefoxWelcomeImport: {
	    import: "firefox-welcome-import",
	    error: "firefox-welcome-import-error",
	    button: "firefox-welcome-import-button",
    },
    send: {
        max: "send-max-amount",
        amount: "send-amount",
        fee: "tx-fee",
        txFeeEdit: "tx-fee-edit",
        txFeeButton: "tx-fee-edit-button",
        defaultFeeContainer: "tx-fee-default",
        txFeeDefault: "default-fee",
        address: "send-address",
        button: "send-button",
        error: "send-message",
    },
    channels: {
        list: "channels-list",
        blank: "channel-blank",
        import: "import-channel",
        importButton: "import-channel-button",
        importError: "import-channel-error-text",
    },
    txs: {
        veoscan: "account-veoscan-link",
        pendingContainer: "pending-transactions-container"
    },
    notification: {
        title: "notification-title",
        channelContainer: "new-channel-container",
        betContainer: "make-bet-container",
        bet: {
            amount: 'bet-amount',
            price: 'bet-price',
            error: 'bet-error-text',
            cancel: 'cancel-bet-button',
        },
        channel: {
            ip: "channel-ip-address",
            amount: "new-channel-amount",
            delay: "new-channel-delay",
            length: "new-channel-length",
            create: "create-channel-button",
            cancel: "cancel-channel-button",
            advanced: "channel-advanced-button",
            advancedContainer: "channel-advanced-container",
            error: "new-channel-error-text",
            fees: {
                totalRate: "total-rate",
                blockNumber: "fee-block-number",
                amount: "fee-amount-number",
                total: "total-fee",
                total2: "total-fee2",
            }
        }
    },
    locked: {
        button: "locked-button",
        password: "locked-password",
        restore: "locked-restore",
        error: "locked-error-text"
    },
    password: {
        enter: "enter-password",
        enter2: "enter-password2",
        button: "password-button",
        error: "password-error",
    },
    alert: {
        message: "alert-message",
        confirm: "alert-confirm",
        cancel: "alert-cancel",
    }
};

exports.ids = ids;
exports.find = find;
exports.hide = hide;
exports.show = show;
exports.invisible = invisible;
exports.visible = visible;
exports.setText = setText;
exports.setValue = setValue;
exports.removeAllChildren = removeAllChildren;
exports.hideNavbarButtons = hideNavbarButtons;
exports.hideBackButton = hideBackButton;
exports.showBackButton = showBackButton;
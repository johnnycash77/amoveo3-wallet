const EventEmitter = require('events')
const pump = require('pump')
const ObservableStore = require('obs-store')
const asStream = require('obs-store/lib/asStream')
const setupMultiplex = require('../lib/stream-utils.js').setupMultiplex
const storage = require('../lib/storage.js')
const ObjectMultiplex = require('obj-multiplex')
const LocalMessageDuplexStream = require('post-message-stream')
const NotificationManager = require('../lib/notification-manager.js')
var notificationManager = new NotificationManager();

module.exports = class AmoveoController extends EventEmitter {

    constructor(opts) {
        super();

        this.subscribedToChannels = false;
        this.subscribedToInPage = false;
        this.defaultMaxListeners = 20;
        this.publicConfigStore = new ObservableStore();
        this.channelStore = new ObservableStore();
        this.inPageStore = new ObservableStore();
        this.provider = this.initializeProvider();
    }

    setupTrustedCommunication(connectionStream) {
        const mux = new ObjectMultiplex()
        pump(
            connectionStream,
            mux,
            connectionStream,
            (err) => logStreamDisconnectWarning('Amoveo3 - popup', err)
        )

        pump(
            mux.createStream('channelStore'),
            asStream(this.channelStore),
            (err) => logStreamDisconnectWarning('Amoveo Channels', err)
        )

        if (!this.subscribedToChannels) {
            var store = this.publicConfigStore;
            this.channelStore.subscribe(function (state) {
                store.putState({
                    selectedAddress: state.selectedAddress,
                    channels: state.channels
                })
            });

            this.subscribedToChannels = true;
        }
    }

    setupUntrustedCommunication(password, connectionStream, originDomain) {
        const mux = setupMultiplex(connectionStream)

        this.setupStoreStream(this.publicConfigStore, mux.createStream('publicConfigStore'))

        var store = this.publicConfigStore;
        storage.getAccounts(password, function (error, accounts) {
            if (error) {
                store.putState({
                    selectedAddress: "",
                    channels: [],
                    isLocked: true,
                    test: "1"
                })
            } else {
                if (accounts.length > 0) {
                    storage.getChannels(function (error, channels) {
                        store.putState({
                            selectedAddress: accounts[0].publicKey,
                            channels: channels,
                            isLocked: false
                        })
                    })
                }
            }
        });

        this.initPopupStream();

        pump(
            mux.createStream('inPageStore'),
            asStream(this.inPageStore),
            (err) => logStreamDisconnectWarning('Amoveo InPageStore', err)
        )

        if (!this.subscribedToInPage) {
            this.inPageStore.subscribe(function (state) {
                if (state.opts) {
                    notificationManager.showPopup(state.opts);
                }
            })

            this.subscribedToInPage = true;
        }
    }

    initPopupStream() {
        var popupStream = new LocalMessageDuplexStream({
            name: 'popup',
            target: 'cs_bundle'
        })

        var popupMux = setupMultiplex(popupStream)

        pump(
            popupStream,
            popupMux,
            popupStream,
            (err) => logStreamDisconnectWarning('Amoveo3 - popup', err)
    )

        pump(
            popupMux.createStream('channelStore'),
            asStream(this.channelStore),
            (err) => logStreamDisconnectWarning('Amoveo Channels', err)
        )
    }


    getState() {
        return this.publicConfigStore.getState();
    }

    getApi() {
        return {
            getState: (cb) => cb(null, this.getState()),
        }
    }

    setupStoreStream(store, outStream) {
        pump(
            asStream(store),
            outStream,
            (err) => {
                if(err) log.error(err)
            }
        )
    }

    initializeProvider() {

    }

}

function logStreamDisconnectWarning(remoteLabel, err) {
    let warningMsg = `AmoveoInpageProvider - lost connection to ${remoteLabel}`
    if (err) warningMsg += '\n' + err.stack
    console.warn(warningMsg)
}
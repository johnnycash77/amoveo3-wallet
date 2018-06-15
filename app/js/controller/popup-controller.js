const ObservableStore = require('obs-store')

class PopupController {

    constructor (opts = {}) {
        this.store = new ObservableStore()
    }

    setSelectedAddress (_address) {
        this.store.updateState({
            selectedAddress: _address
        })
    }
}

module.exports = PopupController

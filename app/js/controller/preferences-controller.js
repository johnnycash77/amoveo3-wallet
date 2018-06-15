const ObservableStore = require('obs-store')

class PreferencesController {

    constructor (opts = {}) {
        this.store = new ObservableStore(opts.initState)
    }

    setSelectedAddress (_address) {
        return new Promise((resolve, reject) => {
          this.store.updateState({
            selectedAddress: _address
          })
          resolve()
        })
    }
}

module.exports = PreferencesController
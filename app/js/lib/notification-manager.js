const extension = require('extensionizer')
const height = 620
const width = 360


class NotificationManager {

  /**
   * A collection of methods for controlling the showing and hiding of the notification popup.
   *
   * @typedef {Object} NotificationManager
   *
   */

  /**
   * Either brings an existing MetaMask notification window into focus, or creates a new notification window. New
   * notification windows are given a 'popup' type.
   *
   */
  showPopup(opts) {
    this._getPopup((err, popup) => {
      if (err) throw err

      // Bring focus to chrome popup
      if (popup) {
        // bring focus to existing chrome popup
        this.closePopup();
      }

        var query = ""
        if (opts) {
          const type = this.addValueIfExists(opts, "type", opts.type)
          const ip = this.addValueIfExists(opts, "ip", opts.ip)
          const side = this.addValueIfExists(opts, "side", opts.side)
          const price = this.addValueIfExists(opts, "price", opts.price)
          const oid = this.addValueIfExists(opts, "oid", opts.oid)
          const amount = this.addValueIfExists(opts, "amount", opts.amount)
          const index = this.addValueIfExists(opts, "index", opts.index)
          const message = this.addValueIfExists(opts, "message", opts.message)

          query += type
              + ip
              + side
              + price
              + oid
              + amount
              + index
              + message
        }

        // create new notification popup
        extension.windows.create({
          url: 'notification.html?' + query,
          type: 'popup',
          width,
          height,
        })

    })
  }

  addValueIfExists(opts, name, value) {
    return opts.hasOwnProperty(name) ? name + "=" + value + "&" : ""
  }

  /**
   * Closes a MetaMask notification if it window exists.
   *
   */
  closePopup () {
    // closes notification popup
    this._getPopup((err, popup) => {
      if (err) throw err
      if (!popup) return
      extension.windows.remove(popup.id, console.error)
    })
  }

  /**
   * Checks all open MetaMask windows, and returns the first one it finds that is a notification window (i.e. has the
   * type 'popup')
   *
   * @param {Function} cb A node style callback that to whcih the found notification window will be passed.
   *
   */
  _getPopup (cb) {
    this._getWindows((err, windows) => {
      if (err) throw err
      cb(null, this._getPopupIn(windows))
    })
  }

  /**
   * Returns all open MetaMask windows.
   *
   * @private
   * @param {Function} cb A node style callback that to which the windows will be passed.
   *
   */
  _getWindows (cb) {
    // Ignore in test environment
    if (!extension.windows) {
      return cb()
    }

    extension.windows.getAll({}, (windows) => {
      cb(null, windows)
    })
  }

  /**
   * Given an array of windows, returns the first that has a 'popup' type, or null if no such window exists.
   *
   * @private
   * @param {array} windows An array of objects containing data about the open MetaMask extension windows.
   *
   */
  _getPopupIn (windows) {
    return windows ? windows.find((win) => {
      // Returns notification popup
      return (win && win.type === 'popup')
    }) : null
  }

}

module.exports = NotificationManager
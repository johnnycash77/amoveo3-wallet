const extension = require('extensionizer')
const height = 620
const width = 360

class NotificationManager {

	showPopup(opts) {
		this.getPopup((err, popup) => {
			if (err) {
				throw err
			}

			// Bring focus to chrome popup
			if (popup) {
				// bring focus to existing chrome popup
				this.closePopup();
			}

			let query = ""
			if (opts) {
				for (let property in opts) {
					if (opts.hasOwnProperty(property)) {
						query += property + "=" + opts[property] + "&"
					}
				}
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

	closePopup() {
		// closes notification popup
		this.getPopup((err, popup) => {
			if (err) {
				throw err
			}
			if (!popup) {
				return
			}
			extension.windows.remove(popup.id, console.error)
		})
	}

	getPopup(cb) {
		this.getWindows((err, windows) => {
			if (err) {
				throw err
			}
			cb(null, this.getPopupIn(windows))
		})
	}

	getWindows(cb) {
		// Ignore in test environment
		if (!extension.windows) {
			return cb()
		}

		extension.windows.getAll({}, (windows) => {
			cb(null, windows)
		})
	}

	getPopupIn(windows) {
		return windows ? windows.find((win) => {
			// Returns notification popup
			return (win && win.type === 'popup')
		}) : null
	}

}

module.exports = NotificationManager
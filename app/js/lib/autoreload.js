module.exports = setupDappAutoReload

function setupDappAutoReload(amoveo3, port) {
	let reloadInProgress = false
	let lastTimeUsed
	let lastSeenNetwork;
	let lastSeenAccount;
	let lastSeenLocked;

	global.amoveo3 = new Proxy(amoveo3, {
		get: (_amoveo3, key) => {
			lastTimeUsed = Date.now()
			return _amoveo3[key]
		},
		set: (_amoveo3, key, value) => {
			_amoveo3[key] = value
		},
	})

	const setStateCallback = function (request) {
		if (request.type === "setState") {
			const state = request.data;

			if (reloadInProgress) {
				return
			}

			const currentNetwork = state.network
			const currentAccount = state.selectedAddress
			const isLocked = state.isLocked

			if (!lastSeenNetwork) {
				lastSeenNetwork = currentNetwork;
			}
			if (!lastSeenAccount) {
				lastSeenAccount = currentAccount;
			}
			if (!lastSeenLocked) {
				lastSeenLocked = isLocked;
			}

			const shouldReload = lastSeenNetwork !== currentNetwork || lastSeenAccount !== currentAccount || lastSeenLocked !== isLocked;

			lastSeenNetwork = currentNetwork;
			lastSeenAccount = currentAccount;
			lastSeenLocked = isLocked;

			if (shouldReload) {
				reloadInProgress = true
				const timeSinceUse = Date.now() - lastTimeUsed
				// if amoveo3 was recently used then delay the reloading of the page
				if (timeSinceUse > 500) {
					triggerReset()
				} else {
					setTimeout(triggerReset, 500)
				}
			}
		}
	}

	if (port) {
		port.onMessage.addListener(setStateCallback)
	} else {
		window.addEventListener("message", setStateCallback);
	}
}

function triggerReset() {
	global.location.reload()
}
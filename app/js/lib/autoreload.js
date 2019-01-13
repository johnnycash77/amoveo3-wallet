module.exports = setupDappAutoReload

function setupDappAutoReload (amoveo3, port) {
  let reloadInProgress = false
  let lastTimeUsed
  let lastSeenNetwork

  global.amoveo3 = new Proxy(amoveo3, {
    get: (_amoveo3, key) => {
      lastTimeUsed = Date.now()
      return _amoveo3[key]
    },
    set: (_amoveo3, key, value) => {
      _amoveo3[key] = value
    },
  })

  port.onMessage.addListener(function(state) {
    if (reloadInProgress) {
      return
    }

    const currentNetwork = state.network

    if (!lastSeenNetwork) {
      lastSeenNetwork = currentNetwork
      return
    }

    if (!lastTimeUsed || currentNetwork === lastSeenNetwork) {
      return
    }

    reloadInProgress = true
    const timeSinceUse = Date.now() - lastTimeUsed
    // if amoveo3 was recently used then delay the reloading of the page
    if (timeSinceUse > 500) {
      triggerReset()
    } else {
      setTimeout(triggerReset, 500)
    }
  })
}

function triggerReset () {
  global.location.reload()
}
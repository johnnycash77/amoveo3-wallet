module.exports = setupDappAutoReload

function setupDappAutoReload (amoveo3, port) {
  // export amoveo3 as a global, checking for usage
  let hasBeenWarned = false
  let reloadInProgress = false
  let lastTimeUsed
  let lastSeenNetwork

  global.amoveo3 = new Proxy(amoveo3, {
    get: (_amoveo3, key) => {
      // show warning once on amoveo3 access
      // if (!hasBeenWarned && key !== 'currentProvider') {
      //   console.warn('Amoveo: amoveo3 will be deprecated in the near future in favor of the ethereumProvider \nhttps://github.com/MetaMask/faq/blob/master/detecting_metamask.md#amoveo3-deprecation')
      //   hasBeenWarned = true
      // }
      // get the time of use
      lastTimeUsed = Date.now()
      // return value normally
      return _amoveo3[key]
    },
    set: (_amoveo3, key, value) => {
      // set value normally
      _amoveo3[key] = value
    },
  })

  port.onMessage.addListener(function(state) {
    // if reload in progress, no need to check reload logic
    if (reloadInProgress) return

    // const currentNetwork = state.networkVersion

    // set the initial network
    // if (!lastSeenNetwork) {
    //   lastSeenNetwork = currentNetwork
    //   return
    // }

    // skip reload logic if amoveo3 not used
    if (!lastTimeUsed) return

    // // if network did not change, exit
    // if (currentNetwork === lastSeenNetwork) return

    // initiate page reload
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

// reload the page
function triggerReset () {
  global.location.reload()
}
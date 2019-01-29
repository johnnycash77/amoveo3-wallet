global = window;


cleanContextForImports()

const extension = require('extensionizer')
const Amoveo3 = require('./lib/amoveo3/amoveo3.js')
const log = require('loglevel')
const LocalMessageDuplexStream = require('post-message-stream')
const setupDappAutoReload = require('./lib/autoreload.js')
const AmoveoInpageProvider = require('./lib/inpage-provider.js')
restoreContextAfterImports()

log.setDefaultLevel(process.env.AMOVEO_DEBUG ? 'debug' : 'warn')

//
// setup plugin communication
//

// setup background connection
var backgroundStream = new LocalMessageDuplexStream({
  name: 'inpage_bundle',
  target: 'cs_bundle',
})

// compose the inpage provider
var inpageProvider = new AmoveoInpageProvider(backgroundStream)

//
// setup amoveo3
//

if (typeof window.amoveo3 !== 'undefined') {
  throw new Error(`Amoveo detected another amoveo3.
     Amoveo will not work reliably with another web3 extension.
     This usually happens if you have two Amoveos installed,
     or Amoveo and another amoveo3 extension. Please remove one
     and try again.`)
}
var amoveo3 = new Amoveo3(inpageProvider)
amoveo3.setProvider = function () {
  log.debug('Amoveo Wallet - overrode amoveo3.setProvider')
}
log.debug('Amoveo Wallet - injected amoveo3')
// export global web3, with usage-detection

setupDappAutoReload(amoveo3, inpageProvider.port);

// set web3 defaultAccount
inpageProvider.subscribe(function(request) {
  if (request.type === "setState") {
	  const state = request.data;
	  amoveo3.setCoinbase(state.selectedAddress);
	  amoveo3.setChannels(state.channels);
	  amoveo3.setLocked(state.isLocked);
	  amoveo3.setNetwork(state.network);
  }
})

//inpageProvider.channelsStore.subscribe(function (state) {
//  amoveo3.setChannels(state.channels);
//})

// need to make sure we aren't affected by overlapping namespaces
// and that we dont affect the app with our namespace
// mostly a fix for web3's BigNumber if AMD's "define" is defined...
var __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports () {
  __define = global.define
  try {
    global.define = undefined
  } catch (_) {
    console.warn('Amoveo Wallet - global.define could not be deleted.')
  }
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports () {
  try {
    global.define = __define
  } catch (_) {
    console.warn('Amoveo Wallet - global.define could not be overwritten.')
  }
}
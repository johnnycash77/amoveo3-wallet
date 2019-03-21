global = window;


cleanContextForImports()

const Amoveo3 = require('./lib/amoveo3/amoveo3.js')
const log = require('loglevel')
const setupDappAutoReload = require('./lib/autoreload.js')
const AmoveoInpageProvider = require('./lib/inpage-provider.js')

restoreContextAfterImports()

log.setDefaultLevel(process.env.AMOVEO_DEBUG ? 'debug' : 'warn')


if (typeof window.amoveo3 !== 'undefined') {
	throw new Error(`Amoveo detected another amoveo3.
     Amoveo3 will not work reliably with another amoveo3 extension.
     This usually happens if you have two Amoveos installed,
     or Amoveo3 and another amoveo3 extension. Please remove one
     and try again.`)
}
var inpageProvider = new AmoveoInpageProvider()
var amoveo3 = new Amoveo3(inpageProvider)
amoveo3.setProvider = function () {
	log.debug('Amoveo3 Wallet - overrode amoveo3.setProvider')
}
log.debug('Amoveo3 Wallet - injected amoveo3')

setupDappAutoReload(amoveo3, inpageProvider.port);

inpageProvider.subscribe(function (request) {
	if (request.type === "setState") {
		const state = request.data;
		amoveo3.setCoinbase(state.selectedAddress);
		amoveo3.setChannels(state.channels);
		amoveo3.setLocked(state.isLocked);
		amoveo3.setNetwork(state.network);
		amoveo3.setTopHeader(state.topHeader);
	}
})


var __define

/**
 * Caches reference to global define object and deletes it to
 * avoid conflicts with other global define objects, such as
 * AMD's define function
 */
function cleanContextForImports() {
	__define = global.define
	try {
		global.define = undefined
	} catch (_) {
		console.warn('Amoveo3 Wallet - global.define could not be deleted.')
	}
}

/**
 * Restores global define object from cached reference
 */
function restoreContextAfterImports() {
	try {
		global.define = __define
	} catch (_) {
		console.warn('Amoveo3 Wallet - global.define could not be overwritten.')
	}
}

(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
const extension = require('extensionizer')

const url = chrome.runtime.getURL("/js/build/inpage_bundle.js");

fetch(url)
.then(function(response) {
	return response.text()
})
.then(function(inpageContent) {
	const inpageSuffix = '//# sourceURL=' + extension.extension.getURL('inpage_bundle.js?v=1.2.4') + '\n'
	const inpageBundle = inpageContent + inpageSuffix

	if (shouldInjectAmoveo3()) {
		setupInjection(inpageBundle)
	}
});

function setupInjection(inpageBundle) {
    try {
        var scriptTag = document.createElement('script')
        scriptTag.textContent = inpageBundle
        scriptTag.onload = function () {
            this.parentNode.removeChild(this)
        }
        var container = document.head || document.documentElement

        container.insertBefore(scriptTag, container.children[0])
    } catch (e) {
        console.error('Amoveo injection failed.', e)
    }
}

function shouldInjectAmoveo3() {
    return doctypeCheck() && suffixCheck()
        && documentElementCheck() && whitelistedDomainCheck();
}

function doctypeCheck() {
    const doctype = window.document.doctype
    if (doctype) {
        return doctype.name === 'html'
    } else {
        return true
    }
}

function suffixCheck() {
    var prohibitedTypes = ['xml', 'pdf']
    var currentUrl = window.location.href
    var currentRegex
    for (let i = 0; i < prohibitedTypes.length; i++) {
        currentRegex = new RegExp(`\\.${prohibitedTypes[i]}$`)
        if (currentRegex.test(currentUrl)) {
            return false
        }
    }
    return true
}

function documentElementCheck() {
    var documentElement = document.documentElement.nodeName
    if (documentElement) {
        return documentElement.toLowerCase() === 'html'
    }
    return true
}

function blacklistedDomainCheck() {
    var blacklistedDomains = [
        'uscourts.gov',
        'dropbox.com',
        'webbyawards.com',
        'cdn.shopify.com/s/javascripts/tricorder/xtld-read-only-frame.html',
    ]
    var currentUrl = window.location.href
    var currentRegex
    for (let i = 0; i < blacklistedDomains.length; i++) {
        const blacklistedDomain = blacklistedDomains[i].replace('.', '\\.')
        currentRegex = new RegExp(`(?:https?:\\/\\/)(?:(?!${blacklistedDomain}).)*$`)
        if (!currentRegex.test(currentUrl)) {
            return true
        }
    }
    return false
}

function whitelistedDomainCheck() {
    var whitelistedDomains = [
        'localhost',
        'amoveobook.com',
    ]
    var currentUrl = window.location.href
    var currentRegex;
    var currentRegexHttp;
    for (let i = 0; i < whitelistedDomains.length; i++) {
        const whitelistedDomain = whitelistedDomains[i].replace('.', '\\.')
        currentRegex = new RegExp(`(?:https?:\\/\\/)(?:(?!${whitelistedDomain}).)*$`)
        if (!currentRegex.test(currentUrl)) {
            return true
        }
    }
    return false
}

const isFirefox = typeof InstallTrigger !== 'undefined';

if (isFirefox) {
	let myPort = extension.runtime.connect({name: "port-from-cs"});
	myPort.postMessage({greeting: "hello from content script"});

	window.addEventListener("message", (event) => {
		console.log("in content page, listener received event");
		console.log(event);

		if (event.data.direction && event.data.direction === "from-inpage-provider") {
			myPort.postMessage(event.data);
		}
	});

	myPort.onMessage.addListener(function (request) {
		console.log("In content script, received message from background script: ");
		console.log(request);

		const whitelistedDomains = [
			'http://localhost:5000',
			'http://amoveobook.com',
			'https://amoveobook.com',
		];

		for (let i = 0; i < whitelistedDomains.length; i++) {
			const target = whitelistedDomains[i];
			window.postMessage(request, target);
		}
	});
}
},{"extensionizer":3}],2:[function(require,module,exports){
const apis = [
  'alarms',
  'bookmarks',
  'browserAction',
  'commands',
  'contextMenus',
  'cookies',
  'downloads',
  'events',
  'extension',
  'extensionTypes',
  'history',
  'i18n',
  'idle',
  'notifications',
  'pageAction',
  'runtime',
  'storage',
  'tabs',
  'webNavigation',
  'webRequest',
  'windows',
]

const hasChrome = typeof chrome !== 'undefined'
const hasWindow = typeof window !== 'undefined'
const hasBrowser = typeof browser !== 'undefined'

function Extension () {
  const _this = this

  apis.forEach(function (api) {

    _this[api] = null

    if (hasChrome) {
      try {
        if (chrome[api]) {
          _this[api] = chrome[api]
        }
      } catch (e) {
      }
    }

    if (hasWindow) {
      try {
        if (window[api]) {
          _this[api] = window[api]
        }
      } catch (e) {
      }
    }

    if (hasBrowser) {
      try {
        if (browser[api]) {
          _this[api] = browser[api]
        }
      } catch (e) {
      }
      try {
        _this.api = browser.extension[api]
      } catch (e) {
      }
    }
  })

  if (hasBrowser) {
    try {
      if (browser && browser.runtime) {
        this.runtime = browser.runtime
      }
    } catch (e) {
    }

    try {
      if (browser && browser.browserAction) {
        this.browserAction = browser.browserAction
      }
    } catch (e) {
    }
  }

}

module.exports = Extension

},{}],3:[function(require,module,exports){
/* Extension.js
 *
 * A module for unifying browser differences in the WebExtension API.
 *
 * Initially implemented because Chrome hides all of their WebExtension API
 * behind a global `chrome` variable, but we'd like to start grooming
 * the code-base for cross-browser extension support.
 *
 * You can read more about the WebExtension API here:
 * https://developer.mozilla.org/en-US/Add-ons/WebExtensions
 */

const Extension = require('./extension-instance')
module.exports = new Extension()

},{"./extension-instance":2}]},{},[1]);

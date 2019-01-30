const fs = require('fs')
const path = require('path')
const extension = require('extensionizer')

const inpageContent = fs.readFileSync(path.join(__dirname, 'build', 'inpage_bundle.js')).toString()
const inpageSuffix = '//# sourceURL=' + extension.extension.getURL('inpage_bundle.js?v=1.6.2') + '\n'
const inpageBundle = inpageContent + inpageSuffix

if (shouldInjectAmoveo3()) {
    setupInjection()
}

function setupInjection() {
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


window.addEventListener("message", (event) => {
	console.log("yesssir");
	console.log(event);

	// alert("Content script received asdfdasf message:");

	// alert("Content script received message: \"" + event.data.message + "\"");
	// if (event.source == window &&
	// 	event.data &&
	// 	event.data.direction == "from-page-script") {
	// 	alert("Content script received message: \"" + event.data.message + "\"");
	// }
});


var myPort = browser.runtime.connect({name:"port-from-cs"});
// myPort.postMessage({greeting: "hello from content script"});

myPort.onMessage.addListener(function(request) {
	console.log("In content script, received message from background script: ");
	console.log(request);

	window.postMessage(request, "*");
});

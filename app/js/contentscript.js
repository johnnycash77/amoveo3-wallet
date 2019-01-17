const fs = require('fs')
const path = require('path')
const extension = require('extensionizer')

const inpageContent = fs.readFileSync(path.join(__dirname, 'build', 'inpage_bundle.js')).toString()
const inpageSuffix = '//# sourceURL=' + extension.extension.getURL('inpage_bundle.js?v=1.6.1') + '\n'
const inpageBundle = inpageContent + inpageSuffix

// Eventually this streaming injection could be replaced with:
// https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Language_Bindings/Components.utils.exportFunction
//
// But for now that is only Firefox
// If we create a FireFox-only code path using that API,
// MetaMask will be much faster loading and performant on Firefox.

if (shouldInjectAmoveo3()) {
    setupInjection()
}

/**
 * Creates a script tag that injects inpage.js
 */
function setupInjection() {
    try {
        // inject in-page script
        var scriptTag = document.createElement('script')
        scriptTag.textContent = inpageBundle
        scriptTag.onload = function () {
            this.parentNode.removeChild(this)
        }
        var container = document.head || document.documentElement
        // append as first child
        container.insertBefore(scriptTag, container.children[0])
    } catch (e) {
        console.error('Amoveo injection failed.', e)
    }
}

/**
 * Determines if Web3 should be injected
 *
 * @returns {boolean} {@code true} if Web3 should be injected
 */
function shouldInjectAmoveo3() {
    return doctypeCheck() && suffixCheck()
        && documentElementCheck() && whitelistedDomainCheck();
}

/**
 * Checks the doctype of the current document if it exists
 *
 * @returns {boolean} {@code true} if the doctype is html or if none exists
 */
function doctypeCheck() {
    const doctype = window.document.doctype
    if (doctype) {
        return doctype.name === 'html'
    } else {
        return true
    }
}

/**
 * Checks the current document extension
 *
 * @returns {boolean} {@code true} if the current extension is not prohibited
 */
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

/**
 * Checks the documentElement of the current document
 *
 * @returns {boolean} {@code true} if the documentElement is an html node or if none exists
 */
function documentElementCheck() {
    var documentElement = document.documentElement.nodeName
    if (documentElement) {
        return documentElement.toLowerCase() === 'html'
    }
    return true
}

/**
 * Checks if the current domain is blacklisted
 *
 * @returns {boolean} {@code true} if the current domain is blacklisted
 */
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

/**
 * Checks if the current domain is blacklisted
 *
 * @returns {boolean} {@code true} if the current domain is whitelisted
 */
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

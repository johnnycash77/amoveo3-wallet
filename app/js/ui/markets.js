const extension = require('extensionizer');

function initMarketsTab() {
    document.getElementById('view-markets-link').onclick = function(e) {
        extension.tabs.create({url: "http://amoveobook.com/"})
    };
}

module.exports = initMarketsTab;
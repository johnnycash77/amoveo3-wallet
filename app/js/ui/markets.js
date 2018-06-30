const extension = require('extensionizer');

function initMarketsTab() {
    document.getElementById('view-markets-link').onclick = function(e) {
        chrome.tabs.query({}, function (tabs) {
            var tabExists = false;
            for (var i = 0; i < tabs.length; i++) {
                var tab = tabs[i];
                if (tab.url.indexOf("amoveobook") !== -1) {
                    tabExists = true;
                    chrome.tabs.update(tab.id, { highlighted: true });
                    break;
                }
            }

            if (!tabExists) {
                extension.tabs.create({url: "http://amoveobook.com/"})
            }
        });
    };
}

module.exports = initMarketsTab;
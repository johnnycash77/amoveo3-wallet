const views = require('./views.js');

const pageIds = [
    "account-container",
    "settings-container",
    "welcome-container",
    "account-switch-container",
]

module.exports = class ViewsController {

    setView(page) {
        var ids = this.pageIds;
        for (var i = 0; i < ids.length; i++) {
            views.hide(ids[i]);
        }
        view.show(page);
    }

}
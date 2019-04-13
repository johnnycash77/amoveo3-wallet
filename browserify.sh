#!/usr/bin/env bash
browserify -t brfs app/js/ui/popup.js > app/js/ui/build/bundle.js
browserify app/js/contentscript.js > app/js/build/cs_bundle.js
browserify app/js/inpage.js > app/js/build/inpage_bundle.js
browserify app/js/background.js > app/js/build/background_bundle.js
browserify app/js/notification.js > app/js/build/notification_bundle.js
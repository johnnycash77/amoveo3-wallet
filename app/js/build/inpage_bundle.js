(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (process,global){
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

}).call(this,require('_process'),typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./lib/amoveo3/amoveo3.js":2,"./lib/autoreload.js":4,"./lib/inpage-provider.js":5,"_process":9,"loglevel":8}],2:[function(require,module,exports){
var Api = require('./api');

function Amoveo3(provider) {
    this.currentProvider = provider;
    this.api = new Api();
    this.channels = [];
    this.network = "";
    this.coinbase = "";
    this.isLocked = true;
}

Amoveo3.prototype.setProvider = function (provider) {
    this.currentProvider = provider;
};

Amoveo3.prototype.setCoinbase = function (coinbase) {
    this.coinbase = coinbase;
};

Amoveo3.prototype.setChannels = function (channels) {
    this.channels = channels;
};

Amoveo3.prototype.isConnected = function() {
    return (this.currentProvider);
};

Amoveo3.prototype.setLocked = function (locked) {
    this.isLocked = locked;
};

Amoveo3.prototype.isLocked = function() {
	return this.isLocked;
};

Amoveo3.prototype.setNetwork = function (network) {
    this.network = network;
};

Amoveo3.prototype.getNetwork = function() {
    return this.network;
};

Amoveo3.prototype.getSelectedAccount = function() {
    return this.coinbase;
};

Amoveo3.prototype.getTopHeader = function(callback) {
    this.api.getHeaders(function(error, response) {
        return callback(error, response);
    });
};

module.exports = Amoveo3;
},{"./api":3}],3:[function(require,module,exports){

function Api(host, timeout, headers) {
    this.host = host || 'http://159.65.120.84:8080';
    this.timeout = timeout || 1;
    this.network = "";
    this.headers = headers || {};
}

Api.prototype.getHeaders = function getHeaders(callback) {
    var header = 0;
    return callback(undefined, header);
}

module.exports = Api;

},{}],4:[function(require,module,exports){
(function (global){
module.exports = setupDappAutoReload

function setupDappAutoReload(amoveo3, port) {
	let reloadInProgress = false
	let lastTimeUsed
	let lastSeenNetwork;
	let lastSeenAccount;
	let lastSeenLocked;

	global.amoveo3 = new Proxy(amoveo3, {
		get: (_amoveo3, key) => {
			lastTimeUsed = Date.now()
			return _amoveo3[key]
		},
		set: (_amoveo3, key, value) => {
			_amoveo3[key] = value
		},
	})

	const setStateCallback = function (request) {
		if (request.type === "setState") {
			const state = request.data;

			if (reloadInProgress) {
				return
			}

			const currentNetwork = state.network
			const currentAccount = state.selectedAddress
			const isLocked = state.isLocked

			if (!lastSeenNetwork) {
				lastSeenNetwork = currentNetwork;
			}
			if (!lastSeenAccount) {
				lastSeenAccount = currentAccount;
			}
			if (!lastSeenLocked) {
				lastSeenLocked = isLocked;
			}

			const shouldReload = lastSeenNetwork !== currentNetwork || lastSeenAccount !== currentAccount || lastSeenLocked !== isLocked;

			lastSeenNetwork = currentNetwork;
			lastSeenAccount = currentAccount;
			lastSeenLocked = isLocked;

			if (shouldReload) {
				reloadInProgress = true
				const timeSinceUse = Date.now() - lastTimeUsed
				// if amoveo3 was recently used then delay the reloading of the page
				if (timeSinceUse > 500) {
					triggerReset()
				} else {
					setTimeout(triggerReset, 500)
				}
			}
		}
	}

	if (port) {
		port.onMessage.addListener(setStateCallback)
	} else {
		window.addEventListener("message", setStateCallback);
	}
}

function triggerReset() {
	global.location.reload()
}
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],5:[function(require,module,exports){
module.exports = AmoveoInpageProvider;

const extension = require('extensionizer')

const extId = "hfojlfflnlmfjhddgodpmophmhpimahi";
// const extId = "dihkmjjoakaiagmoflhachmoolamfimp";

function AmoveoInpageProvider() {
	if (extension.runtime) {
		this.port = extension.runtime.connect(extId);
	}
}

AmoveoInpageProvider.prototype.subscribe = function(callback) {
	if (callback) {
		if (this.port) {
			this.port.onMessage.addListener(function (data) {
				callback(data);
			});
		} else {
			window.addEventListener("message", (event) => {
				callback(event.data);
			});
		}
	}
}

AmoveoInpageProvider.prototype.send = function (opts, callback) {
	const port = this.port;
	if (port) {
		port.postMessage(opts);
	} else {
		window.postMessage({
			direction: "from-inpage-provider",
			message: opts
		}, "*");
	}

	if (callback) {
		function sendListener(data) {
			if (data.type === opts.type) {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data);
				}
				if (port) {
					port.onMessage.removeListener(sendListener);
				}
			}
		}

		if (port) {
			port.onMessage.addListener(sendListener);
		} else {
			function windowListener(event) {
				const data = event.data;
				if (data.type === opts.type) {
					if (data.error) {
						callback(data.error, null);
					} else {
						callback(null, data);
					}
					window.removeEventListener("message", windowListener);
				}
			}

			window.addEventListener("message", windowListener);
		}
	}
}

AmoveoInpageProvider.prototype.sign = function (opts, callback) {
	const port = this.port;
	if (port) {
		port.postMessage(opts);
	} else {
		window.postMessage({
			direction: "from-inpage-provider",
			message: opts
		}, "*");
	}

	if (callback) {
		function sendListener(data) {
			if (data.type === "sign") {
				if (data.error) {
					callback(data.error, null);
				} else {
					callback(null, data);
				}
				if (port) {
					port.onMessage.removeListener(sendListener);
				}
			}
		}

		if (port) {
			port.onMessage.addListener(sendListener);
		} else {
			function windowListener(event) {
				const data = event.data;
				if (data.type === "sign") {
					if (data.error) {
						callback(data.error, null);
					} else {
						callback(null, data);
					}
					window.removeEventListener("message", windowListener);
				}
			}

			window.addEventListener("message", windowListener);
		}
	}
}

AmoveoInpageProvider.prototype.isConnected = function () {
  return true
}

AmoveoInpageProvider.prototype.isAmoveo3Wallet = function () {
    return true
}

},{"extensionizer":7}],6:[function(require,module,exports){
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

},{}],7:[function(require,module,exports){
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

},{"./extension-instance":6}],8:[function(require,module,exports){
/*
* loglevel - https://github.com/pimterry/loglevel
*
* Copyright (c) 2013 Tim Perry
* Licensed under the MIT license.
*/
(function (root, definition) {
    "use strict";
    if (typeof define === 'function' && define.amd) {
        define(definition);
    } else if (typeof module === 'object' && module.exports) {
        module.exports = definition();
    } else {
        root.log = definition();
    }
}(this, function () {
    "use strict";

    // Slightly dubious tricks to cut down minimized file size
    var noop = function() {};
    var undefinedType = "undefined";

    var logMethods = [
        "trace",
        "debug",
        "info",
        "warn",
        "error"
    ];

    // Cross-browser bind equivalent that works at least back to IE6
    function bindMethod(obj, methodName) {
        var method = obj[methodName];
        if (typeof method.bind === 'function') {
            return method.bind(obj);
        } else {
            try {
                return Function.prototype.bind.call(method, obj);
            } catch (e) {
                // Missing bind shim or IE8 + Modernizr, fallback to wrapping
                return function() {
                    return Function.prototype.apply.apply(method, [obj, arguments]);
                };
            }
        }
    }

    // Build the best logging method possible for this env
    // Wherever possible we want to bind, not wrap, to preserve stack traces
    function realMethod(methodName) {
        if (methodName === 'debug') {
            methodName = 'log';
        }

        if (typeof console === undefinedType) {
            return false; // No method possible, for now - fixed later by enableLoggingWhenConsoleArrives
        } else if (console[methodName] !== undefined) {
            return bindMethod(console, methodName);
        } else if (console.log !== undefined) {
            return bindMethod(console, 'log');
        } else {
            return noop;
        }
    }

    // These private functions always need `this` to be set properly

    function replaceLoggingMethods(level, loggerName) {
        /*jshint validthis:true */
        for (var i = 0; i < logMethods.length; i++) {
            var methodName = logMethods[i];
            this[methodName] = (i < level) ?
                noop :
                this.methodFactory(methodName, level, loggerName);
        }

        // Define log.log as an alias for log.debug
        this.log = this.debug;
    }

    // In old IE versions, the console isn't present until you first open it.
    // We build realMethod() replacements here that regenerate logging methods
    function enableLoggingWhenConsoleArrives(methodName, level, loggerName) {
        return function () {
            if (typeof console !== undefinedType) {
                replaceLoggingMethods.call(this, level, loggerName);
                this[methodName].apply(this, arguments);
            }
        };
    }

    // By default, we use closely bound real methods wherever possible, and
    // otherwise we wait for a console to appear, and then try again.
    function defaultMethodFactory(methodName, level, loggerName) {
        /*jshint validthis:true */
        return realMethod(methodName) ||
               enableLoggingWhenConsoleArrives.apply(this, arguments);
    }

    function Logger(name, defaultLevel, factory) {
      var self = this;
      var currentLevel;
      var storageKey = "loglevel";
      if (name) {
        storageKey += ":" + name;
      }

      function persistLevelIfPossible(levelNum) {
          var levelName = (logMethods[levelNum] || 'silent').toUpperCase();

          if (typeof window === undefinedType) return;

          // Use localStorage if available
          try {
              window.localStorage[storageKey] = levelName;
              return;
          } catch (ignore) {}

          // Use session cookie as fallback
          try {
              window.document.cookie =
                encodeURIComponent(storageKey) + "=" + levelName + ";";
          } catch (ignore) {}
      }

      function getPersistedLevel() {
          var storedLevel;

          if (typeof window === undefinedType) return;

          try {
              storedLevel = window.localStorage[storageKey];
          } catch (ignore) {}

          // Fallback to cookies if local storage gives us nothing
          if (typeof storedLevel === undefinedType) {
              try {
                  var cookie = window.document.cookie;
                  var location = cookie.indexOf(
                      encodeURIComponent(storageKey) + "=");
                  if (location !== -1) {
                      storedLevel = /^([^;]+)/.exec(cookie.slice(location))[1];
                  }
              } catch (ignore) {}
          }

          // If the stored level is not valid, treat it as if nothing was stored.
          if (self.levels[storedLevel] === undefined) {
              storedLevel = undefined;
          }

          return storedLevel;
      }

      /*
       *
       * Public logger API - see https://github.com/pimterry/loglevel for details
       *
       */

      self.name = name;

      self.levels = { "TRACE": 0, "DEBUG": 1, "INFO": 2, "WARN": 3,
          "ERROR": 4, "SILENT": 5};

      self.methodFactory = factory || defaultMethodFactory;

      self.getLevel = function () {
          return currentLevel;
      };

      self.setLevel = function (level, persist) {
          if (typeof level === "string" && self.levels[level.toUpperCase()] !== undefined) {
              level = self.levels[level.toUpperCase()];
          }
          if (typeof level === "number" && level >= 0 && level <= self.levels.SILENT) {
              currentLevel = level;
              if (persist !== false) {  // defaults to true
                  persistLevelIfPossible(level);
              }
              replaceLoggingMethods.call(self, level, name);
              if (typeof console === undefinedType && level < self.levels.SILENT) {
                  return "No console available for logging";
              }
          } else {
              throw "log.setLevel() called with invalid level: " + level;
          }
      };

      self.setDefaultLevel = function (level) {
          if (!getPersistedLevel()) {
              self.setLevel(level, false);
          }
      };

      self.enableAll = function(persist) {
          self.setLevel(self.levels.TRACE, persist);
      };

      self.disableAll = function(persist) {
          self.setLevel(self.levels.SILENT, persist);
      };

      // Initialize with the right level
      var initialLevel = getPersistedLevel();
      if (initialLevel == null) {
          initialLevel = defaultLevel == null ? "WARN" : defaultLevel;
      }
      self.setLevel(initialLevel, false);
    }

    /*
     *
     * Top-level API
     *
     */

    var defaultLogger = new Logger();

    var _loggersByName = {};
    defaultLogger.getLogger = function getLogger(name) {
        if (typeof name !== "string" || name === "") {
          throw new TypeError("You must supply a name when creating a logger.");
        }

        var logger = _loggersByName[name];
        if (!logger) {
          logger = _loggersByName[name] = new Logger(
            name, defaultLogger.getLevel(), defaultLogger.methodFactory);
        }
        return logger;
    };

    // Grab the current global log variable in case of overwrite
    var _log = (typeof window !== undefinedType) ? window.log : undefined;
    defaultLogger.noConflict = function() {
        if (typeof window !== undefinedType &&
               window.log === defaultLogger) {
            window.log = _log;
        }

        return defaultLogger;
    };

    defaultLogger.getLoggers = function getLoggers() {
        return _loggersByName;
    };

    return defaultLogger;
}));

},{}],9:[function(require,module,exports){
// shim for using process in browser
var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

function defaultSetTimout() {
    throw new Error('setTimeout has not been defined');
}
function defaultClearTimeout () {
    throw new Error('clearTimeout has not been defined');
}
(function () {
    try {
        if (typeof setTimeout === 'function') {
            cachedSetTimeout = setTimeout;
        } else {
            cachedSetTimeout = defaultSetTimout;
        }
    } catch (e) {
        cachedSetTimeout = defaultSetTimout;
    }
    try {
        if (typeof clearTimeout === 'function') {
            cachedClearTimeout = clearTimeout;
        } else {
            cachedClearTimeout = defaultClearTimeout;
        }
    } catch (e) {
        cachedClearTimeout = defaultClearTimeout;
    }
} ())
function runTimeout(fun) {
    if (cachedSetTimeout === setTimeout) {
        //normal enviroments in sane situations
        return setTimeout(fun, 0);
    }
    // if setTimeout wasn't available but was latter defined
    if ((cachedSetTimeout === defaultSetTimout || !cachedSetTimeout) && setTimeout) {
        cachedSetTimeout = setTimeout;
        return setTimeout(fun, 0);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedSetTimeout(fun, 0);
    } catch(e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't trust the global object when called normally
            return cachedSetTimeout.call(null, fun, 0);
        } catch(e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error
            return cachedSetTimeout.call(this, fun, 0);
        }
    }


}
function runClearTimeout(marker) {
    if (cachedClearTimeout === clearTimeout) {
        //normal enviroments in sane situations
        return clearTimeout(marker);
    }
    // if clearTimeout wasn't available but was latter defined
    if ((cachedClearTimeout === defaultClearTimeout || !cachedClearTimeout) && clearTimeout) {
        cachedClearTimeout = clearTimeout;
        return clearTimeout(marker);
    }
    try {
        // when when somebody has screwed with setTimeout but no I.E. maddness
        return cachedClearTimeout(marker);
    } catch (e){
        try {
            // When we are in I.E. but the script has been evaled so I.E. doesn't  trust the global object when called normally
            return cachedClearTimeout.call(null, marker);
        } catch (e){
            // same as above but when it's a version of I.E. that must have the global object for 'this', hopfully our context correct otherwise it will throw a global error.
            // Some versions of I.E. have different rules for clearTimeout vs setTimeout
            return cachedClearTimeout.call(this, marker);
        }
    }



}
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = runTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    runClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        runTimeout(drainQueue);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;
process.prependListener = noop;
process.prependOnceListener = noop;

process.listeners = function (name) { return [] }

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}]},{},[1]);

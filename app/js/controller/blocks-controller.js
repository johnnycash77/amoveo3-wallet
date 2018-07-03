var storage = require('../lib/storage.js');
var network = require('./network-controller.js');
var config = require('../config.js');
var formatUtility = require('../lib/format-utility.js');
var cryptoUtility = require('../lib/crypto-utility.js');

class BlocksController {

    constructor() {
        this.init();

        var instance = this;
        storage.getTopHeader(function(error, header) {
            instance.topHeader = header;
        });
        storage.getHeaders(function(error, headers) {
            instance.headersDb = headers;
        })
    }

    init() {
        this.topHeader = 0;
        this.lastHeader = -1;
        this.lastSavedHeader = -1;
        this.headersDb = {};
        this.accumulatingDifficulty = 0;
        this.topDifficulty = 0;
        this.syncing = false;

        var instance = this;
        storage.getTopHeader(function(error, header) {
            instance.topHeader = header;
        });
        storage.getHeaders(function(error, headers) {
            instance.headersDb = headers;
        })
    }

    getHeight(callback) {
        if (this.topHeader === 0) {
            storage.getTopHeader(function (error, header) {
                if (header !== 0) {
                    callback(header[1]);
                } else {
                    callback(0);
                }
            })
        } else {
            callback(this.topHeader[1]);
        }
    }

    reset() {
        this.init();
    }

    startSyncing(callback) {
        this.getHeaders(callback);
    }

    isSyncing(callback) {
        this.syncing = false;
    }

    stopSyncing(callback) {
        this.syncing = false;
    }

    getHeaders(callback) {
        this.syncing = true;
        var instance = this;
        instance.getHeight(function(height) {
            network.send(["headers", 5001, height], function(error, headers) {
                if (error) {
                    console.error(error);
                    callback(instance.topHeader);
                } else if (!Array.isArray(headers)) {
                    console.error("Unexpected response");
                    callback(instance.topHeader);
                } else if (headers && headers.length > 1 && headers[1] < instance.topHeader[1]) {
                    console.error("Duplicate headers response: " + headers[1]);
                    callback(instance.topHeader);
                } else {
                    instance.saveHeaders(headers);

                    var syncing = instance.syncing;
                    instance.storeHeaders(function() {
                        if (syncing) {
                            instance.getHeaders(callback);
                        } else {
                            if (callback) {
                                callback(instance.topHeader);
                            }
                        }
                    });
                }
            });
        })
    }

    saveHeaders(headers) {
        if (!headers || headers.length === 0) {
            this.syncing = false;
        } else {
            for (var i = 1; i < headers.length; i++) {
                var header = headers[i];
                if (this.checkPow(headers[i])) {
                    this.saveHeader(header);
                } else {
                    console.log("bad header" + JSON.stringify(headers[i]));
                }
            }
        }
    }

    saveHeader(header) {
        this.topDifficulty = header[6];
        this.accumulatingDifficulty = this.accumulatingDifficulty + formatUtility.sciToInt(this.topDifficulty) - 1;

        var height = header[1];
        if (height === this.lastHeader) {
            this.syncing = false;
        }

        if (this.accumulatingDifficulty > this.topDifficulty) {
            this.topDifficulty = this.accumulatingDifficulty;
            this.lastHeader = this.topHeader[1];
            this.topHeader = header;
        }

        var key = cryptoUtility.hash(formatUtility.serializeHeader(header));
        this.headersDb[key] = header;
    }

    storeHeaders(callback) {
        var topHeader = this.topHeader;
        if (this.lastSavedHeader === topHeader) {
            callback();
        } else {
            var instance = this;
            storage.setHeaders(this.headersDb, function() {
                storage.setTopHeader(topHeader, function() {
                    instance.lastSavedHeader = topHeader;
                    callback();
                })
            })
        }
    }

    checkPow(header) {
        var height = header[1];
        if (height < 1) {
            return true;
        } else {
            var prevHash = formatUtility.stringToArray(atob(header[2]));
            var diff0 = this.calculateDifficulty(prevHash);
            var diff = header[6];
            if (diff === diff0) {
                var nonce = atob(header[8]);
                var data = JSON.parse(JSON.stringify(header));
                data[8] = btoa(formatUtility.arrayToString(formatUtility.intToArray(0, 32)));
                var s1 = formatUtility.serializeHeader(data);
                var h1 = cryptoUtility.hash(cryptoUtility.hash(s1));
                var foo, h2, I;
                if (height > 8999) {
                    var nonce2 = nonce.slice(-23),
                        foo = h1.concat(formatUtility.stringToArray(nonce2));
                    h2 = cryptoUtility.hash(foo);
                    I = formatUtility.newHashToInteger(h2);
                } else {
                    foo = h1.concat(
                        formatUtility.intToArray(diff, 2)).concat(formatUtility.stringToArray(nonce));
                    h2 = cryptoUtility.hash(foo);
                    I = formatUtility.hashToInt(h2);
                }
                return I > diff;
            } else {
                console.error("bad diff: " + diff + ", " + diff0);
                return false;
            }
        }
    }

    calculateDifficulty(hash) {
        var header = this.headersDb[hash];
        if (header === undefined) {
            console.log(hash);
            console.log("received an orphan header");
            return "unknown parent";
        } else {
            var Diff = header[6];
            var RF = config.retargetFrequency;
            var height = header[1];
            var x = height % RF;
            if (height > 26900) {
                x = height % Math.floor(RF / 2);
            } else {
                x = height % RF;
            }
            if ((x === 0) && (!(height < 10))) {
                return this.calculateDifficultyRecursive(header);
            } else {
                return Diff;
            }
        }
    }

    calculateDifficultyRecursive(header) {
        var period = header[10];
        var f = Math.floor(config.retargetFrequency / 2);
        var a1 = this.retargetRecursive(header, f - 1, []);
        var times1 = a1.times;
        var header2000 = a1.header;
        var a2 = this.retargetRecursive(header2000, f - 1, []);
        var times2 = a2.times;
        var m1 = median((times1).reverse().slice(1));
        var m10 = median((times1).reverse().slice(0));
        var m2 = median((times2).reverse());//628500
        var tbig = m1 - m2;
        var t0 = Math.floor(tbig / f);//limit to 700 seconds
        var t = Math.min(t0, Math.floor(period * 7 / 6));//upper limit of 16.66% decrease in difficulty.
        var old_diff = header2000[6];
        var nt = recalculatePow(
            old_diff,
            period,
            Math.max(1, t));//current estimated block time
        return Math.max(nt, config.initialDifficulty);//initial difficulty
    }

    retargetRecursive(header, n, ts) {
        var t = header[5];
        ts.push(t);

        if (n === 0) {
            return {
                "header": header,
                "times": ts
            };
        }
        else {
            var prevHash = formatUtility.stringToArray(atob(header[2]));
            var prevHeader = this.headersDb[prevHash];
            return this.retargetRecursive(prevHeader, n - 1, ts);
        }
    }
}

function recalculatePow(oldDiff, t, bottom) {
    var old = formatUtility.sciToInt(oldDiff);
    var n = Math.max(1, Math.floor(( old * t ) / bottom));
    //var n = Math.max(1, Math.floor(( old / bottom) * t));
    var d = formatUtility.intToSci(n);
    return Math.max(1, d);
}

function median(l) {
    l.sort(function(a, b) {return a - b;});
    var half = Math.floor(l.length / 2);
    return l[half];
}


module.exports = BlocksController;
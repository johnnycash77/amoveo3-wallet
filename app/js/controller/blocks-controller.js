var storage = require('../lib/storage.js');
var network = require('./network-controller.js');
var config = require('../config.js');
var formatUtility = require('../lib/format-utility.js');
var cryptoUtility = require('../lib/crypto-utility.js');
var BigInt = require('../lib/BigInt.js');

class BlocksController {

    constructor() {
        this.reset();
    }

    reset() {
        this.topHeader = 0;
        this.lastHeader = -1;
        this.lastSavedHeader = -1;
        this.headersDb = {};
        this.accumulatingDifficulty = 0;
        this.topDifficulty = 0;
        this.syncing = false;
	    this.checkPointHeader = ["header", 28001,"f3PfnlxML/UPF9T5ixy1+Q539NyOVfFG07x4pf3zw6Q=","4A7MYFe5u7OG22QGUvIFguzZWYWndkZARGdImbhbEjM=","huIlyyrALPoafVluEL/ZYtZ8BXHUJEPxcXCLid5CSnU=",141617794,14053,3,"AAAAAAAAAAAA6ZeG6UQ+dPE+8iEbHoY92if6pIMAAlI=",193346798808507350000,5982];
	    this.checkPointEwah = 1865656952131054;
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

	    storage.getTopHeader(function(error, header) {
		    if (header === 0 || header[1] < 28101 || header[1] === 28136) {
			    instance.writeHeader(instance.checkPointHeader, instance.checkPointEwah);
			    instance.doSync(callback);
		    } else {
			    instance.topHeader = header;

			    storage.getHeaders(function (error, headers) {
				    instance.headersDb = headers;

				    instance.doSync(callback);
			    })
		    }
	    });
    }

    doSync(callback) {
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

    setHeader(hash, header, ewah) {
        this.headersDb[hash] = [header, ewah];
    }

    getHeader(hash) {
        return this.headersDb[hash] ? this.headersDb[hash][0] : null;
    }

    getHeaderEwah(hash) {
        return this.headersDb[hash] ? this.headersDb[hash][1] : null;
    }

    saveHeaders(headers) {
        if (!headers || headers.length === 0) {
            this.syncing = false;
        } else {
            for (var i = 1; i < headers.length; i++) {
                var header = headers[i];
                var pow = this.checkPow(headers[i]);
                var powIsValid = pow[0];
                var ewah = pow[1];
                if (powIsValid) {
                    this.writeHeader(header, ewah);
                } else {
                    console.log("bad header" + JSON.stringify(headers[i]));
                }
            }
        }
    }

    writeHeader(header, ewah) {
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
        this.setHeader(key, header, ewah);
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
        if (height < 1 || height === this.checkPointHeader[1]) {
            return true;
        } else {
            var prevHash = formatUtility.stringToArray(atob(header[2]));
            var pow = this.calculateDifficulty(header, prevHash);
            var diff0 = pow[0];
            var ewah = pow[1];
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
                return [I > diff, ewah];
            } else {
                console.error("bad diff: " + diff + ", " + diff0);
                return [false, ewah];
            }
        }
    }

    calculateDifficulty(nextHeader, hash) {
        var header = this.getHeader(hash);
        if (header === undefined) {
            console.log("Received an orphan header: " + hash);
            return "unknown parent";
        } else {
            var Diff = header[6];
            var RF = config.retargetFrequency;
            var height = header[1];
            var x = height % RF;

	        if (height > config.forks.four) {
		        x = height % Math.floor(RF / 2);
	        } else {
		        x = height % RF;
	        }

	        var PrevEWAH = this.getHeaderEwah(hash);
	        var EWAH = this.calculateEwah(nextHeader, header, PrevEWAH);

	        if (height > config.forks.seven)  {
		        return [this.newTarget(header, EWAH), EWAH];
	        } else if (x === 0 && height >= 10) {
		        return [this.calculateDifficultyRecursive(header), EWAH];
	        } else {
		        return [Diff, EWAH];
	        }
        }
    }

	newTarget(header, EWAH0) {
		var EWAH = BigInt.max(EWAH0, 1);
		var diff = header[6];
		var hashes = formatUtility.sciToInt(diff);
		var estimate = BigInt.max(1, hashes.times(this.hashrateConverter()).divide(EWAH)).toJSNumber();
		var P = header[10];
		var UL = Math.floor(P * 6 / 4);
		var LL = Math.floor(P * 3 / 4);
		var ND = diff;
		if (estimate > UL) {
			ND = this.powRecalculate(diff, UL, estimate);
		} else if (estimate < LL) {
			ND = this.powRecalculate(diff, LL, estimate);
		}
		return Math.max(ND, config.initialDifficulty);
	}

	hashrateConverter() {
        return 1024;
    }

	powRecalculate(oldDiff, t, bottom) {
		var old = formatUtility.sciToInt(oldDiff);
		var n = old.times(t).divide(bottom);
		//var n = Math.max(1, Math.floor(( old * t ) / bottom));
		//var n = Math.max(1, Math.floor(( old / bottom) * t));

		var d = formatUtility.intToSci(n);
		return Math.max(1, d);
	}

    calculateEwah(header, prev_header, prev_ewah0) {
        var prev_ewah = BigInt.max(1, prev_ewah0);
        var DT = header[5] - prev_header[5];
        //maybe check that the header's time is in the past.
        var Hashrate0 = BigInt.max(BigInt(1),
            BigInt(this.hashrateConverter()).times(formatUtility.sciToInt(prev_header[6])).divide(DT));
        var N = 20;
        var Converter = prev_ewah.times(1024000);
        var EWAH2 = Converter.times((N - 1)).divide(prev_ewah);
        var EWAH0 = (Converter.divide(Hashrate0)).add(EWAH2);

        return Converter.times(N).divide(EWAH0).toJSNumber();
    }

    calculateDifficultyRecursive(header) {
        var period = header[10];
        var f = Math.floor(config.retargetFrequency / 2);
        var a1 = this.retargetRecursive(header, f - 1, []);
        var times1 = a1.times;
        var header2000 = a1.header;
        var a2 = this.retargetRecursive(header2000, f - 1, []);
        var times2 = a2.times;
        var m1 = this.median((times1).reverse().slice(1));
        var m10 = this.median((times1).reverse().slice(0));
        var m2 = this.median((times2).reverse());//628500
        var tbig = m1 - m2;
        var t0 = Math.floor(tbig / f);
        var t = Math.min(t0, Math.floor(period * 7 / 6));
        var old_diff = header2000[6];
        var nt = this.recalculatePow(
            old_diff,
            period,
            Math.max(1, t));
        return Math.max(nt, config.initialDifficulty);
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
            var prevHeader = this.getHeader(prevHash);
            return this.retargetRecursive(prevHeader, n - 1, ts);
        }
    }

    recalculatePow(oldDiff, t, bottom) {
		var old = formatUtility.sciToInt(oldDiff);
		var n = Math.max(1, Math.floor(( old * t ) / bottom));
		//var n = Math.max(1, Math.floor(( old / bottom) * t));
		var d = formatUtility.intToSci(n);
		return Math.max(1, d);
	}

	median(l) {
		l.sort(function(a, b) {return a - b;});
		var half = Math.floor(l.length / 2);
		return l[half];
	}

}

module.exports = BlocksController;
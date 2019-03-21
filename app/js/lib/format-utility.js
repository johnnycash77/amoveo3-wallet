var BigInt = require('./BigInt.js');

function s2c(x) {
    return x / 100000000;
}

function c2s(x) {
    return Math.floor(parseFloat(x.value, 10) * 100000000);
}

function array_to_int(l) {
    var x = 0;
    for (var i = 0; i < l.length; i++) {
        x = (256 * x) + l[i];
    }
    return x;
}

function toHex(str) {
    var hex = '';
    for(var i=0;i<str.length;i++) {
        l = str.charCodeAt(i).toString(16);
        var z = "";
        if (l.length < 2) { z = "0"; }
        hex += z;
	hex += ''+str.charCodeAt(i).toString(16);
    }
    return hex;
}
function fromHex(h) {
    var s = '';
    for(var i = 0; (2*i) < h.length;i++) {
        var m = h.slice((2*i), (2*(i+1)));
        var n = parseInt(m, 16);
        var l = String.fromCharCode(n);
        s = s.concat(l);
    }
    return s;
}
function stringToArray(x) {
    var a = new Uint8Array(x.length);
    for (var i=0; i<x.length; i++) {
        a[i] = x.charCodeAt(i);
    }
    return Array.from(a);
}
function intToArray(i, size) {
    var a = [];
    for ( var b = 0; b < size ; b++ ) {
        a.push(((i % 256) + 256) % 256);
        i = Math.floor(i/256);
    }
    return a.reverse();
}
function arrayToString(x) {
    var a = "";
    for (var i=0; i<x.length ; i++) {
        a += String.fromCharCode(x[i]);
    }
    return a;
}

function hashToInt(h) {
    function hash2integer2(h, i, n) {
        var x = h[i];
        if  ( x == 0 ) {
            return hash2integer2(h, i+1, n+(256*8));
        } else {
            return n + hash2integer3(x, h[i+1]);
        }
    }
    function dec2bin(dec){
        n = (dec).toString(2);
        n="00000000".substr(n.length)+n;
        return n;
    }
    function hash2integer3(byte1, byte2) {
        var x = dec2bin(byte1).concat(dec2bin(byte2));
        return hash2integer4(x, 0, 0);
    }
    function hash2integer4(binary, i, n) {
        var x = binary[i];
        if ( x == "0" ) { return hash2integer4(binary, i+1, n+256) }
        else {
            var b2 = binary.slice(i, i+8);
            var y = hash2integer5(b2) + n;
            return y;
        }
    }
    function hash2integer5(bin) {
        var x = 0;
        for (var i=0; i < bin.length; i++) {
            var y = bin[i];
            if ( y == "0" ) { x = x * 2; }
            else { x = 1 + (x * 2) }
        }
        return x;
    }
    return hash2integer2(h.concat([255]), 0, 0);
}
function ssToInternal(ess) {
	let ss = [];
	for (let i = 1; i < ess.length; i++) {
		if (JSON.stringify(ess[i][2]) === JSON.stringify([-6, -6])) {
			ess[i][2] = [-6];
			ess[i][3] = [-6];
		}
		ss = ss.concat([newSS(stringToArray(atob(ess[i][1])), ess[i][2], ess[i][3])]);
	}
	return ss;
}

function newSS(code, prove, meta) {
	if (meta === undefined) {
		meta = 0;
	}
	return {"code": code, "prove": prove, "meta": meta};
}
function newHashToInteger(h) {
    function hash2integer2(h, i, n) {
        var x = h[i];
        if  ( x == 0 ) {
            return hash2integer2(h, i+1, n+(256*8));
        } else {
            return n + hash2integer3(x, h[i+1]);
        }
    }
    function dec2bin(dec){
        n = (dec).toString(2);
        n="00000000".substr(n.length)+n;
        return n;
    }
    function hash2integer3(byte1, byte2) {
        var x = dec2bin(byte1).concat(dec2bin(byte2));
        return hash2integer4(x, 0, 0);
    }
    function hash2integer4(binary, i, n) {
        var x = binary[i];
        if ( x == "0" ) { return hash2integer4(binary, i+1, n+256) }
        else {
            var b2 = binary.slice(i+1, i+9);//this is the only line that is different between hash2integer and newhash2integer
            var y = hash2integer5(b2) + n;
            return y;
        }
    }
    function hash2integer5(bin) {
        var x = 0;
        for (var i=0; i < bin.length; i++) {
            var y = bin[i];
            if ( y == "0" ) { x = x * 2; }
            else { x = 1 + (x * 2) }
        }
        return x;
    }
    
    return hash2integer2(h.concat([255]), 0, 0);
}

function list_to_uint8(l) {
    var array = new Uint8Array(l.length);
    for (var i=0; i<l.length; i++) {
        a[i] = l[i];
    }
    return array;
}

function sciToInt(x) {
    function pair2int(l) {
        var b = l.pop();
        var a = l.pop();
	    var c = exponent(BigInt(2), a);
	    return c.times((256 + b)).divide(256);
    }

    function sci2pair(i) {
        var a = Math.floor(i / 256);
        var b = i % 256;
        return [a, b];
    }
    return pair2int(sci2pair(x));
}

function intToSci(x) {
    function pair2sci(l) {
        var b = l.pop();
        var a = l.pop();
        return (256 * a) + b;
    }

    function int2pair(x) {
        var a = log2(x) - 1;
	    var c = exponent(BigInt(2), a);
	    var b = x.times(256).divide(c).minus(256).toJSNumber();
        return [a, b];
    }
    return pair2sci(int2pair(x));
}

function pairTosci(x, b) {
    return (256 * x) + b;
}

function log2(x) {
	if (x.eq(0)) {
	    return 1;
	} else if (x.eq(1)) {
	    return 1;
	} else {
	    return 1 + log2(x.divide(2))
	}
}
function exponent(a, b) {
	if (b === 0) {
		return BigInt(1);
	} else if (b === 1) {
		return a;
	} else if (b % 2 === 0) {
		return exponent(a.times(a), Math.floor(b / 2));
	} else {
		return a.times(exponent(a, b-1));
	}
}

function serializeHeader(x) {
    var height = x[1]; //4 bytes
    var prevHash = atob(x[2]); //bin
    var treesHash = atob(x[3]); //bin
    var txsProofHash = atob(x[4]); //bin
    var time = x[5]; //4 bytes
    var difficulty = x[6]; // 3 bytes
    var version = x[7]; // 2 bytes
    var nonce = atob(x[8]); // 32 bytes
    var period = x[10];
    var y = stringToArray(prevHash);
    return y.concat(
        intToArray(height, 4)).concat(
        intToArray(time, 5)).concat(
        intToArray(version, 2)).concat(
        stringToArray(treesHash)).concat(
        stringToArray(txsProofHash)).concat(
        intToArray(difficulty, 2)).concat(
        stringToArray(nonce)).concat(
        intToArray(period, 2));
}

function binToRs(x) {
	/*
	  0x30 b1 0x02 b2 (vr) 0x02 b3 (vs)
	  where:
	  b1 is a single byte value, equal to the length, in bytes, of the remaining list of bytes (from the first 0x02 to the end of the encoding);
	  b2 is a single byte value, equal to the length, in bytes, of (vr);
	  b3 is a single byte value, equal to the length, in bytes, of (vs);
	  (vr) is the signed big-endian encoding of the value "r", of minimal length;
	  (vs) is the signed big-endian encoding of the value "s", of minimal length.
	*/
	var h = toHex(x);
	var a2 = x.charCodeAt(3);
	var r = h.slice(8, 8 + (a2 * 2));
	var s = h.slice(12 + (a2 * 2));
	return {"r": r, "s": s};
}

exports.stringToArray = stringToArray;
exports.intToArray = intToArray;
exports.arrayToString = arrayToString;
exports.newHashToInteger = newHashToInteger;
exports.hashToInt = hashToInt;
exports.pairTosci = pairTosci;
exports.intToSci = intToSci;
exports.sciToInt = sciToInt;
exports.fromHex = fromHex;
exports.toHex = toHex;
exports.serializeHeader = serializeHeader;
exports.binToRs = binToRs;
exports.ssToInternal = ssToInternal;
exports.newSS = newSS;

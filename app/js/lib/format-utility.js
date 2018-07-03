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
        var c = exponent(2, a);
        return Math.floor((c * (256 + b)) / 256);
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
        var c = exponent(2, a);
        var b = Math.floor((x * 256) / c) - 256;
        return [a, b];
    }
    return pair2sci(int2pair(x));
}

function pairTosci(x, b) {
    return (256 * x) + b;
}

function log2(x) {
    if (x === 1) {
        return 1;
    } else {
        return 1 + log2(Math.floor(x / 2))
    }
}

function exponent(a, b) {
    if (b === 0) {
        return 1;
    } else if (b === 1) {
        return a;
    } else if ((b % 2) === 0) {
        return exponent(a * a, Math.floor(b / 2));
    } else {
        return a * exponent(a, b - 1);
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

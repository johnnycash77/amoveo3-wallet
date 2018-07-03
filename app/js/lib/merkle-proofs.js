var network = require('../controller/network-controller.js');
var formatUtility = require('./format-utility.js');
var cryptoUtility = require('./crypto-utility.js');

function requestProof(topHeader, tree, key, callback) {
    var topHeaderHash = cryptoUtility.hash(formatUtility.serializeHeader(topHeader));
    network.send(["proof", btoa(tree), key, btoa(formatUtility.arrayToString(topHeaderHash))], function(error, proof) {
        if (error) {
            return callback(error, 0);
        } else {
            var val = 0;
            try {
                val = verify(topHeader, key, proof);
                return callback(undefined, val);
            } catch(err) {
                console.error(err);
                return callback(err, 0);
            }
        }
    });
}

function hashMember(hash, members) {
    for (var i = 0; i < 6; i++) {
        var h2 = members.slice(32*i, 32*(i+1));
        var b = checkEqual(hash, h2);
        if (b) {
            return true;
        }
    }
    return false;
}
function checkEqual(a, check_b) {
    for (var i = 0; i < a.length; i++) {
        if (a[i] !== check_b[i]) {
            return false
        }
    }
    return true;
}
function linkHash(l) {
    var h = [];
    for (var i = 1; i < l.length; i++) {
        var x = formatUtility.stringToArray(atob(l[i]));
        h = x.concat(h);
    }
    return cryptoUtility.hash(h);
}
function chainLinks(chain) {
    var out = true;
    for (var i = 1; i < chain.length; i++) {
        var parent = chain[i-1];
        var child = chain[i];
        var lh = linkHash(child);
        var chain_links_b = chainLinksArrayMember(parent, lh);
        if (chain_links_b == false) {
            return false;
        }
    }
    return true;
}
function chainLinksArrayMember(parent, h) {
    for (var i = 1; i < parent.length; i++) {
        var x = parent[i];
        var p = formatUtility.stringToArray(atob(x));
        var b = checkEqual(p, h);
        if (b) { return true; }
    }
    return false;
}
function leafHash(v, trie_key) {
    var serialized =
        serializeKey(v, trie_key).concat(
            serialize(v, trie_key));
    return cryptoUtility.hash(serialized);
}

function verify(topHeader, trie_key, x) {
    //x is {return tree_roots, tree_root, value, proof_chain}
    var tree_roots = formatUtility.stringToArray(atob(x[1]));
    var header_trees_hash = formatUtility.stringToArray(atob(topHeader[3]));
    var hash_tree_roots = cryptoUtility.hash(tree_roots);
    var check = checkEqual(header_trees_hash, hash_tree_roots);
    if (!(check)) {
        console.log("the hash of tree roots doesn't match the hash in the header.");
    } else {
        var tree_root = formatUtility.stringToArray(atob(x[2]));
        var check2 = hashMember(tree_root, tree_roots);
        if (!(check2)) {
            console.log("that tree root is not one of the valid tree roots.");
        } else {
            var chain = x[4].slice(1);
            chain.reverse();
            var h = linkHash(chain[0]);
            var check3 = checkEqual(h, tree_root);
            var check4 = chainLinks(chain);
            if (!(check3)) {
                console.log("the proof chain doesn't link to the tree root");
            } else if (!(check4)){
                console.log("the proof chain has a broken link");
            } else {
                var last = chain[chain.length - 1];
                var value = x[3];
                var lh = leafHash(value, trie_key);
                var check5 = chainLinksArrayMember(last, lh);
                if (check5) {
                    return value;
                    //we should learn to deal with proofs of empty data.
                } else {
                    console.log("the value doesn't match the proof");
                    console.log(x);
                    console.log(trie_key);
                    throw("bad");
                }
            }
        }
    }
}

function serializeKey(v, trie_key) {
    var t = v[0];
    if ( t === "gov" ) {
        return formatUtility.intToArray(trie_key, 8);
    } else if ( t === "acc" ) {
        var pubkey = formatUtility.stringToArray(atob(v[3]));
        return cryptoUtility.hash(pubkey);
    } else if ( t === "channel" ) {
        return cryptoUtility.hash(formatUtility.stringToArray(atob(v[1])));
    } else if (t === "oracle") {
        return cryptoUtility.hash(formatUtility.stringToArray(atob(v[1])));
    } else {
        throw("serialize trie bad trie type");
    }
}

function serialize(v, trie_key) {
    var t = v[0];
    if ( t == "gov" ) {
        var id = formatUtility.intToArray(v[1], 1);
        var value = formatUtility.intToArray(v[2], 2);
        var lock = formatUtility.intToArray(v[3], 1);
        var serialized = ([]).concat(id).concat(value).concat(lock);
        return serialized;
    } else if ( t == "acc" ) {
        var balance = formatUtility.intToArray(v[1], 6);
        var nonce = formatUtility.intToArray(v[2], 3);
        var pubkey = formatUtility.stringToArray(atob(v[3]));
        var bets = formatUtility.stringToArray(atob(v[5]));
        var serialized = ([]).concat(balance).concat(nonce).concat(pubkey).concat(bets);
        return serialized;
    } else if ( t == "channel" ) {
        var cid = formatUtility.stringToArray(atob(v[1]));
        var acc1 = formatUtility.stringToArray(atob(v[2]));
        var acc2 = formatUtility.stringToArray(atob(v[3]));
        var bal1 = formatUtility.intToArray(v[4], 6);
        var bal2 = formatUtility.intToArray(v[5], 6);
        var amount = formatUtility.intToArray(128, 1).concat(formatUtility.intToArray(v[6], 5));
        var nonce = formatUtility.intToArray(v[7], 4);
        var last_modified = formatUtility.intToArray(v[8], 4);
        var delay = formatUtility.intToArray(v[9], 4);
        var closed = formatUtility.intToArray(v[11], 1);
        var serialized = ([]).concat(cid).concat(bal1).concat(bal2).concat(amount).concat(nonce)
                        .concat(last_modified).concat(delay).concat(closed).concat(acc1).concat(acc2);
        return serialized;
    } else if (t == "oracle") {
        var id = formatUtility.stringToArray(atob(v[1]));
        var result = formatUtility.intToArray(v[2], 1);
        var type = formatUtility.intToArray(v[5], 1);
        var starts = formatUtility.intToArray(v[4], 4);
        var done_timer = formatUtility.intToArray(v[9], 4); //height_bits/8 bytes
        var governance = formatUtility.intToArray(v[10], 1); //one byte
        var governance_amount = formatUtility.intToArray(v[11], 1); //one byte
        var creator = formatUtility.stringToArray(atob(v[8])); //pubkey size
        var question = formatUtility.stringToArray(atob(v[3])); //32 bytes size
        var orders = formatUtility.stringToArray(atob(v[7])); //32 bytes
        var serialized = ([]).concat(id).concat(result).concat(type).concat(starts).concat(done_timer)
                        .concat(governance).concat(governance_amount).concat(creator).concat(question).concat(orders);
        return serialized;
    } else {
        console.log("cannot decode type ");
        console.log(t);
    }
}


exports.requestProof = requestProof;
exports.verify = verify;
exports.serialize = serialize;
exports.serializeKey = serializeKey;

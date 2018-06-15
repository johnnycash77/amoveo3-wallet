function chalang_main() {
    const word_size = 4294967296,
        hash_size = 12;
    const ops =
        {int_op: 0,
            binary_op: 2,
            print: 10,
            finish: 11, //because 'return' is reserved.
            nop: 12,
            fail: 13,
            drop: 20,
            dup: 21,
            swap: 22,
            tuck: 23,
            rot: 24,
            ddup: 25,
            tuckn: 26,
            pickn: 27,
            to_r: 30,
            from_r: 31,
            r_fetch: 32,
            hash_op: 40,
            verify_sig: 41,
            add: 50,
            subtract: 51,
            mul: 52,
            div: 53,
            gt: 54,
            lt: 55,
            pow: 56,
            rem: 57,
            eq: 58,
            caseif: 70,
            caseelse: 71,
            casethen: 72,
            bool_flip: 80,
            bool_and: 81,
            bool_or: 82,
            bool_xor: 83,
            bin_and: 84,
            bin_or: 85,
            bin_xor: 86,
            stack_size: 90,
            height: 94,
            gas: 96,
            ram: 97,
            many_vars: 100,
            many_funs: 101,
            define: 110,
            fun_end: 111,
            recurse: 112,
            call: 113,
            set: 120,
            fetch: 121,
            cons: 130,
            car: 131,
            empty_list: 132,
            append: 134,
            split: 135,
            reverse: 136,
            is_list: 137};
    function memory(x) {
        if (JSON.stringify(x) == "[]") {
            return 1;
        } else if (Number.isInteger(x)) {
            return 4;
        } else if (x[0] == "binary") {
            return x.length - 1;
        } else {
            var y = x.slice(1);
            return memory(x[0]) + memory(y);
        }
    }
    function underflow_check(d, min_size, op_name) {
        if (d.stack.length < min_size) {
            throw(JSON.stringify(["error", "stack underflow", op_name]));
        }
    }
    function exponential(b, a) {
        if (b == 0) { return 0; }
        else if (a == 0) { return 1; }
        var n = 1;
        while (a > 1) {
            if ((a % 2) == 0) {
                b = b*b;
                a = Math.floor(a / 2);
            } else {
                a = a - 1;
                n = n * b;
            }
        }
        return b * n;
    }
    function arithmetic_chalang(op, a, b) { //returns a list to concat with stack.
        var x;
        var d = {"stack":[]};
        var i = 0;
        if (op == ops.add) {
            op_print(d, i, "add op");
            x = a + b;
        } else if (op == ops.subtract) {
            op_print(d, i, "subtract op");
            x = b - a;
        } else if (op == ops.mul) {
            op_print(d, i, "mul op");
            x = b * a;
        } else if (op == ops.div) {
            op_print(d, i, "div op");
            x = Math.floor(b / a);
        } else if (op == ops.pow) {
            op_print(d, i, "pow op");
            x = exponential(b, a);
        } else if (op == ops.rem) {
            op_print(d, i, "rem op");
            x = b % a;
        } else if (op == ops.gt) {
            op_print(d, i, "gt op");
            if (b > a) {
                x = 1;
            } else {
                x = 0;
            }
        } else if (op == ops.lt) {
            op_print(d, i, "lt op");
            if (b < a) {
                x = 1;
            } else {
                x = 0;
            }
        }
        x = ((x % word_size) + word_size) % word_size;
        return [x];
    }
    function small_hash(l) {
        var h = hash(l);
        return h.slice(0, 12);
    }
    function split_if(opcode, code) {
        var a = 0;
        for (var i = 0; i < code.length; i++) {
            if ((code[i]) == ops.int_op) {
                i += 4;
            } else if (code[i] == ops.binary_op) {
                var h = array_to_int(code.slice(i+1, i+5));
                i += (4 + h);
            } else if ((code[i] == ops.caseif)){
                var k = count_till(code, i+1, ops.casethen);
                i += (k);
            } else if (opcode == code[i]) {
                return {"rest": code.slice(i),
                    "code": code.slice(0, i),
                    "n": i};
            }
        }
        throw("split if error");
    }
    function count_till(code, i, opcode) {
        for (var j = 0; (j + i) < code.length; j++) {
            if ((code[i+j]) == ops.int_op) {
                j += 4;
            } else if (opcode == code[i+j]) {
                return j;
            } else if (code[i+j] == ops.binary_op) {
                var h = array_to_int(code.slice(i+j+1, i+j+5));
                j += (4 + h);
            } else if ((code[i+j] == ops.caseif)){
                var k = count_till(code, i+j+1, ops.casethen);
                j += (k + 1);
            }
        }
        console.log(opcode);
        throw("count till reached end without finding goal");
    }
    function replace(old_character, new_code, binary) {
        for (var i = 0; i < binary.length; i++) {
            if (binary[i] == old_character) {
                var r2 = replace(old_character, new_code, binary.slice(i+1));
                return binary.slice(0,i).concat(new_code).concat(r2);
            } else if (binary[i] == ops.int_op) {
                i += 4;
            } else if (binary[i] == ops.binary_op) {
                var h = array_to_int(binary.slice(i+1, i+5));
                i += (4 + h);
            }
        }
        return binary;
    }
    var verbose = false;
    var stack_verbose = false;
    function op_print(d, i, x) {
        if (verbose) {
            console.log(("# ").concat(
                (i).toString()).concat(
                " ").concat(x));
        }
        if (stack_verbose) {
            console.log(JSON.stringify(d.stack));
        }
    }
    var op_code = {};
    op_code[ops.int_op] = function(i, code, d) {
        var int_array = code.slice(i+1, i+5);
        var new_int = array_to_int(int_array);
        d.stack = ([new_int]).concat(d.stack);
        return {i: i+4, d: d, g: 1, s: "int op", r: 1};
    };
    op_code[ops.binary_op] = function(i, code, d) {
        var int_array = code.slice(i+1, i+5);
        var new_int = array_to_int(int_array);
        var bin_array = code.slice(i+5, i+5+new_int);
        var bin1 = (["binary"]).concat(bin_array);
        d.stack = ([bin1]).concat(
            d.stack);
        return {i: i+4+new_int, d: d, g: new_int, s: "bin op", r: 1};
    }
    op_code[ops.caseif] = function(i, code, d) {
        var b = d.stack[0];
        var size_case1 = count_till(code, i + 1, ops.caseelse);
        if (b == 0) {
            i += (size_case1 + 1);
        }
        d.stack = d.stack.slice(1);
        return {i: i, d: d, g: 0, s: "if op"};
    }
    op_code[ops.caseelse] = function(i, code, d) {
        var skipped_size = count_till(code, i + 1, ops.casethen);
        i += (skipped_size + 0);
        return {i: i, d: d, g: 0, s: "else op"};
    }
    op_code[ops.casethen] = function(i, code, d) {
        // do nothing.
        return {i: i, d: d, g: 0, s: "then op"};
    }
    op_code[ops.call] = function(i, code, d) {
        //non-optimized function call.
        var code_hash=btoa(array_to_string(d.stack[0].slice(1)));
        definition = d.funs[code_hash];
        var s = definition.length;
        d.stack = d.stack.slice(1);
        d = run2(definition, d);
        return {i: i, d: d, g: (s + 10), s: "slow call op", r: (s - 1)};
    }
    op_code[ops.define] = function(i, code, d) {
        var skipped_size = count_till(code, i, ops.fun_end);
        var definition = code.slice(i+1, i+skipped_size);
        i += skipped_size;
        var hash_array = small_hash(definition);
        var b = btoa(array_to_string(hash_array));
        var definition2 = replace(ops.recurse, ([ops.binary_op]).concat(integer_to_array(hash_size, 4)).concat(hash_array), definition);
        d.funs[b] = definition2;
        var s = definition2.length + 4;
        var mf = d.many_funs + 1;
        if (mf > d.fun_limit) {
            throw("too many functions error");
        } else {
            d.many_funs = mf;
        }
        return {i: i, d: d, g: (s + 30), s: "define op", r: (s+s)};
    }
    op_code[ops.print] = function(i, code, d) {
        console.log(JSON.stringify(d.stack));
        return {i: i, d: d, g: 0, s: "print op"};
    };
    op_code[ops.drop] = function(i, code, d) {
        underflow_check(d, 1, "drop");
        var m = memory(d.stack[0]);
        d.stack = d.stack.slice(1);
        return {i: i, d: d, g: 1, s: "drop op", r: (-2 - m)};
    };
    op_code[ops.dup] = function(i, code, d) {
        underflow_check(d, 1, "dup");
        d.stack = ([d.stack[0]]).concat(d.stack);
        return {i: i, d: d, g: 1, s: "dup op", r: memory(d.stack[0])};
    };
    op_code[ops.swap] = function(i, code, d) {
        underflow_check(d, 2, "swap");
        d.stack = ([d.stack[1]]).concat(
            [d.stack[0]]).concat(
            d.stack.slice(2));
        return {i: i, d: d, g: 1, s: "swap op"};
    };
    op_code[ops.tuck] = function(i, code, d) {
        underflow_check(d, 3, "tuck");
        d.stack = ([d.stack[1]]).concat(
            [d.stack[2]]).concat(
            [d.stack[0]]).concat(
            d.stack.slice(3));
        return {i: i, d: d, g: 1, s: "tuck op"};
    }
    op_code[ops.rot] = function(i, code, d) {
        underflow_check(d, 3, "rot");
        d.stack = ([d.stack[2]]).concat(
            [d.stack[0]]).concat(
            [d.stack[1]]).concat(
            d.stack.slice(3));
        return {i: i, d: d, g: 1, s: "rot op"};
    }
    op_code[ops.ddup] = function(i, code, d) {
        underflow_check(d, 2, "ddup");
        d.stack = d.stack.slice(0, 2).concat(d.stack);
        return {i: i, d: d, g: 1, s: "ddup op", r: (memory(d.stack[0]) + memory(d.stack[1]))};
    }
    op_code[ops.tuckn] = function(i, code, d) {
        if (d.stack.length < 2) {
            throw("tuckn stack underflow");
        } else {
            var n = d.stack[0];
            underflow_check(d, 2+n,"tuckn");
            d.stack = d.stack.slice(2, 2+n).concat(
                [d.stack[1]]).concat(
                d.stack.slice(3+n));
        }
        return {i: i, d: d, g: 1, s: "tuckn op"};
    }
    op_code[ops.pickn] = function(i, code, d) {
        var n = d.stack[0];
        if (d.stack.length < (n + 1)) {
            throw("pickn stack underflow");
        } else {
            d.stack = ([d.stack[n]]).concat(
                d.stack.slice(1, 1+n)).concat(
                d.stack.slice(2+n));
        }
        return {i: i, d: d, g: 1, s: "pickn op"};
    }
    op_code[ops.to_r] = function(i, code, d) {
        underflow_check(d, 1, "to_r");
        d.alt = ([d.stack[0]]).concat(d.alt);
        d.stack = d.stack.slice(1);
        return {i: i, d: d, g: 1, s: ">r op"};
    }
    op_code[ops.from_r] = function(i, code, d) {
        if (d.alt.length < 1) {
            throw(">r alt stack underflow");
        } else {
            d.stack = ([d.alt[0]]).concat(d.stack);
            d.alt = d.alt.slice(1);
        }
        return {i: i, d: d, g: 1, s: "r> op"};
    }
    op_code[ops.r_fetch] = function(i, code, d) {
        if (d.alt.length < 1) {
            throw("alt stack underflow");
        } else {
            d.stack = ([d.alt[0]]).concat(d.stack);
        }
        return {i: i, d: d, g: 1, s: "r@ op"};
    }
    op_code[ops.hash_op] = function(i, code, d) {
        underflow_check(d, 1, "hash");
        d.stack = ([["binary"].concat(hash(d.stack[0].slice(1)))]).concat(
            d.stack.slice(1));
        return {i: i, d: d, g: 20, s: "hash op"};
    }
    op_code[ops.verify_sig] = function(i, code, d) {
        underflow_check(d, 3, "verify_sig");
        //data, sig, key
        var pub1 = d.stack[0].slice(1);//internal format puts "binary" at the front of each binary.
        var data1 = d.stack[1].slice(1);
        var sig1 = d.stack[2].slice(1);
        var ec = keys.ec(),
            temp_key = ec.keyFromPublic(toHex(array_to_string(pub1)), "hex");
        var sig2 = bin2rs(array_to_string(sig1));
        var b = temp_key.verify(hash(serialize(data1)), sig2, "hex")
        var c;
        if (b) { c = 1; }
        else { c = 0; }
        d.stack = ([c]).concat(
            d.stack.slice(3));
        return {i: i, d: d, g: 20, s: "verify_sig op"};
    }
    op_code[ops.eq] = function(i, code, d) {
        underflow_check(d, 2, "eq");
        if (JSON.stringify(d.stack[0]) == JSON.stringify(d.stack[1])) {
            d.stack = ([1]).concat(d.stack);
        } else {
            d.stack = ([0]).concat(d.stack);
        }
        return {i: i, d: d, g: 1, s: "eq op", r: 1};
    }
    op_code[ops.bool_flip] = function(i, code, d) {
        underflow_check(d, 1, "bool_flip");
        if (d.stack[0] == 0) {
            d.stack = ([1]).concat(d.stack.slice(1));
        } else {
            d.stack = ([0]).concat(d.stack.slice(1));
        }
        return {i: i, d: d, g: 1, s: "bool flip op"};
    }
    op_code[ops.bool_and] = function(i, code, d) {
        underflow_check(d, 2, "bool_and");
        if ((d.stack[0] == 0) || (d.stack[1] == 0)) {
            d.stack = ([0]).concat(d.stack.slice(2));
        } else {
            d.stack = ([1]).concat(d.stack.slice(2));
        }
        return {i: i, d: d, g: 1, s: "bool and op", r: (-2)};
    }
    op_code[ops.bool_or] = function(i, code, d) {
        underflow_check(d, 2, "bool_or");
        if ((d.stack[0] == 0) && (d.stack[1] == 0)) {
            d.stack = ([0]).concat(d.stack.slice(2));
        } else {
            d.stack = ([1]).concat(d.stack.slice(2));
        }
        return {i: i, d: d, g: 1, s: "bool or op", r: (-2)};
    }
    op_code[ops.bool_xor] = function(i, code, d) {
        underflow_check(d, 2, "bool_xor");
        var j = 0;
        if ((d.stack[0] == 0) && (d.stack[1] == 0)) {
            j = 0;
        } else if ((d.stack[0] == 0) || (d.stack[1] == 0)) {
            j=1;
        }
        d.stack = ([j]).concat(d.stack.slice(2));
        return {i: i, d: d, g: 1, s: "bool xor op", r: (-2)};
    }
    op_code[ops.stack_size] = function(i, code, d) {
        d.stack = ([d.stack.length]).concat(d.stack);
        return {i: i, d: d, g: 1, s: "stack_size op", r: 2};
    }
    op_code[ops.height] = function(i, code, d) {
        d.stack = ([d.state.height]).concat(d.stack);
        return {i: i, d: d, g: 1, s: "height op", r: 2};
    }
    op_code[ops.gas] = function(i, code, d) {
        d.stack = ([d.op_gas]).concat(d.stack);
        return {i: i, d: d, g: 1, s: "gas op", r: 2};
    }
    op_code[ops.many_vars] = function(i, code, d) {
        d.stack = ([d.vars.length]).concat(d.stack);
        return {i: i, d: d, g: 1, s: "many vars op", r: 2};
    }
    op_code[ops.many_funs] = function(i, code, d) {
        d.stack = (d.many_funs).concat(d.stack);
        return {i: i, d: d, g: 1, s: "many funs op", r: 2};
    }
    op_code[ops.fun_end] = function(i, code, d) {
        return {i: i, d: d, g: 1, s: "fun end op"};
    }
    op_code[ops.set] = function(i, code, d) {
        underflow_check(d, 2, "set");
        d.vars[d.stack[0]] = d.stack[1];
        d.stack = d.stack.slice(2);
        return {i: i, d: d, g: 1, s: "set op"};
    }
    op_code[ops.fetch] = function(i, code, d) {
        underflow_check(d, 1, "fetch");
        var val;
        var foo = d.vars[d.stack[0]];
        if (foo == undefined) {
            val = [];
        } else {
            val = foo;
        }
        d.stack = ([val]).concat(d.stack.slice(1));
        return {i: i, d: d, g: 1, s: "fetch op", r: (1+memory(val))};
    }
    op_code[ops.cons] = function(i, code, d) {
        underflow_check(d, 2, "cons");
        var l = ([d.stack[1]]).concat(
            d.stack[0]);
        d.stack = ([l]).concat(
            d.stack.slice(2));
        return {i: i, d: d, g: 1, s: "cons op", r: 1};
    }
    op_code[ops.car] = function(i, code, d) {
        underflow_check(d, 1, "car");
        if (!(Array.isArray(d.stack[0]))) {
            console.log(JSON.stringify(d.stack));
            throw("car op error");
        } else {
            d.stack = ([d.stack[0].slice(1)]).concat(
                ([d.stack[0][0]])).concat(
                d.stack.slice(1));
        }
        return {i: i, d: d, g: 1, s: "car op", r: (-1)};
    }
    op_code[ops.empty_list] = function(i, code, d) {
        d.stack = ([[]]).concat(d.stack);
        return {i: i, d: d, g: 1, s: "empty list op", r: 1};
    }
    op_code[ops.append] = function(i, code, d) {
        underflow_check(d, 2, "append");
        var a;
        if (("binary" == d.stack[0][0]) &&
            ("binary" == d.stack[1][0])) {
            a = (d.stack[1]).concat(d.stack[0].slice(1));
            if (a.length == 5) {
                a = array_to_int(a.slice(1));
            }
        } else if (!("binary" == d.stack[0][0]) &&
            !("binary" == d.stack[1][0])) {
            a = (d.stack[1]).concat(d.stack[0]);
        } else {
            return ["error", "cannot append binary and list together", "append"];
        }
        d.stack = ([a]).concat(
            d.stack.slice(2));
        return {i: i, d: d, g: 1, s: "append op", r: 1};
    }
    op_code[ops.split] = function(i, code, d) {
        underflow_check(d, 2, "split");
        if (!(Array.isArray(d.stack[1]))) {
            //treat the integer like a 4 byte binary
            var n = d.stack[0];
            var bin0 = integer_to_array(d.stack[1], 4);
            var bin1 = bin0.slice(0, n);
            var bin2 = bin0.slice(n, 4);
            d.stack = ([(["binary"]).concat(bin1)]).concat(
                ([(["binary"]).concat(bin2)]).concat(d.stack.slice(2)));

        } else if (!(d.stack[1][0] == "binary")) {
            throw("cannot split a list");
        } else {
            var n = d.stack[0];
            var bin1;
            if (n == 4) {
                bin1 = array_to_int(d.stack[1].slice(1, n+1));
            } else {
                bin1 = d.stack[1].slice(0, n+1);
            }
            var bin2;
            if ((d.stack[1].length - n - 1) == 4) {
                bin2 = array_to_int(d.stack[1].slice(n+1));
            } else {
                bin2 = (["binary"]).concat(d.stack[1].slice(n+1));
            }
            d.stack = ([bin1]).concat(
                [bin2]).concat(
                d.stack.slice(2));
        }
        return {i: i, d: d, g: 1, s: "split op", r: (-1)};
    };
    op_code[ops.reverse] = function(i, code, d) {
        underflow_check(d, 1, "reverse");
        if (d.stack[0][0] == "binary") {
            return ["error", "cannot reverse a binary", "reverse"];
        } else {
            d.stack = ([d.stack[0].reverse()]).concat(
                d.stack.slice(1));
        }
        return {i: i, d: d, g: d.stack[0].length, s: "reverse op"};
    };
    op_code[ops.is_list] = function(i, code, d) {
        var j;
        underflow_check(d, 1, "is_list");
        if (!(d.stack[0].is_array())) {
            j = 0;
        } else if (d.stack[0][0] == "binary") {
            j = 0;
        } else {
            j = 1;
        }
        d.stack = ([j]).concat(d.stack);
        return {i: i, d: d, g: 1, s: "is_list op", r: (-1)};
    };
    op_code[ops.nop] = function(i, code, d) {
        return {i: i, d: d, g: 0, s: "nop op"};
    };
    op_code[ops.fail] = function(i, code, d) {
        op_print(d, i, "fail op");
        op_print(d, i, JSON.stringify(d.stack));
        throw("fail error");
    };
    function run2(code, d) {
        console.log("run 2");
        for (var i = 0; i<code.length; i++) {
            //console.log("run cycle");
            //console.log(i);
            if (d.ram_current > d.ram_most) {
                d.ram_most = d.ram_current;
            }
            if (d.op_gas < 0) {
                console.log(JSON.stringify(d));
                console.log("out of time");
                return ["error", "out of time"];
            } else if (d.ram_current > d.ram_limit) {
                console.log("out of space. limit was: ");
                console.log(d.ram_limit);
                return ["error", "out of space"];
            } else if ((code[i] == ops.call) && (code[i+1] == ops.fun_end)){
                //tail call optimized function call
                //console.log("tail call optimized function call op");
                //console.log(d.stack[0]);
                definition = d.funs[d.stack[0]];
                var s = definition.length;
                d.op_gas = d.op_gas - s - 10;
                d.ram_current = d.ram_current + s - 1;
                d.stack = d.stack.slice(1);
                code = definition.concat(code.slice(i+1));
                i = 0;
                op_print(d, i, "optimized call op");
                //return run2(definition.concat(rest), d);
            } else if (code[i] == ops.finish) {
                op_print(d, i, "return op");
                return d;
            } else if ((!(code[i] < ops.add)) && (code[i] < ops.eq)) {
                //console.log("arithmetic");
                underflow_check(d, 2, "arithmetic");
                d.op_gas = d.op_gas - 1;
                d.ram_current = d.ram_current - 2;
                var a = arithmetic_chalang(code[i], d.stack[0], d.stack[1]);
                d.stack = a.concat(d.stack.slice(2));
                op_print(d, i, ("math ").concat((code[i]).toString()));
            } else {
                var y = op_code[code[i]](i, code, d);
                i = y.i;
                d = y.d;
                d.op_gas -= y.g;
                if (!(y.r == undefined)) {
                    d.ram_current += y.r;
                }
                op_print(d, i, y.s);
            }
        }
        return d;
    }
    function is_balanced_f(code) {
        var x = 0;
        for (var i = 0; i<code.length; i++) {
            if (code[i] == ops.int_op) {
                i += 4;
            } else if (code[i] == ops.binary_op) {
                n = array_to_int(code.slice(i+1, i+5));
                i += (4 + n);
            } else if ((code[i] == ops.define) && (x == 0)){
                x = 1;
            } else if ((code[i] == ops.fun_end) && (x == 1)) {
                x = 0;
            } else if ((code[i] == ops.define) || (code[i] == ops.fun_end)) {
                return false;
            }
        }
        return true;
    }
    function run5(code, d) {
        //console.log("run5 ");
        //console.log(JSON.stringify(code));
        if (is_balanced_f(code)) {
            return run2(code, d);
        } else {
            throw("misformed function. : ; ");
        }
    }
    //these are some compiled contracts from chalang/src/forth/. the chalang repository.
    //each of these test contracts should return a stack like this: [1]
    var hashlock_contract =
        [2,0,0,0,32,169,243,219,139,234,91,46,239,146,55,229,72,9,221,164,63,12,33,143,128,208,211,40,163,63,91,76,255,255,51,72,230,40,10,
            2,0,0,0,32,67,235,55,16,65,154,38,188,176,22,150,20,54,17,182,74,255,87,231,241,254,236,126,177,29,146,149,153,232,73,80,204,
            ops.print,ops.eq,ops.swap,ops.drop,ops.swap,ops.drop];

    var verify_signature_contract =
        [2,0,0,0,71,48,69,2,32,112,134,203,180,124,166,163,247,
            94,210,211,101,253,157,198,109,165,100,230,213,193,22,
            236,82,240,187,161,163,143,174,252,77,2,33,0,252,160,42,
            76,157,218,69,96,18,53,9,86,91,223,194,87,4,167,121,112,
            117,103,139,226,37,133,252,41,247,43,137,118, //this is the signature.
            2,0,0,0,3,1,2,3, //this is the data
            2,0,0,0,65,4,133,89,134,205,122,130,218,16,254,
            229,12,186,57,121,105,43,173,164,137,130,226,246,188,49,
            236,32,10,247,161,232,193,46,14,58,3,190,212,42,97,158,
            69,121,135,20,133,143,208,46,58,66,6,181,227,170,244,
            237,22,35,120,150,45,13,134,58, //this is the pubkey
            ops.print,ops.verify_sig];
    var function_contract =
        [ops.define,ops.dup,ops.mul,ops.fun_end, //square
            ops.define, //quad
            2,0,0,0,12,239,24,7,129,222,179,141,148,74,245,17,98,
            ops.call, //square
            2,0,0,0,12,239,24,7,129,222,179,141,148,74,245,17,98,
            ops.call, //square
            ops.fun_end,
            0,0,0,0,2,
            2,0,0,0,12,248,21,87,89,106,92,199,6,67,69,197,184,
            ops.call, //quad
            0,0,0,0,16,
            ops.eq,ops.swap,ops.drop,ops.swap,ops.drop];
    var variable_contract =
        [0,0,0,0,12,
            0,0,0,0,1,
            ops.set,
            0,0,0,0,11,
            0,0,0,0,2,
            ops.set,
            0,0,0,0,1,
            ops.fetch,
            ops.print,
            0,0,0,0,1,
            ops.fetch,
            0,0,0,0,10,
            0,0,0,0,1,
            ops.set,
            0,0,0,0,1,
            ops.fetch,
            0,0,0,0,2,
            ops.fetch,
            0,0,0,0,11,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            0,0,0,0,10,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            0,0,0,0,12,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            0,0,0,0,12,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            ops.from_r,ops.from_r,ops.from_r,ops.from_r,
            ops.bool_and,ops.bool_and,ops.bool_and
        ];
    var map_contract =
        [ops.define,ops.dup,ops.mul,ops.fun_end, //square
            ops.define,//map2
            ops.car,ops.swap,
            0,0,0,0,1,
            ops.fetch,ops.call,ops.rot,ops.cons,ops.swap,
            ops.empty_list,ops.eq,ops.caseif,
            ops.drop,ops.drop,ops.reverse,
            ops.caseelse,
            ops.drop,ops.recurse,ops.call,
            ops.casethen,
            ops.fun_end,
            ops.define, //map
            0,0,0,0,1,
            ops.set,ops.empty_list,ops.swap,
            ops.binary_op,0,0,0,12,
            71,192,142,101,22,36,27,88,17,55,152,169,
            ops.call,
            ops.fun_end,
            ops.empty_list,
            0,0,0,0,5,
            ops.swap,ops.cons,
            0,0,0,0,6,ops.swap,ops.cons,
            0,0,0,0,7,
            ops.swap,ops.cons,ops.reverse,
            2,0,0,0,12,239,24,7,129,222,179,141,148,74,245,17,98,
            2,0,0,0,12,53,181,176,16,58,242,45,201,243,134,253,139,
            ops.call,
            ops.empty_list,
            0,0,0,0,25,
            ops.swap,ops.cons,
            0,0,0,0,36,
            ops.swap,ops.cons,
            0,0,0,0,49,
            ops.swap,ops.cons,ops.reverse, ops.print,
            ops.eq,ops.to_r,ops.drop,ops.drop,ops.from_r];
    var recursion_contract =
        [ops.define,
            0,0,0,0,0,ops.eq,ops.bool_flip,
            ops.caseif,
            ops.drop,
            0,0,0,0,1,
            ops.subtract,
            0,0,0,0,0,
            ops.swap,ops.recurse,
            ops.call,
            ops.caseelse,
            20,20,
            ops.casethen,
            ops.fun_end,
            0,0,0,0,5,
            2,0,0,0,12,95,171,14,87,107,52,162,208,56,196,48,154,
            ops.call,
            0,0,0,0,0,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            0,0,0,0,0,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            0,0,0,0,0,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            0,0,0,0,0,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            0,0,0,0,0,
            ops.eq,ops.to_r,ops.drop,ops.drop,
            ops.from_r,ops.from_r,ops.from_r,ops.from_r,ops.from_r,
            ops.bool_and,ops.bool_and,ops.bool_and,ops.bool_and
        ];
    var case_contract = [
        0,0,0,0,0,
        ops.caseif,
        0,0,0,0,3,
        ops.caseif, 0,0,0,0,7,
        ops.caseelse, 0,0,0,0,8, ops.casethen,
        ops.caseif, ops.caseelse, 0,0,0,0,0,
        ops.caseif, ops.caseelse, ops.casethen,
        ops.casethen,
        ops.caseelse,
        0,0,0,0,0,
        ops.caseif,
        0,0,0,0,3,
        ops.caseelse,
        0,0,0,0,4,
        ops.casethen,
        0,0,0,0,27,
        ops.casethen
    ];
    var split_append_contract = [
        //should return <<2,3,1>>
        ops.binary_op, 0,0,0,3, 1,2,3,
        ops.int_op, 0,0,0,1,
        ops.split, ops.append
    ];
    function chalang_test() {
        var d = data_maker(1000, 1000, 50, 1000, [], [], new_state(0, 0));
        console.log("chalang test");
        //var x = run5(verify_signature_contract, d);
        //var x = run5(case_contract, d);
        //var x = run5(hashlock_contract, d);
        //var x = run5(split_append_contract, d);
        //var x = run5(recursion_contract, d);
        var x = run5(variable_contract, d);
        //var x = run5(function_contract, d);
        //var x = run5(map_contract, d);
        console.log(JSON.stringify(x.stack));
        return x.stack;
    }
    function new_state(height, slash) {
        return{"name": "state", "height": height, "slash": slash};
    }
    function data_maker(op_gas, ram_gas, many_vs, many_funs, script_sig, code, state) {
        var arr = [];
        arr.length = many_vs;
        return {"name": "d", "op_gas":op_gas, "stack": [], "alt": [], "ram_most": 0, "ram_limit":ram_gas, "vars": arr, "funs":{}, "many_funs": 0, "fun_limit":many_funs, "ram_current":(script_sig.length + code.length), "state":state};
    }
    return {run5: run5,
        test: chalang_test,
        ops: function() {return(ops);},
        new_state: new_state,
        data_maker: data_maker};
}

var chalang_object = chalang_main();
//var foo = chalang_object.test();//this is how you make the test run.
//console.log(JSON.stringify(foo));


const ops = chalang_object.ops();

function prove_facts(facts, callback) {
    if (JSON.stringify(facts) === JSON.stringify([])) {
        return callback([ops.empty_list]);
    }
    return prove_facts2(facts, 1, [ops.empty_list], callback);
}

var tree2id = {accounts: 1, channels: 2, existence: 3, burn: 4, oracles: 5, governance: 6};

function prove_facts2(facts, i, r, callback) {
    var ops = chalang_object.ops();
    if (i === facts.length) {
        r.concat([ops.reverse]); // converts a , to a ]
        return callback(r);
    }
    var tree = facts[i][0];
    var key = facts[i][1];

    merkle.request_proof(tree, key, function (value) {
        //var value = merkle.verify(key, proof);
        //we are making chalang like this:
        //[ int id, key, binary size serialized_data ]
        // '[', ']', and ',' are macros for making a list.
        var id = tree2id[tree];
        r = r.concat([ops.empty_list]); // [
        r = r.concat([0]).concat(integer_to_array(id, 4));
        r = r.concat([ops.swap, ops.cons]); // ,
        if (Number.isInteger(key)) {
            r = r.concat([0]);
            r = r.concat(integer_to_array(key, 4));
        } else {
            key = string_to_array(atob(key));
            r = r.concat([2]);
            r = r.concat(integer_to_array(key.length, 4));
            r = r.concat(key);
        }
        r = r.concat([ops.swap, ops.cons]); // ,
        var serialized_data = merkle.serialize(value, key);//this is the serialized version of the thing who's existence we are proving. make it from value.
        var s = serialized_data.length;
        r = r.concat([2]).concat(integer_to_array(s, 4));
        r = r.concat(serialized_data);
        r = r.concat([ops.swap, ops.cons, ops.reverse]); // ]
        r = r.concat([ops.swap, ops.cons]); // ,
        return prove_facts2(facts, i + 1, r, callback);
    });
}

function spk_run(mode, ss0, spk0, height, slash, fun_limit, var_limit, callback) {//mode unused
    var spk = JSON.parse(JSON.stringify(spk0));
    var ss = JSON.parse(JSON.stringify(ss0));
    var state = chalang_object.new_state(height, slash);

    var ret;
    if (!(ss.length === (spk[3].length - 1))) { //spk[3] == bets is formated with a -6 in front for packer.erl
        console.log(JSON.stringify(ss));
        console.log(JSON.stringify(spk));
        throw("ss and bets need to be the same length");
    }
    spk_run2(ss, spk[3], spk[5], spk[4], fun_limit, var_limit, state, spk[9], spk[8], 0, 1, function (ret) {
        return callback(ret);
    });
}

function spk_run2(ss, bets, opgas, ramgas, funs, vars, state, delay, nonce, amount, i, callback) {
    if (i > (ss.length)) {
        return callback({"amount": amount, "nonce": nonce, "delay": delay});//, "opgas": opgas});
    }
    spk_run3(ss[i - 1], bets[i], opgas, ramgas, funs, vars, state, function (run_object) {
        if (!(Number.isInteger(run_object.nonce))) {
            console.log(JSON.stringify(run_object.nonce));
            throw("nonce should be an integer");
        }
        return spk_run2(ss, bets, opgas, ramgas, funs, vars, state, Math.max(delay, run_object.delay),
            nonce + run_object.nonce, amount + run_object.amount, i + 1, callback);
    });
}

function spk_run3(ss, bet, opgas, ramgas, funs, vars, state, callback) {
    console.log("spk run 3 ss is ");
    console.log(JSON.stringify(ss));
    //{"code":[2,0,0,0,32,175,20,235,211,57,38,228,113,95,134,170,11,54,51,95,61,134,20,89,119,227,76,113,166,247,85,51,203,81,88,170,5],"prove":[-6,-6],"meta":[-6,-6]} //prove should only have one -6
    var script_sig = ss.code;
    if (!(chalang_none_of(script_sig))) {
        throw("error: return op in the script sig");
    }
    console.log("spk run3");
    console.log(JSON.stringify(ss.prove));
    prove_facts(ss.prove, function (f) {
        var c = string_to_array(atob(bet[1]));
        var code = f.concat(c);
        var data = chalang_object.data_maker(opgas, ramgas, vars, funs, script_sig, code, state);
        var data2 = chalang_object.run5(script_sig, data);
        var data3 = chalang_object.run5(code, data2);
        //console.log("just ran contract, stack returned as ");
        //console.log(JSON.stringify(data3.stack));
        //console.log("bet was ");
        //console.log(JSON.stringify(bet));
        var amount = data3.stack[0] | 0;//This should be a signed integer, but for some reason the integer is being stuck into a 32 byte unsigned value, so -2000 becomes 4294965296
        var nonce = data3.stack[1];
        var delay = data3.stack[2];
        var cgran = 10000; //constants.erl
        console.log(amount);
        if ((amount > cgran) || (amount < -cgran)) {
            throw("you can't spend money you don't have in the channel.");
        }
        //var a3 = Math.floor(amount * bet.amount / cgran);
        var a3 = Math.floor(amount * bet[2] / cgran);
        return callback({"amount": a3, "nonce": nonce, "delay": delay, "opgas": data3.opgas});
    });
}

function spk_force_update(spk0, ssold0, ssnew0, fun_limit, var_limit, callback) {
    var spk = JSON.parse(JSON.stringify(spk0));
    var ssold = JSON.parse(JSON.stringify(ssold0));
    if (ssold[0] === -6) {
        ssold = ssold.slice(1);
    }
    var ssnew = JSON.parse(JSON.stringify(ssnew0));
    console.log("force update");
    console.log(JSON.stringify(ssold));
    console.log(JSON.stringify(ssnew));//double -6
    var height = headers_object.top()[1];
    var ret;
    spk_run("fast", ssold, spk, height, 0, fun_limit, var_limit, function (ran1) {
        var nonceOld = ran1.nonce;
        spk_run("fast", ssnew, spk, height, 0, fun_limit, var_limit, function (ran2) {
            var nonceNew = ran2.nonce;
            if (!(nonceNew < nonceOld)) {
                spk_force_update2(spk[3], ssnew, height, function (updated) {
                    spk[3] = updated.new_bets;
                    spk[7] += updated.amount;
                    spk[8] += updated.nonce;
                    console.log("force udpate final ss is ");
                    console.log(JSON.stringify(updated.newss));//failing to remove the ss.
                    console.log("force udpate final spk is ");
                    console.log(JSON.stringify(spk));//succeeds to remove the bet.
                    console.log("updated is ");
                    console.log(JSON.stringify(updated));
                    return callback({"spk": spk, "ss": updated.newss});
                });
            } else {
                console.log(JSON.stringify([nonceNew, nonceOld]));
                console.log(JSON.stringify([ssnew, ssold]));
                console.log("spk force update had nothing to do.");
                return callback(false);
            }
        });
    });
}

function chalang_none_of(c) {
    console.log("none of");
    var n;
    for (var i = 0; i < c.length; i++) {
        if (c[i] == ops.finish) {
            return false;
        } else if (c[i] == ops.int_op) {
            i += 4
        } else if (c[i] == ops.binary_op) {
            n = array_to_int(c.slice(i + 1, i + 5));
            i += (4 + n);
        }
    }
    return true;
}

function spk_force_update2(bets, ss, height, callback) {
    var amount = 0;
    var nonce = 0;
    var new_bets = JSON.parse(JSON.stringify(bets));
    var newss = JSON.parse(JSON.stringify(ss));
    var fun_limit = 1000;//config
    var var_limit = 10000;
    var bet_gas_limit = 100000;//same as bet_unlock2
    var cgran = 10000; //constants.erl
    console.log("spk force update 2 compare bets and ss");
    console.log(JSON.stringify(ss));//no -6 to start
    console.log(JSON.stringify(bets));//starts with -6
    spk_force_update22(bets, ss, height, amount, nonce, new_bets, newss, fun_limit, var_limit, bet_gas_limit, bets.length - 1, callback);
}

function spk_force_update22(bets, ss, height, amount, nonce, new_bets, newss, fun_limit, var_limit, bet_gas_limit, i, callback) {
    //console.log("spke force update 22");
    if (i < 1) {
        return callback({"new_bets": new_bets, "newss": newss, "amount": amount, "nonce": nonce});
    }
    var b = chalang_none_of(ss[i - 1].code);//ss.code
    if (!(b)) {
        throw("you can't put return op into the ss");
    }
    var state = chalang_object.new_state(height, 0);
    prove_facts(ss[i - 1].prove, function (f) { //PROBLEM HERE
        //var code = f.concat(bets[i].code);
        var code = f.concat(string_to_array(atob(bets[i][1])));
        console.log("spk force update 22. code is ");
        console.log(JSON.stringify(code));
        var data = chalang_object.data_maker(bet_gas_limit, bet_gas_limit, var_limit, fun_limit, ss[i - 1].code, code, state);
        var data2 = chalang_object.run5(ss[i - 1].code, data);
        var data3 = chalang_object.run5(code, data2);
        var s = data3.stack;
        var cgran = 10000; //constants.erl
        console.log("ran code stack is ");
        console.log(JSON.stringify(s));
        if (!(s[2] > 0)) { //if the delay is long, then don't close the trade.
            console.log("short delay, close the trade.");
            if (s[0] > cgran) {
                throw("you can't spend money that you don't have");
            }
            console.log("update amount");
            console.log(JSON.stringify([s[0], bets[i][2], cgran]));
            amount += Math.floor(s[0] * bets[i][2] / cgran);
            nonce += s[1];
            new_bets = new_bets.slice(0, i).concat(new_bets.slice(i + 1, new_bets.length));
            newss = newss.slice(0, i - 1).concat(newss.slice(i, newss.length));
        } else {
            console.log("long delay, do not close the trade.");
        }
        return spk_force_update22(bets, ss, height, amount, nonce, new_bets, newss, fun_limit, var_limit, bet_gas_limit, i - 1, callback);
    });
}

function tree_number_to_value(t) {
    if (t < 101) {
        return t;
    } else {
        var top = 101;
        var bottom = 100;
        var x = tree_number_det_power(10000, top, bottom, t);
        return Math.floor(x / 100);
    }
}

function tree_number_det_power(base, top, bottom, t) {
    if (t == 1) {
        return Math.floor((base * top) / bottom);
    }
    var r = Math.floor(t % 2);
    if (r == 1) {
        var base2 = Math.floor((base * top) / bottom);
        return tree_number_det_power(base2, top, bottom, t - 1);
    } else if (r == 0) {
        var top2 = Math.floor((top * top) / bottom);
        return tree_number_det_power(base, top2, bottom,
            Math.floor(t / 2));
    }
}

function ss_to_internal(ess) {
    var ss = [];
    for (var i = 1; i < ess.length; i++) {
        if (JSON.stringify(ess[i][2]) === JSON.stringify([-6, -6])) {
            ess[i][2] = [-6];
            ess[i][3] = [-6];
        }
        ss = ss.concat([new_ss(string_to_array(atob(ess[i][1])), ess[i][2], ess[i][3])]);
    }

    console.log("ss to internal ss is ");
    console.log(JSON.stringify(ss));
    return ss;
}

function channel_feeder_they_simplify(from, themspk, cd, callback) {
    cd0 = channels_object.read(from);
    //true = cd0.live; //verify this is true
    //true = cd.live; //verify this is true
    var spkme = cd0.me;
    var ssme = cd0.ssme;
    //console.log("ssme is ");
    //console.log(JSON.stringify(ssme));
    //verify that they signed themspk
    var newspk = themspk[1];
    //console.log("spkme is ");
    var newspk2 = cd[1];
    if (!(JSON.stringify(newspk) == JSON.stringify(newspk2))) {
        console.log(JSON.stringify(newspk));
        console.log(JSON.stringify(newspk2));
        throw("spks they gave us do not match");
    }
    var ss = ss_to_internal(cd[3]);
    var ss4 = ss_to_internal(cd[4]);//this one looks weird
    merkle.request_proof("governance", 14, function (tree_fun_limit) {
        var fun_limit = tree_number_to_value(tree_fun_limit[2]);
        merkle.request_proof("governance", 15, function (tree_var_limit) {
            var var_limit = tree_number_to_value(tree_var_limit[2]);
            spk_force_update(spkme, ssme, ss4, fun_limit, var_limit, function (b2) {
                var cid = cd[7];
                var expiration = cd[7];
                console.log("are we able to force update?");
                console.log(JSON.stringify([b2, {"spk": newspk, "ss": ss}]));
                if (JSON.stringify(b2) == JSON.stringify({"spk": newspk, "ss": ss})) {
                    var ret = keys.sign(newspk);
                    var newcd = channels_object.new_cd(newspk, themspk, ss, ss, expiration, cid);
                    channels_object.write(from, newcd);
                    ss4_text = document.createElement("h8");
                    ss4_text.innerHTML = JSON.stringify(ss4);
                    document.body.append(ss4_text);
                    //append ss4 to the document somewhere.
                    return callback(ret);
                } else {
                    is_improvement(spkme, ssme, newspk, ss, fun_limit, var_limit, function (b3) {//maybe ss should be ss4?
                        if (b3) {
                            //If they give free stuff, then accept.
                            ret = keys.sign(newspk);
                            var newcd = channels_object.new_cd(newspk, themspk, ss, ss, expiration, cid);
                            channels_object.write(from, newcd);
                            return callback(ret);
                        } else {
                            //console.log("channel feeder they simplify had nothing to do");
                            //return callback(false);
                            //this part is only used for lightning.
                            channel_feeder_simplify_helper(from, ss4, function (sh) {
                                if (sh.ss == undefined) {
                                    throw "error, should be defined.";
                                }
                                var ss5 = sh.ss;
                                var ret = sh.spk;
                                var spk = themspk[1];
                                var spk2 = ret[1];
                                if (!(JSON.stringify(spk) == JSON.stringify(spk2))) {
                                    console.log(JSON.stringify(spk));
                                    console.log(JSON.stringify(spk2));//still has the bet
                                    console.log("spks do not match");
                                } else {
                                    var data = channels_object.new_cd(spk, themspk, ss5, ss5, expiration, cid);
                                    channels_object.write(from, data);
                                    return callback(ret);
                                }
                            });
                        }
                    });
                }
            });
        });
    });
}

function channel_feeder_simplify_helper(from, ss, callback) {
    var cd = channels_object.read(from);
    var spk = cd.me;
    var bet_unlock_object = spk_bet_unlock(spk, ss, function (bet_unlock_object) {

        var ret = keys.sign(bet_unlock_object.spk);
        return callback({ss: bet_unlock_object.newss, spk: ret});
    });
}

function is_improvement(old_spk, old_ss, new_spk, new_ss, fun_limit, var_limit, callback) {
    //get height
    //check that space gas and time limit are below or equal to what is in the config file.
    var height = headers_object.top()[1];
    if (new_spk[4] > 100000) {//space gas
        console.log("this contract uses too much space.");
        return callback(false);
    }
    if (new_spk[5] > 100000) {//time gas
        console.log("this contract uses too much time");
        return callback(false);
    }
    spk_run("fast", new_ss, new_spk, height, 0, fun_limit, var_limit, function (run2) {
        var nonce2 = run2.nonce;
        var delay2 = run2.delay;
        spk_run("fast", old_ss, old_spk, height, 0, fun_limit, var_limit, function (run1) {
            var nonce1 = run1.nonce;
            var delay1 = run1.delay;
            if (((nonce1 == nonce2) && (delay1 == 0)) && (delay2 == 0)) {

            } else if (!(nonce2 > nonce1)) {
                console.log(JSON.stringify([new_ss, old_ss]));
                console.log(JSON.stringify([nonce2, nonce1]));
                console.log(JSON.stringify([delay2, delay1]));
                console.log("the new spk can't produce a lower nonce than the old.");
                return callback(false);
            }
            var old_bets = old_spk[3];
            var old_amount = old_spk[7];
            old_spk[3] = new_spk[3];
            old_spk[5] = new_spk[5];//time gas tg;
            old_spk[4] = new_spk[4];//space gassg;
            old_spk[7] = new_spk[7];
            old_spk[8] = new_spk[8];
            if (!(JSON.stringify(old_spk) == JSON.stringify(new_spk))) {
                console.log("spk was changed in unexpected ways");
                console.log(JSON.stringify(old_spk));
                console.log(JSON.stringify(new_spk));
                return callback(false);
            }
            var cid = new_spk[6];
            var ret = false;
            merkle.request_proof("channels", cid, function (channel) {
                //variable_public_get(["proof", btoa("channels"), cid, btoa(array_to_string(top_hash))], function(proof) {
                //var channel = merkle.verify(cid, proof);
                var acc1 = channel[2]
                var acc2 = channel[3]
                var profit;
                if (keys.pub() == acc1) {
                    profit = new_spk[7] - old_amount;
                } else {
                    profit = old_amount - new_spk[7];
                }
                var bets2 = new_spk[3];
                if ((JSON.stringify(old_bets) == JSON.stringify(bets2)) && (profit > 0)) {
                    //if they give us money for no reason, then accept.
                    console.log("the server sent us money.");
                    return callback(true);
                }
                var many_new_bets = new_spk[3].length - old_bets.length;
                if ((!(profit < 0)) && //costs nothing
                    (many_new_bets > 0)) { //increases number of bets
                    //if we have the same or greater amount of money, and they make a bet that possibly gives us more money, then accept it.
                    //var t = bets2.slice(1);
                    var t = [-6].concat(bets2.slice(1 + many_new_bets));
                    if (!(JSON.stringify(t) == JSON.stringify(old_bets))) {
                        console.log("t is ");
                        console.log(JSON.stringify(t));
                        console.log("old bets");
                        console.log(JSON.stringify(old_bets));
                        console.log("update improperly formatted");
                        return callback(false);
                    }
                    for (var i = 1; i < many_new_bets + 1; i++) {
                        var new_bet = bets2[i];
                        var betAmount = new_bet[2];
                        var potentialGain;
                        if (keys.pub() == acc1) {
                            potentialGain = -betAmount;
                        } else if (keys.pub() == acc2) {
                            potentialGain = betAmount;
                        } else {
                            console.log("error, this spk isn't for your pubkey");
                            return callback(false);
                        }
                        if (!(potentialGain > 0)) {
                            console.log(potentialGain);
                            console.log(betAmount);
                            console.log(JSON.stringify(new_bet));
                            console.log(JSON.stringify(bets2));
                            console.log("error, this could make us lose money.");
                            return callback(false);
                        }
                    }
                    var obligations1 = spk_obligations(1, bets2);
                    var obligations2 = spk_obligations(2, bets2);
                    var channelbal1 = channel[4];
                    var channelbal2 = channel[5];
                    if (obligations1 > channelbal1) {
                        console.log("acc1 doesn't have enough money in the channel to make that bet");
                        return callback(false);
                    }
                    if (obligations2 > channelbal2) {
                        console.log("acc2 doesn't have enough money in the channel to make that bet");
                        return callback(false);
                    }
                    console.log("successfully updated channel. They made a contract which costs nothing, and might give us money.");
                    return callback(true);
                }
                console.log("this contract that the server offers might cost us something, so we refuse.");
                return callback(false);
            });
        });
    });
}

function spk_obligations(n, bets) {
    if (n == 1) {
        return spk_obligations1(bets);
    } else if (n == 2) {
        return spk_obligations2(bets);
    }
}

function spk_obligations1(bets) {
    var c = 0;
    for (i = 1; i < bets.length; i++) {
        var b = bets[i][2];
        if (b > 0) {
            c += b;
        }
    }
    return c;
}

function spk_obligations2(bets) {
    var c = 0;
    for (i = 1; i < bets.length; i++) {
        var b = bets[i][2];
        if (b < 0) {
            c -= b;
        }
    }
    return c;
}

function api_decrypt_msgs(ms) {//list ms starts with -6
    console.log("msgs to decrypt");
    console.log(JSON.stringify(ms));
    for (var i = 1; i < ms.length; i++) {
        var emsg = ms[i];
        console.log("about to decrypt this ");
        console.log(JSON.stringify(emsg));
        var dec = keys.decrypt(emsg);
        console.log("decrypted this ");
        console.log(JSON.stringify(dec));
        var secret = dec[1];
        var code = dec[2];
        var amount = dec[3];
        secrets_object.add(code, secret, amount);
    }
    return true;
}

function pull_channel_state(publicKey, callback) {
    variable_public_get(["pubkey"], function (server_pubkey) {
        variable_public_get(["spk", publicKey], function (spk_return) {
            var cd = spk_return[1];
            var them_spk = spk_return[2];
            console.log(JSON.stringify(them_spk));

            var spk = them_spk[1];
            var ss = ss_to_internal(cd[4]);
            var expiration = cd[7];
            var cid = spk[6];
            var NewCD = new_cd(spk, them_spk, ss, ss, expiration, cid);

            console.log(JSON.stringify(them_spk));
            console.log(JSON.stringify(NewCD));

            channel_feeder_they_simplify(server_pubkey, them_spk, cd, function (ret) {
                if (!(ret == false)) {
                    setTimeout(function () {
                            variable_public_get(["channel_sync", keys.pub(), ret], function (foo) {
                            });
                    }, 0);
                    setTimeout(function () {
                        api_decrypt_msgs(cd[5]);
                        api_bet_unlock(server_pubkey, function (x) {
                            var cd2 = channels_object.read(server_pubkey);
                            var ret2 = keys.sign(cd2.me);
                            setTimeout(function () {
                                variable_public_get(["channel_sync", publicKey, ret2], function (foo) {
                                    i = 0;
                                });
                            }, 2000);

                            return callback();
                        });
                    }, 2000);
                } else {
                    console.log("channel feeder they simplify failed.");
                }
            });
        });
    });
}

function new_cd(me, them, ssme, ssthem, expiration, cid) {
    return {"me": me, "them": them, "ssme": ssme, "ssthem": ssthem, "cid":cid, "expiration": expiration};
}

function api_bet_unlock(server_pubkey, callback) {
    //The javascript version can be much simpler than the erlang version, because each secret is only for one smart contract for us. We don't have to search for other contracts that use it.

    channel_feeder_bets_unlock(server_pubkey, function (secrets_junk) {
        secrets = secrets_junk.secrets;
        // spk = secrets_junk.spk;
        teach_secrets(secrets, 0, function () {
            variable_public_get(["spk", keys.pub()], function (spk_data) {
                console.log("should sart with -6");
                console.log(JSON.stringify(spk_data));
                var them_spk = spk_data[2];
                var x = channel_feeder_update_to_me(them_spk, server_pubkey);
                callback(x);
            });
        });
    });
}

function channel_feeder_bets_unlock(server_id, callback) {
    var cd = channels_object.read(server_id);

    console.log("channel feeder bets unlock ");
    console.log(JSON.stringify(cd));

    spk_bet_unlock(cd.me, cd.ssme, function (unlock_object) {
        console.log("spk object bets are ");
        console.log(JSON.stringify(unlock_object.spk[3]));
        cd.me = unlock_object.spk;//should be empty like newss
        cd.ssme = unlock_object.newss;
        cd.ssthem = unlock_object.ssthem;
        channels_object.write(server_id, cd);
        return callback({
            "secrets": unlock_object.secrets,//incorrectly storing -6 in prove
            "spk": unlock_object.spk
        });
    });
    /*
    {ok, CD0} = channel_manager:read(ID),
    true = CD0#cd.live,
    SPKME = CD0#cd.me,
    SSOld = CD0#cd.ssme,
    {NewSS, SPK, Secrets, SSThem} = spk:bet_unlock(SPKME, SSOld),
    NewCD = CD0#cd{me = SPK, ssme = NewSS, ssthem = SSThem},
    channel_manager:write(ID, NewCD),
    Out = {Secrets, SPK},
    */

}

function teach_secrets(secrets, i, callback) {
    //secrets is a dictionary code -> [secret, amount]
    // send ["secret", Secret, Key]
    //talker:talk({learn_secret, ID, Secret, Code}, IP, Port),
    if (!(i < secrets.length)) {
        return callback();
    }
    console.log(JSON.stringify(secrets[i]));//incorrectly storing -6 in prove.
    var msg = ["learn_secret", keys.pub(), channels_object.ss_to_external(secrets[i][1]), secrets[i][2]];
    console.log(JSON.stringify(msg));
    variable_public_get(msg, function () {
        return teach_secrets(secrets, i + 1, callback);
    });
}

function channel_feeder_update_to_me(sspk, from) {
    var myid = keys.pub();
    var spk = sspk[1];
    var acc1 = spk[1];
    var acc2 = spk[2];
    if (!(((myid == acc1) && (from == acc2)) || ((myid == acc2) && (from == acc1)))) {
        console.log(JSON.stringify(spk));
        console.log(JSON.stringify(acc1));
        console.log(JSON.stringify(acc2));
        console.log(JSON.stringify(myid));
        console.log(JSON.stringify(from));
        console.log("channel_feeder_update_to_me has incorrect accounts in the spk.");
        return false;
    }
    console.log("about to sign");
    console.log(JSON.stringify(sspk));
    sspk2 = keys.sign(sspk);
    console.log("signed");
    console.log(JSON.stringify(sspk2));
    var b = verify_both(sspk2);
    if (!(b)) {
        console.log("they didn't sign the spk");
        return false;
    }
    cd = channels_object.read(from);
    if (!(JSON.stringify(cd.me) === JSON.stringify(sspk[1]))) {
        console.log(JSON.stringify(cd.me));//bet should start with -6.//bet should be removed.
        console.log(JSON.stringify(sspk[1]));
        console.log("can't update to me if they aren't the same.");
        return false;
    }
    cd.them = sspk
    cd.ssthem = cd.ssme
    channels_object.write(from, cd);
}

function spk_bet_unlock(spk, ssold, callback) {
    console.log("spk bet unlock spk is ");
    console.log(JSON.stringify(spk));
    console.log("spk bet unlock ssold is ");
    console.log(JSON.stringify(ssold));//[{code:, prove:, meta:}]

    var bets = spk[3];//starts with -6
    var remaining = JSON.parse(JSON.stringify(bets));
    var amount_change = 0;
    var ssremaining = JSON.parse(JSON.stringify(ssold));
    var secrets = [];
    var dnonce = 0;
    var ssthem = [];
    var i = ssold.length;
    var key, bet, f, ss, key_junk;

    return bet_unlock2(callback);


    function bet_unlock3(data, ss2, callback) {
        console.log("bet_unlock3");
        var s = data.stack;
        var nonce2 = s[1];
        var delay = s[2];
        if (delay > 0) {
            console.log("delay > 0. keep the bet");
            console.log(delay);
            return bet_unlock2(callback);
        } else {
            var cgran = 10000; //constants.erl
            var contract_amount = s[0] | 0; // changes contract_amount format so negative number work.
            if ((contract_amount > cgran) ||
                (contract_amount < -cgran)) {
                throw("you can't spend money you don't have in the channel.");
            }
            var a3 = Math.floor(contract_amount * bet[2] / cgran);
            var key = bet[3];
            remaining.splice(i + 1, 1);
            ssremaining.splice(i, 1);
            amount_change += a3;
            secrets = ([["secret", ss2, key]]).concat(secrets);
            dnonce += nonce2;
            ssthem = ([ss2]).concat(ssthem);
            return bet_unlock2(callback);
        }
    }

    function bet_unlock2(callback) {
        i--;
        if (i < 0) {
            //spk.bets = remaining;
            spk[3] = remaining;
            //spk.amount += amount_change;
            spk[7] += amount_change;
            spk[8] += dnonce;
            console.log("bet unlock 2");
            console.log(JSON.stringify(remaining));
            console.log(JSON.stringify(ssremaining));
            if (!(remaining.length === ssremaining.length + 1)) {
                throw("bet unlock 2 lengths don't match");
            }
            var x = {
                "newss": ssremaining,
                "spk": spk,
                "secrets": secrets,
                "ssthem": ssthem
            };
            return callback(x);
        }
        //for (i = ssold.length - 1; i > -1; i--) {
        ss = ssold[i];
        bet = bets[i + 1];
        key = bet[3];
        key_junk = secrets_object.read(key);
        if (key_junk == undefined) {
            console.log("secrets object");
            console.log(JSON.stringify(secrets_object));
            console.log("key");
            console.log(key);
            console.log("we don't have a secret to unlock this contract");
            //ssremaining = ([ss]).concat(ssremaining);//doing nothing preservse the info.
            ssthem = ([ss]).concat(ssthem);
            //remaining = // doing nothing means preserving the info.
            return bet_unlock2(callback);
        } else {
            var ss2 = ss_to_internal([-6, key_junk[0]])[0];
            var amount = key_junk[1];
            var height = headers_object.top()[1];
            var state = chalang_object.new_state(height, 0);
            var fun_limit = 400;
            var var_limit = 10000;
            console.log("ss2");
            console.log(JSON.stringify(key_junk));
            console.log(key_junk[0]);
            console.log(JSON.stringify(ss2));
            var script_sig = ss2.code;
            if (!(chalang_none_of(script_sig))) {
                throw("error: return op in the script sig");
            }
            prove_facts(ss.prove, function (f) {
                var c = string_to_array(atob(bet[1]));
                var code = f.concat(c);
                var opgas = 100000;//should be 100 000. made it smaller to stop polluting the console.
                var data = chalang_object.data_maker(opgas, opgas, var_limit, fun_limit, ss2.code, code, state);
                var data2 = chalang_object.run5(script_sig, data);
                var data3 = chalang_object.run5(code, data2);
                console.log("data3");
                console.log(JSON.stringify(data3));
                if (data3.stack == undefined) {
                    throw("working here");
                } else {
                    bet_unlock3(data3, ss2, callback)
                }
            });
        }
    }
}

function new_cd(me, them, ssme, ssthem, expiration, cid) {
    return {"me": me, "them": them, "ssme": ssme, "ssthem": ssthem, "cid":cid, "expiration": expiration};
}

module.exports = {pull_channel_state, spk_run};


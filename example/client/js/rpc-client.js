#!/usr/bin/env node
///////////////////////////////////////////////////////////////////////////////

var ArgumentParser = require('argparse').ArgumentParser,
    Rpc = require('../../../index.js');

var assert = require('assert'),
    path = require('path');

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var parser = new ArgumentParser({
    addHelp: true, description: 'RPC Client', version: '0.0.1'
});

parser.addArgument(['port'], {
    nargs: '?', help: 'Server Port', defaultValue: '8088'
});
parser.addArgument(['host'], {
    nargs: '?', help: 'Server Host', defaultValue: 'localhost'
});

parser.addArgument(['-a', '--n-add'], {
    nargs: '?', help: 'ADD Workers', defaultValue: 1
});
parser.addArgument(['-s', '--n-sub'], {
    nargs: '?', help: 'SUB Workers', defaultValue: 1
});
parser.addArgument(['-m', '--n-mul'], {
    nargs: '?', help: 'MUL Workers', defaultValue: 1
});
parser.addArgument(['-d', '--n-div'], {
    nargs: '?', help: 'DIV Workers', defaultValue: 1
});

parser.addArgument(['--api-path'], {
    nargs: '?', help: 'Path to API protocol',
    defaultValue: path.join(__dirname, '../../protocol')
});
parser.addArgument(['--api-file'], {
    nargs: '?', help: 'File of API protocol',
    defaultValue: 'api.proto'
});

///////////////////////////////////////////////////////////////////////////////

var args = parser.parseArgs();

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

var Api = Rpc.loadProtocolFile({root: args.api_path, file: args.api_file});
assert.ok(Api);

var url = 'ws://' + args.host + ':' + args.port;
assert.ok(url);

/////////////////////////////////////////////////////////////////////)/////////

var calculator_svc = new Rpc.Service(url, Api.Calculator.Service, {
    '.Calculator.Service.add': Api.Calculator.AddResult,
    '.Calculator.Service.sub': Api.Calculator.SubResult,
    '.Calculator.Service.mul': Api.Calculator.MulResult,
    '.Calculator.Service.div': Api.Calculator.DivResult
});

calculator_svc.socket.on('open', function () {
    console.log('=', new Date());

    var n_add = args.n_add, iid_add = {},
        n_sub = args.n_sub, iid_sub = {},
        n_mul = args.n_mul, iid_mul = {},
        n_div = args.n_div, iid_div = {};

    for (var add_i = 0; add_i < n_add; add_i++) {
        iid_add[add_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.AddRequest({
                lhs: random(0, 255), rhs: random(0, 255)
            });

            t[i] = process.hrtime();
            calculator_svc.add(req, function (error, result) {
                if (error !== null) throw error;

                assert.equal(req.lhs + req.rhs, result.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[add]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(add_i, {}), 0);
    }

    for (var sub_i = 0; sub_i < n_sub; sub_i++) {
        iid_sub[sub_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.SubRequest({
                lhs: random(0, 255), rhs: random(0, 255)
            });

            t[i] = process.hrtime();
            calculator_svc.sub(req, function (error, result) {
                if (error !== null) throw error;

                assert.equal(req.lhs - req.rhs, result.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[sub]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(sub_i, {}), 0);
    }

    for (var mul_i = 0; mul_i < n_mul; mul_i++) {
        iid_mul[mul_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.MulRequest({
                lhs: random(0, 255), rhs: random(0, 255)
            });

            t[i] = process.hrtime();
            calculator_svc.mul(req, function (error, result) {
                if (error !== null) throw error;

                assert.equal(req.lhs * req.rhs, result.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[mul]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(mul_i, {}), 0);
    }

    for (var div_i = 0; div_i < n_div; div_i++) {
        iid_div[div_i] = setInterval((function (i, t) {
            var req = new Api.Calculator.DivRequest({
                lhs: random(0, 255), rhs: random(1, 256)
            });

            t[i] = process.hrtime();
            calculator_svc.div(req, function (error, result) {
                if (error !== null) throw error;

                assert.equal(Math.floor(req.lhs / req.rhs), result.value);
                var dt = process.hrtime(t[i]); t[i] = process.hrtime();
                console.log('dT[div]@%d:', i, dt[0] * 1E3 + dt[1] / 1E6);
            });
        }).with(div_i, {}), 0);
    }

    setTimeout(function () {
        for (var key_add in iid_add)
            if (iid_add.hasOwnProperty(key_add))
                clearInterval(iid_add[key_add]);
        for (var key_sub in iid_sub)
            if (iid_sub.hasOwnProperty(key_sub))
                clearInterval(iid_sub[key_sub]);
        for (var key_mul in iid_mul)
            if (iid_mul.hasOwnProperty(key_mul))
                clearInterval(iid_mul[key_mul]);
        for (var key_div in iid_div)
            if (iid_div.hasOwnProperty(key_div))
                clearInterval(iid_div[key_div]);

        console.log('=', new Date());
        process.exit();
    }, 10000);
});

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

Function.prototype.with = function () {
    var slice = Array.prototype.slice,
        args = slice.call(arguments),
        func = this;

    return function () {
        return func.apply(this, args.concat(slice.call(arguments)));
    };
};

function random(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

///////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////////////////////////////

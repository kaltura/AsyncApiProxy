const CacheManager = require('./../lib/CacheManager.js');
const config  = require('config');
const chai = require('chai');
const assert = require('chai').assert;
const cache = new CacheManager(config);
const util = require('util');
const os = require('os');
const AsyncProxyManager = require('../lib/AsyncProxyManager');
const isSubset = require('is-subset');

describe('CacheManager Test ', function () {
    it('test - History messages', function(done) {
        this.timeout(50000);

        let expirationFunction = function (request, err) {
            if (err)
                assert.equal(0,1,util.inspect(err));
            else
                assert.equal(0, request.requestParams.variable, `Only Third history callback call was expected. Should not get here! \n Request is: ${util.inspect(request.requestParams)}`);
            done();
        }

        let request = {};
        let request1 = {};
        request.requestParams = {
            "service": "userEntry",
            "action": "update",
            name: "HISTORY_TEST1",
            variable: 42,
            sessionId: 1,
            'X-Me': os.hostname(),
        };
        request.expiryCallback = expirationFunction;

        request1.requestParams = {
            "service": "userEntry",
            "action": "update",
            name: "HISTORY_TEST2",
            variable: 0,
            sessionId: 1,
            'X-Me': os.hostname(),
        };
        request1.expiryCallback = expirationFunction;

        getRequestHandler(request.requestParams)
            .then(function (requestHandler) {
                console.log("Handling request handler: " + util.inspect(requestHandler));
                cache.cacheCall("TEST_KEY1", request, requestHandler);
            })
            .then(function () {
                console.log("Request successfully processed \n");
                return getRequestHandler(request.requestParams)
            })
            .then(function (requestHandler) {
                console.log("Handling request handler: " + util.inspect(requestHandler));
                cache.cacheCall("TEST_KEY1", request, requestHandler);
            })
            .then(function () {
                console.log("Request successfully processed \n");
                return getRequestHandler(request.requestParams)
            })
            .then(function (requestHandler) {
                console.log("Handling request handler: " + util.inspect(requestHandler));
                cache.cacheCall("TEST_KEY1", request1, requestHandler);
            })
            .then(function () {
                console.log("Request successfully processed \n");
            })
            .catch(function (err) {
                assert.fail(0, 1, "Failed to handle request with error: " + err);
            });
    });

    it('test - Aggregation messages', function (done) {
        this.timeout(50000);

        let doneCounter = 0;
        let expirationFunction = function (request, err) {
            if (err)
                assert.equal(0,1,util.inspect(err));
            assert.equal(0, request.requestParams.variable, `Got to wrong cache item callback function. Should not get here! \n Request is: ${util.inspect(request.requestParams)}`);
            assert.equal(3, request.requestParams.counter, `Got to wrong aggregation item callback function. Should not get here! \n Request is: ${util.inspect(request.requestParams)}`);
            doneCounter = doneCounter +1;
            if (doneCounter == 2)
                done();
        };

        let expirationFunction2 = function (request, err) {
            if (err)
                assert.equal(0,1,util.inspect(err));
            assert.equal(333, request.requestParams.variable, `Got to wrong cache item callback function. Should not get here! \n Request is: ${util.inspect(request.requestParams)}`);
            assert.equal(1, request.requestParams.counter, `Got to wrong aggregation item callback function. Should not get here! \n Request is: ${util.inspect(request.requestParams)}`);
            doneCounter = doneCounter +1;
            if (doneCounter == 2)
                done();
        };

        let request = {};
        let request1 = {};
        let request2 = {};

        request.requestParams = {
            "service": "cuepoint_cuepoint",
            "action": "update",
            name: "HISTORY_TEST1",
            variable: 42,
            sessionId: 1,
            'X-Me': os.hostname(),
        };
        request.expiryCallback = expirationFunction;
        request1.requestParams = {
            "service": "cuepoint_cuepoint",
            "action": "update",
            name: "HISTORY_TEST2",
            variable: 0,
            sessionId: 2,
            'X-Me': os.hostname(),
        };
        request1.expiryCallback = expirationFunction;
        request2.requestParams = {
            "service": "cuepoint_cuepoint",
            "action": "update",
            name: "HISTORY_TEST2",
            variable: 333,
            sessionId: 2,
            'X-Me': os.hostname(),
        };
        request2.expiryCallback = expirationFunction2;

        getRequestHandler(request.requestParams)
            .then(function (requestHandler) {
                console.log("Handling request handler: " + util.inspect(requestHandler));
                cache.cacheCall("AGG_TEST_KEY1", request, requestHandler);
            })
            .then(function () {
                console.log("Request successfully processed \n");
                return getRequestHandler(request.requestParams)
            })
            .then(function (requestHandler) {
                console.log("Handling request handler: " + util.inspect(requestHandler));
                cache.cacheCall("AGG_TEST_KEY1", request, requestHandler);
            })
            .then(function () {
                console.log("Request successfully processed \n");
                return getRequestHandler(request.requestParams)
            })
            .then(function (requestHandler) {
                console.log("Handling request handler: " + util.inspect(requestHandler));
                cache.cacheCall("AGG_TEST_KEY1", request1, requestHandler);
            })
            .then(function () {
                console.log("Request successfully processed \n");
                return getRequestHandler(request.requestParams)
            })
            .then(function (requestHandler) {
                console.log("Handling request handler: " + util.inspect(requestHandler));
                cache.cacheCall("AGG_TEST_KEY2", request2, requestHandler);
            })
            .catch(function (err) {
                assert.fail(0, 1, "Failed to handle request with error: " + err);
            });

    });
});

function getRequestHandler(requestParams) {
    let handlers = config.get('handlers');
    return new Promise(function (resolve, reject) {
        handlers.forEach(function(h) {
            if( isSubset(requestParams, h.identifier) ) {
                return resolve(h);
            }
        });
        reject("Failed to find request handler in configuration list");
    });
}
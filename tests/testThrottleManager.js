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

        let expirationFunction = function (response, err) {
            if (err)
               assert.equal(0,1,util.inspect(err));
            else
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
        request.headers = {"content-type": "application/json"};
        request.callback = expirationFunction;

        request1.requestParams = {
            "service": "userEntry",
            "action": "update",
            name: "HISTORY_TEST2",
            variable: 0,
            sessionId: 1,
            'X-Me': os.hostname(),
        };
        request1.callback = expirationFunction;
        request1.headers = {"content-type": "application/json"};

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
require('./utils/KalturaLogger');
require('./utils/KalturaAsyncProxyServerErrors');

const os = require('os');
const config = require('config');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const CacheManager = require('./CacheManager');
const KalturaAsyncProxyServerValidator = require('./utils/KalturaAsyncProxyServerValidator');
const KalturaRequestUtils = require('./utils/RequestUtils.js');
const isSubset = require('is-subset');
const crypto = require('crypto');
const Promise = require("bluebird");


class AsyncProxyManager {

    constructor() {
        try {
            KalturaAsyncProxyServerValidator.validateConfigurations(config);
            this._cacheManager = new CacheManager();
            this._version = config.get('server.version');
            this._handlers = config.get('handlers');
            this._startServer();
        }
        catch (err) {
            KalturaLogger.error("EXITING: " + KalturaAsyncProxyServerErrors.ASYNC_PROXY_SERVER_INIT_ERROR + ": " + util.inspect(err));
            process.exit(1);

        }
    }

    _startServer() {

        KalturaLogger.log('\n\n_____________________________________________________________________________________________');
        KalturaLogger.log('Async-Proxy-Server ' + this._version + ' started');

        this.httpApp = this._startHttpServer();
        this._configureAsyncProxyServer(this.httpApp);
        if (config.get('cloud.httpsPort')) {
            this.httpsApp = this._startHttpsServer();
            this._configureAsyncProxyServer(this.httpsApp);
        }
    }

    _startHttpServer() {
        const httpPort = config.get('cloud.httpPort');
        KalturaLogger.log(`Listening on port [${httpPort}]`);
        const app = express();
        app.listen(httpPort);
        return app;
    }

    _startHttpsServer() {
        const httpsPort = config.get('cloud.httpsPort');
        KalturaLogger.log(`Listening on port [${httpsPort}]`);
        const app = express();
        app.listen(httpsPort);
        return app;
    }

    /*TODO - how to handle incoming calls

     validate request from config params
     create session id and add to incoming call
     set x-forwarded for from call

     */

    // configure server behavior and how to handle calls.
    // parse request
    _configureAsyncProxyServer(app) {

        const This = this;
        app.use(
            function (req, res, next) {
                KalturaLogger.access(req, res);
                next();
            });

        app.get('/admin/alive/',
            function (request, response) {
                response.end("Kaltura async proxy server - running");
            });

        app.get('/version',
            function (request, response) {
                response.end(This._version);
            }
        );

        app.options('/*',
            function (request, response) {
                allowedHeaders = '*';
                if (request.get('Access-Control-Request-Headers'))
                    allowedHeaders = request.get('Access-Control-Request-Headers');
                response.set({
                    'Allow': 'POST, OPTIONS',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Headers': allowedHeaders,
                    'Access-Control-Allow-Methods': 'POST, OPTIONS',
                    'Content-Type': 'text/html; charset=utf-8'
                });
                response.send();
            }
        );

        app.use(bodyParser.urlencoded({ 
            extended: true,
            verify: function (req, res, body) {
                req.rawBody = body.toString();
            }
        }));
        app.use(bodyParser.json({
            type: "application/json",
            verify: function (req, res, body) {
                req.rawBody = JSON.parse(body.toString());
            }
            
        }));

        app.use(function (err, req, res, next) {
            if (err)
            {
                console.log(err);
                res.status(403).send('Unauthorized');
            }
            else
                next();
        });

        app.post('/api_v3/index.php/*', (...args) =>This._handleCall(...args));

        app.post('/api_v3/*', (...args) =>This._handleCall(...args));
    }

    _handleCall(request, response) {
        KalturaLogger.debug("Handling call");
        let _this = this;
        KalturaRequestUtils.buildRequestParams(request, response)
            .then(function() {
                return _this._getRequestHandler.call(_this, request.requestParams);
            })
            .then(function(requestHandler) {
                return _this._generateCacheKey(requestHandler, request.requestParams, response);
            })
            .then(function(requestHandler, cacheKey) {
                _this._cacheManager.cacheCall(cacheKey, request, requestHandler);
            })
            .then(function() {
                response.status(200).end("Request successfully processed \n");
            })
            .catch((err) => {
                response.error("Failed to handle request with err " + err);
                response.status(404).end("Will not handle call - unvalidated\n");
                return;
            });
    }

    _getRequestHandler(requestParams) {
        let _this = this;
        return new Promise(function (resolve, reject) {
            _this._handlers.forEach(function(h) {
                if( isSubset(requestParams, h.identifier) )
                    return resolve(h);
            });
            
            reject("Failed to find request handler in configured list");
        });
    }

    //md5 of keys array that make a unique call.
    _generateCacheKey(requestHandler, requestParams, response) {
        return new Promise(function (resolve, reject) {
            let cacheKey = "";

            requestHandler.cacheKeyParams.forEach(function(keyParam) {
                if(!requestParams[keyParam]) {
                    response.log("cannot find keyParam [" + keyParam + "] on given request params [" + JSON.stringify(requestParams) + "]");
                    return reject("Will not handle call - missing mandatory params for cache key calculation\n");
                }
                else
                    cacheKey += requestParams.keyParam;
            });

            let checkKey = crypto.createHash('md5').update(cacheKey).digest("hex");
            response.log("cache key = [" + checkKey + "]");
            return resolve(requestHandler, checkKey);
        });
    }
}

module.exports = AsyncProxyManager;

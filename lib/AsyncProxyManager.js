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

        if (config.has('cloud.httpPort')) {
            this.httpApp = this._startHttpServer();
            this._configureAsyncProxyServer(this.httpApp);
        }
        
        if (config.has('cloud.httpsPort')) {
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

    _configureAsyncProxyServer(app) {

        const This = this;
        app.use(
            function (req, res, next) {
                KalturaLogger.access(req, res);
                next();
            });

        app.get('/admin/alive/',
            function (request, response) {
                response.end("Kaltura");
            });

        app.get('/cacheSize',
            function (request, response) {
                let sizeInfo = This._cacheManager.getSizeInfo();
                response.end(sizeInfo.cacheSize + "\n");
            }
        );

        app.get('/throttleSize',
            function (request, response) {
                let sizeInfo = This._cacheManager.getSizeInfo();
                response.end(sizeInfo.throttleQueueSize + "\n");
            }
        );

        app.get('/version',
            function (request, response) {
                response.end(This._version + "\n");
            }
        );

        app.options('/*',
            function (request, response) {
                let allowedHeaders = '*';
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
                KalturaLogger.error(err);
                res.status(403).send('Unauthorized');
            }
            else
                next();
        });

        app.post('/api_v3/index.php/*', (...args) =>This._handleCall(...args));

        app.post('/api_v3/*', (...args) =>This._handleCall(...args));
    }

    _handleCall(request, response) {
        request.log("Handling call [" + request.url + "]");
        let _this = this;
        KalturaRequestUtils.buildRequestParams(request)
            .then(function() {
                return _this._getRequestHandler.call(_this, request);
            })
            .then(function(requestHandler) {
                return _this._generateCacheKey(requestHandler, request);
            })
            .then(function(cacheHandler) {
                _this._cacheManager.cacheCall(request, cacheHandler);
            })
            .then(function() {
                response.status(200).end("Request successfully processed \n");
            })
            .catch((err) => {
                request.error("Failed to handle request with err " + err);
                response.status(404).end("Will not handle call - unvalidated\n");
                return;
            });
    }

    _getRequestHandler(request) {
        let _this = this;
        let requestHandler = null;

        return new Promise(function (resolve, reject) {

            for(let i=0; i<_this._handlers.length; i++)
            {
                if( isSubset(request.requestParams, _this._handlers[i].identifier) )
                {
                    requestHandler = _this._handlers[i];
                }
            }

            if( requestHandler )
                return resolve(requestHandler);

            return reject("Failed to find request handler in configured list");
        });
    }

    //md5 of keys array that make a unique call.
    _generateCacheKey(requestHandler, request) {
        return new Promise(function (resolve, reject) {
            let cacheKey = "";
            let cacheKeyParams = requestHandler.cacheKeyParams;

            for(let j=0; j<cacheKeyParams.length; j++)
            {
                let keyParam = cacheKeyParams[j];
                let value = null;
                
                if(keyParam in request.requestParams) {
                    value = request.requestParams[keyParam];
                }


                if(!value && keyParam.indexOf(":") > -1)
                {
                    let value = request.requestParams;
                    let keyParamParts = keyParam.split(":");
                    for(let i = 0; i<keyParamParts.length; i++)
                    {
                        value = value[keyParamParts[i]]
                        if(!value || !is_array(value))
                        {
                            value = null;
                            break;
                        }
                    }
                }

                if(!value)
                {
                    request.log("cannot find keyParam [" + keyParam + "] on given request params [" + JSON.stringify(request.requestParams) + "]");
                    return reject("Will not handle call - missing mandatory params for cache key calculation\n");
                }
                else
                {
                    cacheKey += value + ":";
                }

            }

            request.log("Claculating cache key from cache key params [" + cacheKey + "]")
            cacheKey = crypto.createHash('md5').update(cacheKey).digest("hex");
            request.log("cache key = [" + cacheKey + "]");
            return resolve({requestHandler: requestHandler, cacheKey: cacheKey});
        });
    }
}

module.exports = AsyncProxyManager;

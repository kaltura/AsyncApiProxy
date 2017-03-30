require('./utils/KalturaLogger');
require('./utils/KalturaAsyncProxyServerErrors');

const os = require('os');
const config = require('config');
const util = require('util');
const express = require('express');
const bodyParser = require('body-parser');
const CacheManager = require('./CacheManager');

class AsyncProxyManager {

    constructor() {
        try {
            KalturaAsyncProxyServerValidator.validateConfigurations(config);
            this._cacheManager = new CacheManager();
            this._hostname = os.hostname();
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
                response.send('kaltura - X-ME: ' + this.hostname);
            });

        app.get('/version',
            function (request, response) {
                response.send(This._version);
                response.end();
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
                    'Content-Type': 'text/html; charset=utf-8',
                });
                response.send();
            }
        );

        app.use(function (req, res, next) {
            let data = Buffer.alloc(0);
            if (!req.get('content-type') || req.get('content-type').toLowerCase().indexOf('text') >= 0
                || req.get('content-type').toLowerCase().indexOf('application/json') >= 0) {
                req.on('data', function (chunk) {
                    data = Buffer.concat([data, Buffer.from(chunk, 'binary')]);
                });
                req.on('end', function () {
                    req.rawBody = data;
                    next();
                });
            }
            else
                next();
        });

        app.use(bodyParser.urlencoded({
            extended: true,
            verify: function (req, res, body) {
                req.rawBody = body.toString();
            },
        }));

        app.use(bodyParser.raw({
            extended: true,
            verify: function (req, res, body) {
                req.rawBody = body;
            },
        }));


        app.use(function (err, req, res, next) {
            if (err)
                res.status(403).send('Unauthorized');
            else
                next();
        });

        app.post('/*', (...args) =>This._handleCall(...args));

    }

    _handleCall(request, response) {
        request.body = JSON.parse(request.rawBody.toString());
        if (!this._validateCall(request)) {
            response.headers.X_ME = this._hostname;
            response.send("Will not handle call - unvalidated");

            response.end();
            return;
        } else {
            let sessionId = this._generateSessionId();
            request.sessionId = sessionId;
            //get keys values from request and generate key
            let cacheKey = this._generateCacheKey(keys);
            this.cacheManager.cacheCall(cacheKey, call);
        }
    }

    _validateCall(call) {

    }

    //md5 of keys array that make a unique call.
    _generateCacheKey(keys) {
        //mds5 of all args
    }

    _parseCall(call) {

    }
}

module.exports = AsyncProxyManager;

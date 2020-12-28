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
const compression = require('compression');
const cluster = require("cluster");
const numCPUs = require("os").cpus().length;

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

           if (cluster.isMaster) {
               KalturaLogger.log('\n\n_____________________________________________________________________________________________');
               KalturaLogger.log('Async-Proxy-Server ' + this._version + ' started. Number of cores to use: ' + numCPUs);
               KalturaLogger.log('Starting all child processes');

               this.childProcesses = {};
               this.run = true;

               const This = this;
               cluster.on('listening',
                   function (worker, address)
                   {
                       KalturaLogger.log(`A process [${worker.process.pid}] is now connected,`);
                   });

               process.on('SIGUSR1', function() {
                   KalturaLogger.log('Got SIGUSR1. Invoke log rotate notification.');
                   This._notifyLogsRotate();
               });

               // start child processes
               for (let i = 1; i <= numCPUs; i++) {
                   if (config.has('cloud.httpPort'+i)) {
                       let childProcess = This._spawn(i);
                       this.childProcesses[childProcess.process.pid] = childProcess;
                   } else {
                       KalturaLogger.log('Cpu index ' + i + ' will not be used, no matching config found');
                   }
               }

           } else {
               KalturaLogger.log(`Process started ` + process.pid+ ` WorkerId is: ` + process.env['WORKER_ID']);
               this._startChildProcess();
           }
       }

    _notifyLogsRotate() {
        if (cluster.isMaster) {
            KalturaLogger.log('Log rotate main process');
            KalturaLogger.notifyLogsRotate();
            for (const pid in this.childProcesses) {
                KalturaLogger.log(`Log rotate child process [${pid}]`);
                this.childProcesses[pid].send('_notifyLogsRotate');
            }
        } else {
            KalturaLogger.notifyLogsRotate();
        }
    }

    _startChildProcess(){
        process.on('uncaughtException',
            function (err)
            {
                KalturaLogger.error('Uncaught Exception: ' + err.stack);
            });

        const This = this;
        process.on('message',
            function (msg) {
                if (typeof This[msg] === 'function')
                    This[msg].apply(This);
            });

        let cpuNumber = process.env['WORKER_ID'];
        if (config.has('cloud.httpPort'+cpuNumber)) {
            let httpPort = config.get('cloud.httpPort'+cpuNumber);
            this.httpApp = this._startHttpServer(httpPort);
            this._configureAsyncProxyServer(this.httpApp);
        }

        if (config.has('cloud.httpsPort'+cpuNumber)) {
            let httpsPort = config.get('cloud.httpsPort'+cpuNumber);
            this.httpsApp = this._startHttpsServer(httpsPort);
            this._configureAsyncProxyServer(this.httpsApp);
        }
    }

    _spawn (id) {
        var new_worker_env = {};
        new_worker_env["WORKER_ID"] = id;
        const childProcess = cluster.fork(new_worker_env);

        const This = this;
        childProcess.on('exit',
            function (code) {
                This._onProcessExit(childProcess, code);
            });

        this.childProcesses[childProcess.process.pid] = childProcess;
        return childProcess;
    }

    _onProcessExit (childProcess, code) {
        const pid = childProcess.process.pid;
        delete this.childProcesses[pid];
        KalturaLogger.log(`Process died [${pid}] , code [${code}]`);

        if (this.run) {
            const childProcess = this._spawn(process.env['WORKER_ID']);
            KalturaLogger.log(`Restarted process [${childProcess.process.pid}]`);
        }
    }

    _startHttpServer(httpPort) {
        KalturaLogger.log(`Listening on port [${httpPort}]`);
        const app = express();
        app.use(compression());
        app.listen(httpPort);
        return app;
    }

    _startHttpsServer(httpsPort) {
        KalturaLogger.log(`Listening on port [${httpsPort}]`);
        const app = express();
        app.use(compression());
        app.listen(httpsPort);
        return app;
    }

    _configureAsyncProxyServer(app) {

        const This = this;
        app.use(function (req, res, next) {
            KalturaLogger.access(req, res);
            next();
        });

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

        app.set('view cache', true);

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
                response.end();
            }
        );

        app.post('/api_v3/index.php/*', (...args) =>This._handleCall(...args));

        app.post('/api_v3/*', (...args) =>This._handleCall(...args));

        app.use(function (err, req, res, next) {
            if (err)
            {
                KalturaLogger.error(err);
                res.status(403).end('Unauthorized');
            }
        });
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

            request.log("Calculating cache key from cache key params [" + cacheKey + "]");
            cacheKey = crypto.createHash('md5').update(cacheKey).digest("hex");
            request.log("cache key = [" + cacheKey + "]");
            return resolve({requestHandler: requestHandler, cacheKey: cacheKey});
        });
    }
}

module.exports = AsyncProxyManager;

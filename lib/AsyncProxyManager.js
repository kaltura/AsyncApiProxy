require('./utils/KalturaLogger');
require('./utils/KalturaAsyncProxyServerErrors');

const os = require('os');
const config = require('config');
const KalturaAsyncProxyServerValidator = require('./utils/KalturaAsyncProxyServerValidator');
const util = require('util');
const CacheManager = require('./CacheManager');

class AsyncProxyManager {

    constructor() {
        try {
            this.cacheManager = new CacheManager();
            KalturaAsyncProxyServerValidator.validateConfigurations(config);
            this._init();
        }
        catch (err) {
            KalturaLogger.error("EXITING: " + KalturaAsyncProxyServerErrors.ASYNC_PROXY_SERVER_INIT_ERROR + ": " + util.inspect(err));
            process.exit(1);
        }
    }

    _init() {
        let This = this;
        this._startServer();
    }

    _startServer() {
        this.httpApp = this._startHttpServer();
        this.configureAsyncProxyServer(this.httpApp);
        if (KalturaConfig.config.cloud.httpsPort) {
            this.httpsApp = this.startHttpsServer();
            this.configureAsyncProxyServer(this.httpsApp);
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


    _configureAsyncProxyServer(app){
       /*TODO - how to handle incoming calls
        parse request
        validate request from config params
        create session id and add to incoming call
        set x-forwarded for from call
        let cacheKey = CacheManager.generateCacheKey(call);
        CacheManager.cacheCall(cacheKey, call);
        */
    }

    _onError(msg) {
            KalturaLogger.error(msg.message);
    }

    _onIncommingMessage(message) {
    }


    _validateCall(call) {
    }

    _parseCall(call) {
    }
}

module.exports = AsyncProxyManager;

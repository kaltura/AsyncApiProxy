require('./utils/KalturaLogger');
const util = require('util');
const Throttle = require('./ThrottleManager');
const config = require('config');
const ThrottleManager = new Throttle();
class CacheManager {

    constructor () {
        this.cache = require('memory-cache');
    }

    cacheCall(request, cacheHandler) {
        let This = this;

        return new Promise(function (resolve, reject) {
            if (!cacheHandler.requestHandler || !cacheHandler.requestHandler.ttl) {
                request.debug("Not Caching call: " + util.inspect(cacheHandler.requestHandler));
                return reject("Will not Cache call - missing mandatory data for call handler\n");
            }

            if (!cacheHandler.cacheKey) {
                request.debug("Missing Cache Key ");
                return reject("Will not Cache request - Missing Cache Key\n");
            }

            if (!request) {
                request.debug("Missing request");
                return reject("Will not Cache request - Missing request data\n");
            }

            try {
                // handling history type request - extending ttl if exists in cache.
                if (cacheHandler.requestHandler.extendTtl) {
                    request.debug("Handling cacheKey: [" + cacheHandler.cacheKey + "]");
                    KalturaLogger.setRequestSessionId(request, cacheHandler.cacheKey + ":" + request.sessionId);
                    This.cache.put(cacheHandler.cacheKey, request, cacheHandler.requestHandler.ttl, function (key, value) {
                        This._CachedCallCallback(key, value);
                    });
                }
                // handling aggregation type request - extending ttl if exists in cache.
                else {
                    let roundedCacheKey = cacheHandler.cacheKey + "_" + This._roundTimeByMinute(new Date().getTime(), cacheHandler.requestHandler.ttl);
                    KalturaLogger.setRequestSessionId(request, roundedCacheKey + ":" + request.sessionId);
                    request.debug("Handling cacheKey: [" + roundedCacheKey + "]");
                    let cacheItem = This.cache.get(roundedCacheKey);
                    if (cacheItem)
                        request.requestParams.counter = cacheItem.requestParams.counter + 1;
                     else
                        request.requestParams.counter = 1;

                    This.cache.put(roundedCacheKey, request, cacheHandler.requestHandler.ttl, function (key, value) {
                        This._CachedCallCallback(key, value);
                    });
                }
                return resolve();
            }
            catch (err) {
                return reject("Could not Cache request - error: " + err);
            }
        });
    }

    _CachedCallCallback(key, request){
        request.debug('Handling expired item. cacheKey: ['+ key + ']');
        if (request.expiryCallback)
            request.expiryCallback(request);
        else
            ThrottleManager.handleMessageSending(request);
    }

    /***
     * time - time to round
     * roundByTime - timeFrame to round in seconds
     * example: _roundTimeByMinute(10000, 2000) round 10000 by 2 seconds timeframe
     ***/
    _roundTimeByMinute(time, roundByTime) {
        const p = roundByTime; // seconds in an minute
        return Math.round(time / p) * p;
    }

}

module.exports = CacheManager;
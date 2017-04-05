require('./utils/KalturaLogger');
const util = require('util');
const Throttle = require('./ThrottleManager');
const config = require('config');
const ThrottleManager = new Throttle();
class CacheManager {

    constructor () {
        this.cache = require('memory-cache');
    }

    cacheCall(cacheKey, request, requestHandler) {
        let This = this;

        return new Promise(function (resolve, reject) {
            if (!requestHandler || !requestHandler.ttl) {
                request.debug("Not Caching call: " + util.inspect(requestHandler));
                return reject("Will not Cache call - missing mandatory data for call handler\n");
            }

            if (!cacheKey) {
                request.debug("Missing Cache Key ");
                return reject("Will not Cache request - Missing Cache Key\n");
            }

            if (!request) {
                request.debug("Missing request");
                return reject("Will not Cache request - Missing request data\n");
            }

            try {
                // handling history type request - extending ttl if exists in cache.
                if (requestHandler.extendTtl) {
                    request.debug("[" + new Date().getTime() + "] Handling cacheKey: [" + cacheKey + "] request:[ " + util.inspect(request) + "]");
                    This.cache.put(cacheKey, request, requestHandler.ttl, function (key, value) {
                        This._CachedCallCallback(key, value);
                    });
                }
                // handling aggregation type request - extending ttl if exists in cache.
                else {
                    let roundedCacheKey = cacheKey + "_" + This._roundTimeByMinute(new Date().getTime(), requestHandler.ttl);
                    request.debug("[" + new Date().getTime() + "] Handling cacheKey: [" + roundedCacheKey + "] request:[ " + util.inspect(request) + "]");
                    let cacheItem = This.cache.get(roundedCacheKey);
                    if (cacheItem)
                        request.requestParams.counter = cacheItem.requestParams.counter + 1;
                     else
                        request.requestParams.counter = 1;

                    This.cache.put(roundedCacheKey, request, requestHandler.ttl, function (key, value) {
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
        request.debug('Handling expired item. cacheKey: ['+ key + '] request:[' + util.inspect(request)+ ']');
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
require('./utils/KalturaLogger');
const util = require('util');
const Throttle = require('./ThrottleManager');
const config = require('config');
const ThrottleManager = new Throttle();
class CacheManager {

    constructor () {
        this.cache = require('memory-cache');
    }

    cacheCall(cacheKey, call, expiry, expiryCallback) {

        if (!cacheKey || !call || !expiry) {
            KalturaLogger.debug("Not Caching call: " + util.inspect(call));
            return;
        }

        let cachedCallback;
        if (expiryCallback)
            cachedCallback = expiryCallback;
        else
            cachedCallback = this._CachedCallCallback;

        if (call.extendTtl) {
            KalturaLogger.debug("[" + new Date().getTime() + "] Handling cacheKey: [" + cacheKey + "] call:[ " + util.inspect(call) + "]");
            this.cache.put("cacheKey", call, expiry, cachedCallback);
        }
        else {
            let roundedCacheKey = cacheKey + "_" + this._roundTimeByMinute(new Date().getTime(), expiry);
            KalturaLogger.debug("[" + new Date().getTime() + "] Handling cacheKey: [" + roundedCacheKey + "] call:[ " + util.inspect(call) + "]");
            let cacheItem = this.cache.get(roundedCacheKey);
            if (cacheItem) {
                this.cache.del(roundedCacheKey);
                call.counter = cacheItem.counter + 1;
                this.cache.put(roundedCacheKey, call, expiry, cachedCallback);
            } else {
                call.counter = 1;
                this.cache.put(roundedCacheKey, call, expiry, cachedCallback);
            }
        }
    }

    _CachedCallCallback(key, call){
        //TODO manipluate call and add relevant data or whatever
        KalturaLogger.debug('[' + new Date().getTime() + '] Handling expired item. cacheKey: ['+ key + '] call:[' + util.inspect(call)+ ']');
        ThrottleManager.handleMessageSending(call);
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
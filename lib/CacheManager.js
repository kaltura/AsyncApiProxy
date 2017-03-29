require('./utils/KalturaLogger');
const util = require('util');
const ThrottleManager = require('./ThrottleManager');
class CacheManager {

    constructor () {
        this.throttleManager = new ThrottleManager();
    }

    handleCall(cacheKey, call)
    {
        KalturaLogger.log("Handling call: " + call.sessionId);
        //todo handle call and cache it accordingly:
        // if cache exists:
        //      if call is 'state' type then extends its ttl in cache
        //      else if call is 'aggregation' then increments its counter in cache but don't extend ttl
        // else if call doesn't exists in cache
        //          insert to cache and set its callback to be _CachedCallCallback

    }

    generateCacheKey(call){
        //return cacheKey;
    }

    _CachedCallCallback(call){
        //manipluate call and add relevant data or whatever
        KalturaLogger.log("Handling expired call from cache: " + call.sessionId);
        this.throttleManager.handleMessageSending(call);
    }

}

module.exports = CacheManager;
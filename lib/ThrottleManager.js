require('./utils/KalturaLogger');
require('./utils/KalturaAsyncProxyServerErrors');

const util = require('util');
const requestSender = require("request");
const rateLimiter = require("simple-rate-limiter");
const config = require('config');
const crypto = require('crypto');
class ThrottleManager {

    constructor() {
        try {
            let _this = this;
            this.messagePerSeconds = config.get('throttle.messagePerTimePeriod');
            this.timePeriod = config.get('throttle.timePeriod');
            _this._throttleQueueSize = 0;

            this.callApi = rateLimiter(function (request, sendExtraParams) {
                try {
                    _this.resetRequestHeaders(request);
                    if(sendExtraParams)
                        _this.addExtraParams(request);
                    const options = {
                        headers: request.headers,
                        body: JSON.stringify(request.requestParams),
                    };

                    function ThrottleResponseCB(error, response, body) {
                        _this._throttleQueueSize--;
                        if (error) {
                            request.error(`Failed API CALL: ${util.inspect(error)}`);
                            if (request.callback)
                                request.callback(response, error);
                            return;
                        };

                        if (response.statusCode === 200) {
                            request.log(`Successful API CALL: X-ME:[${response.headers['x-me']}] , X-Kaltura-Session:[${response.headers['x-kaltura-session']}] `);
                            request.log(`Got response from API server - body [${body}]`);
                            if (request.callback)
                                request.callback(response);
                        }
                        else {
                            request.error(`Failed API CALL: X-ME:[${response.headers['x-me']}] , X-Kaltura-Session:[${response.headers['x-kaltura-session']}]\n\r ${util.inspect(error)}`);
                            if (request.callback)
                                request.callback(response,error);
                        }
                    }
                    
                    let cdnApiHost =  (request.protocol.toLowerCase() == 'http') ? config.get('cdn_api_host.cdn_api_host_http') : config.get('cdn_api_host.cdn_api_host_https');
                    requestSender.post(cdnApiHost,options, ThrottleResponseCB);
                }
                catch (err) {
                    _this._throttleQueueSize--;
                    request.error(`[Error sending api call - " + ${util.inspect(err)}`);
                    if (request.callback)
                        request.callback(null, err);
                }
            }).to(this.messagePerSeconds).per(this.timePeriod);
        } catch (err) {
            KalturaLogger.error("Error Throttling messages - " + util.inspect(err));
        }
    }
    
    resetRequestHeaders(request) {
        delete request.headers['host'];
        delete request.headers['content-length'];
        delete request.headers['accept-encoding'];
        this.generateKalturaRemoteAddr(request);
    }

    addExtraParams(request) {
        let requestExtraParams = request.requestExtraParams;
        if(!requestExtraParams){
            request.log("Request has no extra params");
            return;
        }

        Object.keys(requestExtraParams).forEach(function(key) {
            request.requestParams[key] = requestExtraParams[key];
        });
    }
    
    generateKalturaRemoteAddr(request) {
        if(request.remoteIp) {
            let salt = config.get('server.remote_addr_header_salt');
            let currTime =  Math.round(new Date().getTime()/1000); //- 25200;
            let uniqId = Math.floor((Math.random() * 32767) + 1);
            let baseHeader = request.remoteIp + "," + currTime + "," + uniqId;
            let headerHash = crypto.createHash('md5').update(baseHeader + "," + salt).digest("hex")
            let ipHeader = baseHeader + "," + headerHash;
            
            request.headers['X-KALTURA-REMOTE-ADDR'] = ipHeader;
        }
    }

    handleMessageSending(request, sendExtraParams = true) {
        this._throttleQueueSize++;
        this.callApi(request, sendExtraParams);
    }

    getThrottleQueueSize(){
        return this._throttleQueueSize;
    }
}

module.exports = ThrottleManager;

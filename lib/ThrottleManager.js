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

            this.callApi = rateLimiter(function (request) {
                try {
                    _this.resetRequestHeaders(request);
                    const options = {
                        headers: request.headers,
                        body: JSON.stringify(request.requestParams),
                    };

                    function ThrottleResponseCB(error, response, body) {

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
                    
                    let cdnApiHost =  (request.protocol.toLowerCase() == 'http') ? config.get('cdn_api_host.cdn_api_host') : config.get('cdn_api_host.cdn_api_host_https');
                    requestSender.post(cdnApiHost,options, ThrottleResponseCB);
                }
                catch (err) {
                    request.error(`[Error sending api call - " + ${util.inspect(err)}`);
                    if (request.callback)
                        request.callback(null, err);
                }
            }).to(this.messagePerSeconds).per(this.timePeriod);
        } catch (err) {
            request.error("Error Throttling messages - " + util.inspect(err));
        }
    }
    
    resetRequestHeaders(request) {
        delete request.headers['host'];
        delete request.headers['content-length'];

        this.generateKalturaRemoteAddr(request);
    }
    
    generateKalturaRemoteAddr(request) {
        if(request.ip) {
            let salt = config.get('server.ipSalt');
            let currTime =  Math.round(new Date().getTime()/1000); //- 25200;
            let uniqId = Math.floor((Math.random() * 32767) + 1);
            let baseHeader = request.ip + "," + currTime + "," + uniqId;
            let headerHash = crypto.createHash('md5').update(baseHeader + "," + salt).digest("hex")
            let ipHeader = baseHeader + "," + headerHash;
            
            request.headers['X-KALTURA-REMOTE-ADDR'] = ipHeader;
        }
    }

    handleMessageSending(request) {
        //todo do whatever you want to do before sending the request - add relevant info to request
        this.callApi(request);
    }
}

module.exports = ThrottleManager;
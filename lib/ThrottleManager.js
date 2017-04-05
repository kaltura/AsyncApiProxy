require('./utils/KalturaLogger');
require('./utils/KalturaAsyncProxyServerErrors');

const util = require('util');
const requestSender = require("request");
const rateLimiter = require("simple-rate-limiter");
const config = require('config');

class ThrottleManager {

    constructor() {
        try {
            this.messagePerSeconds = config.get('throttle.messagePerTimePeriod');
            this.timePeriod = config.get('throttle.timePeriod');

            this.callApi = rateLimiter(function (request) {
                try {
                    const options = {
                        headers: request.headers,
                        body: request.requestParams,
                        json: true
                    };

                    function ThrottleResponseCB(error, response, body) {

                        if (error) {
                            KalturaLogger.error(`Failed API CALL: [X-ME: ${request.requestParams['X-Me']} , SessionId: ${request.requestParams.sessionId} \n\r ${util.inspect(error)}`);
                            if (request.callback)
                                request.callback(response, error);
                            return;
                        };

                        if (response.statusCode === 200) {
                            KalturaLogger.log(`Successful API CALL: X-ME:[${request.requestParams['X-Me']}] , SessionId:[${request.requestParams.sessionId}], X-ME:[${response.headers['x-me']}] , X-Kaltura-Session:[${response.headers['x-kaltura-session']}] `);
                            KalturaLogger.log(`[${request.requestParams.sessionId}] Got response from API server - body [${body}]`);
                            if (request.callback)
                                request.callback(response);
                        }
                        else {
                            KalturaLogger.error(`Failed API CALL: X-ME:[${request.requestParams['X-Me']}] , SessionId:[${request.requestParams.sessionId}], X-ME:[${response.headers['x-me']}] , X-Kaltura-Session:[${response.headers['x-kaltura-session']}]\n\r ${util.inspect(error)}`);
                            if (request.callback)
                                request.callback(response,error);
                        }
                    }

                    requestSender.post(config.get('cdn_api_host.cdn_api_host'),options, ThrottleResponseCB);
                }
                catch (err) {
                    KalturaLogger.error(`[${request.requestParams.sessionId}] Error sending api call - " + ${util.inspect(err)}`);
                    if (request.callback)
                        request.callback(null, err);
                }
            }).to(this.messagePerSeconds).per(this.timePeriod);
        } catch (err) {
            KalturaLogger.error("Error Throttling messages - " + util.inspect(err));
        }
    }

    handleMessageSending(request) {
        //todo do whatever you want to do before sending the request - add relevant info to request
        this.callApi(request);
    }
}

module.exports = ThrottleManager;
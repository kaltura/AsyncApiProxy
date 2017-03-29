require('./utils/KalturaLogger');
require('./utils/KalturaAsyncProxyServerErrors');

const os = require('os');
const config = require('config');
const util = require('util');
const request = require("request");
const rateLimiter = require("simple-rate-limiter");
class ThrottleManager {

    constructor() {
        try {
            this.messagePerSeconds = config.get('throttle.messagePerTimePeriod');
            this.timePeriod = config.get('throttle.timePeriod');
            this.callApi = rateLimiter(function (message) {
                try {
                    request(message.url, function (err, res, body) {
                        //todo log response x-me , session with current server x-me and generated message.sessionId for request
                        //todo if error - log error - connect it to message.sessioId and server x-me
                    });
                }
                catch (err) {
                    //todo - handle request error
                }
            }).to(this.messagePerSeconds).per(this.timePeriod);
        }
        catch (err) {
            KalturaLogger.error(util.inspect(err));
        }
    }

    handleMessageSending(message) {
        //todo do whatever you want to do before sending the request - add relevant info to request
        this.callApi(message);
    }
}

module.exports = ThrottleManager;

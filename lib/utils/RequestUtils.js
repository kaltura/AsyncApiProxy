/**
 * Created by yossi.papiashvili on 4/2/17.
 */

require('./KalturaLogger.js');
const util = require('util');
const Promise = require('bluebird');

RequestUtils = {

    buildRequestParams: function(request, response) {
        
        return new Promise(function (resolve, reject) {
            let requestParams = request.body;
            console.log("Body = " + util.inspect(request.body));

            let pathParamsArray = request.path.substr(1).split('/');
            for (var i=0; i<pathParamsArray.length; i+=2) {
                let key = pathParamsArray[i];
                let value = pathParamsArray[i+1];
                requestParams[key] = value;
            }

            response.log("requestParams " + JSON.stringify(requestParams));
            request.requestParams = requestParams;
            resolve();
        });
    },

    getRequestHeaders: function(request){
        return request.headers;
    }
}

module.exports = RequestUtils;
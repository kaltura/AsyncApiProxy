/**
 * Created by yossi.papiashvili on 4/2/17.
 */

require('./KalturaLogger.js');
const util = require('util');
const Promise = require('bluebird');
const extend = require('util')._extend;

RequestUtils = {

    buildRequestParams: function(request, response) {
        
        return new Promise(function (resolve, reject) {
            let requestParams = request.body;      
          
          if(request.params) {
                let pathParamsArray = request.params[0].split("/");
                for (var i=0; i<pathParamsArray.length; i+=2) {
                    let key = pathParamsArray[i];
                    let value = pathParamsArray[i+1];
                    requestParams[key] = value;
                }
            }

            if(request.query)
                requestParams = extend(requestParams, request.query);

            request.log("requestParams " + JSON.stringify(requestParams));
          
            request.requestParams = requestParams;
            resolve();
        });
    },

    getRequestHeaders: function(request){
        return request.headers;
    }
}

module.exports = RequestUtils;
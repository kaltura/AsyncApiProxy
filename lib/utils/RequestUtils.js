/**
 * Created by yossi.papiashvili on 4/2/17.
 */

require('./KalturaLogger.js');
const util = require('util');
const Promise = require('bluebird');
const extend = require('util')._extend;
const ipaddr = require('ipaddr.js');
const config = require('config');
const crypto = require('crypto');

RequestUtils = {

    buildRequestParams: function(request) {
        
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

    isIpPrivate: function(ipAddress) {

        if(!RequestUtils._privateRanges) {
            const privateRanges = [
                ipaddr.parseCIDR('10.0.0.0/8'),
                ipaddr.parseCIDR('172.16.0.0/12'),
                ipaddr.parseCIDR('192.168.0.0/16'),
                ipaddr.parseCIDR('169.254.0.0/16'),
                ipaddr.parseCIDR('127.0.0.0/8')
            ];

            RequestUtils._privateRanges = privateRanges;
        }

        let parsedIp = ipaddr.parse(ipAddress);
        
        for(let privateRange of RequestUtils._privateRanges) {
            if (parsedIp.match(privateRange))
                return true;
        }

        return false;
    },
    
    getKalturaSignedIp: function(request) {
        let kalturaSignedIp = null;
        
        let kalturaRemoteAddrHeader = request.headers['X-KALTURA-REMOTE-ADDR'] || request.headers['x-kaltura-remote-addr'];
        let salt = config.get('server.remote_addr_header_salt');
        let timeout = config.get('server.remote_addr_header_timeout');
        
        if(!kalturaRemoteAddrHeader || !salt || !timeout)
            return kalturaSignedIp;
        
        let kalturaRemoteAddrHeaderParts = kalturaRemoteAddrHeader.split(",");
        let signedIp = kalturaRemoteAddrHeaderParts[0];
        let time = kalturaRemoteAddrHeaderParts[1];
        let uniqueId = kalturaRemoteAddrHeaderParts[2];
        let hash = kalturaRemoteAddrHeaderParts[3];
            
        if(Math.round(new Date().getTime()/1000) - time > timeout) {
            return kalturaSignedIp;
        }
        else if( hash !=  crypto.createHash('md5').update(signedIp + "," + time + "," + uniqueId + "," + salt).digest("hex")) {
            return kalturaSignedIp;
        }
        else {
            kalturaSignedIp = signedIp;
        }
        
        return kalturaSignedIp;
    },
    
    getRemoteAddressFromHeader(request, header) {
        let _this = this;
        let headerValue = request.headers[header];
        
        if(!headerValue)
            return null;
        
        let remoteAddrIps = headerValue.split(",");
        for(let remoteAddrIp of remoteAddrIps) {
            remoteAddrIp = remoteAddrIp.trim();
            if(!_this.isIpPrivate(remoteAddrIp)) {
                return remoteAddrIp;
            }
        }
        
        return null;
    },

    getRemoteAddressFromRequest: function(request) {
        let remoteAddress = request.connection.remoteAddress || 
                            request.socket.remoteAddress || 
                            request.connection.socket.remoteAddress;
        
        if(!remoteAddress)
            return null;

        if (ipaddr.IPv4.isValid(remoteAddress))  {
            return remoteAddress;
        }

        if(ipaddr.IPv6.isValid(remoteAddress)) {
            let remoteAddrV6 = ipaddr.IPv6.parse(remoteAddress);
            if (remoteAddrV6.isIPv4MappedAddress()) {
                return remoteAddrV6.toIPv4Address().toString();
            }
            return remoteAddress;
        }
        
        request.error(`Ip received [${remoteAddress}] is invalid`);
        return null;
    },

    getRemoteIpAddress: function(request) {
        
        let remoteAddress = this.getKalturaSignedIp(request);
        if(remoteAddress)
            return remoteAddress;
        
        remoteAddress = this.getRemoteAddressFromHeader(request, 'x-forwarded-for');
        if(remoteAddress)
            return remoteAddress;

        remoteAddress = this.getRemoteAddressFromRequest(request);
        return remoteAddress;
    },
    
}

module.exports = RequestUtils;
## async-proxy-server

Kaltura 'async-proxy-server' manages clients' api calls and forward them to kaltura api server in a speficic pase. Basically, This server is designed to cache api calls they are being call by same client constantly and handle to modes: aggregate a count for a specific call or hold only the last state of a specific call. After a TTL has passed the cached call should be sent to api server with the current data.

### Deployment
Please refer to [deployment document] (https://github.com/kaltura/AsyncApiProxy/blob/master/async_proxy_server_deployment.md)

### Copyright & License

All code in this project is released under the [AGPLv3 license](http://www.gnu.org/licenses/agpl-3.0.html) unless a different license for a particular library is specified in the applicable library path. 

Copyright © Kaltura Inc. All rights reserved.

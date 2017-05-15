# Async API Proxy Server

The goal of this server is to cache API calls made by clients and only forward them to the Kaltura Server when certain conditions are met.

## Main features:
- Matches API calls against configuration templates to determine how they should be handled  
- Supports different request types and response formats
- Upon TTL expiry, will purge the cached API call and send it to the Kaltura server
- Stores the sender IP as set in the for x-Forwarded-for header (only for ‘latest’ type of messages, not aggregation)

### Deployment
Please refer to [deployment document](async_proxy_server_deployment.md)

### Copyright & License

All code in this project is released under the [AGPLv3 license](http://www.gnu.org/licenses/agpl-3.0.html) unless a different license for a particular library is specified in the applicable library path. 

Copyright © Kaltura Inc. All rights reserved.

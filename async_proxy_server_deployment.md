Machine prerequisites:
=======================
	Git (For Ubuntu: https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-12-04)
	Node 7.6.0 or above: installation reference: https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#ubuntu-mint-elementary-os
	Node Packaged Modules (npm) 1.4.3 or above
	NVM version 0.30.1 or above

Kaltura platform required changes:
=======================
	Please note that async-proxy-server needs version Lynx-12.14.0 at least for it to run. So if you are behind please update you Kaltura installation before continuing to any of the next steps.

Repo:
=======================
	https://github.com/kaltura/AsyncApiProxy

Initial enviorment setup:
=======================
	1. Clone https://github.com/kaltura/AsyncApiProxy to /opt/kaltura/asyncProxyServer/master
	2. Navigate to /opt/kaltura/asyncProxyServer/master
	3. npm install
	4. npm install -g forever

Configure:
=======================
	1. Create a log directory (mkdir /opt/kaltura/log/asyncProxyServer)
	2. ln -s /opt/kaltura/asyncProxyServer/master /opt/kaltura/asyncProxyServer/latest
	 
	3. cp -p /opt/kaltura/asyncProxyServer/latest/config/default.template.json /opt/kaltura/asyncProxyServer/latest/config/default.json
	4. cp -p /opt/kaltura/asyncProxyServer/latest/bin/async-proxy-server.template.sh /opt/kaltura/asyncProxyServer/latest/bin/async-proxy-server.sh
	 
	5. ln -s /opt/kaltura/asyncProxyServer/latest/bin/async-proxy-server.sh /etc/init.d/kaltura_async_proxy
	6. ln -s /opt/kaltura/asyncProxyServer/latest/bin/upgrade-async-proxy-server.sh.sh /etc/init.d/kaltura_upgrade_async_proxy_server

Replace tokens in default.json file:
=======================
	@LOG_DIR@ - Your logs directory from previous step (e.g. /opt/kaltura/log/asyncProxyServer )
	@WWW_HOST@ - Your API machine host
	@http_port@ - HTTP port to run the server with
	@https_por@ - HTTPS port to run the server with
	@APP_REMOTE_ADDR_HEADER_SALT@ - Should be identical to "remote_addr_header_salt" configured in you Kaltura server configuration

Replace tokens in async-proxy-server.sh file:
=======================
	@LOG_DIR@ - Your logs directory from previous step (e.g. /opt/kaltura/log/asyncProxyServer )


Execution:
=======================
	/etc/init.d/kaltura_async_proxy start

Upgrade:
=======================
	run /etc/init.d/kaltura_upgrade_async_proxy_server @RELEASE_ID@
	Example to upgrade to 1.0 you need to execute: /etc/init.d/kaltura_upgrade_async_proxy_server 1.0
	 
	The upgrade will sync all the configuration files and will restart the service.
	Make sure that tokens in bin/async-proxy-server.sh file (ASYNC_PROXY_PATH and LOG_PATH) are pointing to the correct paths

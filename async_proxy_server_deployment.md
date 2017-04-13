Machine prerequisites:
=======================
- Git (For Ubuntu: https://www.digitalocean.com/community/tutorials/how-to-install-git-on-ubuntu-12-04)
- Node 7.6.0 or above: installation reference: https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager#ubuntu-mint-elementary-os
- Node Packaged Modules (npm) 1.4.3 or above
- NVM version 0.30.1 or above

Kaltura platform required changes:
=======================
- Please note that async-proxy-server needs version Lynx-12.14.0 at least for it to run. So if you are behind please update you Kaltura installation before continuing to any of the next steps.

Repo:
=======================
https://github.com/kaltura/AsyncApiProxy

Install:
=======================
- Clone https://github.com/kaltura/AsyncApiProxy to /opt/kaltura/asyncProxyServer/master
- Navigate to /opt/kaltura/asyncProxyServer/master
- npm install
- ln -s /opt/kaltura/asyncProxyServer/master /opt/kaltura/asyncProxyServer/latest
- ln -s /opt/kaltura/asyncProxyServer/latest/bin/async-proxy-server.sh /etc/init.d/kaltura_async_proxy
- ln -s /opt/kaltura/asyncProxyServer/latest/bin/upgrade-async-proxy-server.sh.sh /etc/init.d/kaltura_upgrade_async_proxy_server

Configure:
=======================
- Create a log directory, e.g. mkdir /opt/kaltura/log/asyncProxyServer
- cp -p /opt/kaltura/asyncProxyServer/latest/config/config.ini.template /opt/kaltura/asyncProxyServer/latest/config/config.ini

Replace tokens in config.ini file:
=======================
- @LOG_DIR@ - Your logs directory from previous step (e.g. /var/log/kAsyncProxy/ )

Modify tokens bin/async-proxy-server.sh file:
=======================
make sure that ASYNC_PROXY_PATH and LOG_PATH are pointing to the correct paths

Execution:
=======================
/etc/init.d/kaltura_async_proxy start

Upgrade:
=======================
- run /etc/init.d/kaltura_upgrade_async_proxy_server @RELEASE_ID@
- Example to upgrade to 1.0 you need to execute: /etc/init.d/kaltura_upgrade_async_proxy_server 1.0
- The upgrade will sync all the configuration files and will restart the service.
- Make sure that tokens in bin/async-proxy-server.sh file (ASYNC_PROXY_PATH and LOG_PATH) are pointing to the correct paths

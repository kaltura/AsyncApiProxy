require('./lib/utils/KalturaLogger');
const AsyncProxyManager = require('./lib/AsyncProxyManager');
const continuationLocalStorage = require('continuation-local-storage');
const KalturaAsyncProxyServerValidator = require('./lib/utils/KalturaAsyncProxyServerValidator');

function KalturaMainProcess(){
this.start();
};

KalturaMainProcess.prototype.start = function () {

	this.namespace = continuationLocalStorage.createNamespace('async-proxy-server');//Here just to make sure we create it only once
	var server = new AsyncProxyManager();
	server.startServer();

	process.on('SIGUSR1', function() {
		KalturaLogger.log('Got SIGUSR1. Invoke log rotate notification.');
		KalturaLogger.notifyLogsRotate();
	});

};

module.exports.KalturaMainProcess = KalturaMainProcess;

var KalturaProcess = new KalturaMainProcess();

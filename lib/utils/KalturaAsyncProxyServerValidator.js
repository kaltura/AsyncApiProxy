class KalturaAsyncProxyServerValidator {

	static validateConfigurations(config) {
		if (!config)
			throw new Error("No configuration is defined");

		//logger
		if (!config.has('logger'))
			throw new Error("No logger configuration section is defined in configuration file");

		if (!config.has('logger.debugEnabled'))
			throw new Error("No logger [debugEnabled] configuration parameter is defined in configuration file");
		if (!config.has('logger.logDir'))
			throw new Error("No logger [logDir] configuration parameter is defined in configuration file");
		if (!config.has('logger.accessLogName'))
			throw new Error("No logger [accessLogName] configuration parameter is defined in configuration file");
		if (!config.has('logger.logName'))
			throw new Error("No logger [logName] configuration parameter is defined in configuration file");
		if (!config.has('logger.errorLogName'))
			throw new Error("No logger [errorLogName] configuration parameter is defined in configuration file");

		//server
		if (!config.has('server'))
			throw new Error("No server configuration section is defined in configuration file");

		if (!config.has('server.version'))
			throw new Error("No server [version] configuration parameter is defined in configuration file");

		//server
		if (!config.has('cloud'))
			throw new Error("No server configuration section is defined in configuration file");

		if (!config.has('cloud.httpPort'))
			throw new Error("No cloud [httpPort] configuration parameter is defined in configuration file");
		if (!config.has('cloud.httpsPort'))
			throw new Error("No cloud [httpsPort] configuration parameter is defined in configuration file");
	}
}

module.exports = KalturaAsyncProxyServerValidator;
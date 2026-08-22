const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

const tslibPath = require.resolve("tslib/tslib.es6.js");

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "tslib" || moduleName.startsWith("tslib/")) {
    return {
      filePath: tslibPath,
      type: "sourceFile",
    };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;

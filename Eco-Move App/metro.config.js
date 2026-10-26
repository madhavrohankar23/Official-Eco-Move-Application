const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('html');
// The 40 MB original datasets belong to the isolated browser runtime, never Hermes.
config.resolver.blockList = [/[\\/]toolchain[\\/]/, /[\\/]protected[\\/]/, /[\\/]artifacts[\\/]/, /[\\/]android[\\/].*(?:[\\/]build[\\/]|[\\/]\.cxx[\\/])/];
config.maxWorkers = 2;
module.exports = config;

const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Support monorepo — watch parent dirs for shared packages
config.watchFolders = [path.resolve(__dirname, '../../')];

// Support TypeScript
config.resolver.sourceExts = ['jsx', 'js', 'ts', 'tsx', 'json'];

module.exports = config;

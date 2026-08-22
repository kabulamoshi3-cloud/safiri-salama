const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Stub out unavailable native modules during build
const stubModules = {
  'react-native-agora': path.resolve(__dirname, 'src/stubs/empty.js'),
  'react-native-background-task': path.resolve(__dirname, 'src/stubs/empty.js'),
  'react-native-secure-store': path.resolve(__dirname, 'src/stubs/empty.js'),
  'perf_hooks': path.resolve(__dirname, 'src/stubs/empty.js'),
};

config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  ...stubModules,
};

module.exports = config;

const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {
  resolver: {
    sourceExts: ['jsx', 'js', 'ts', 'tsx', 'json'],
  },
  watchFolders: [
    // Add parent directories for monorepo support
    require('path').resolve(__dirname, '../../'),
  ],
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);

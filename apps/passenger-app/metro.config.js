const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const stubPath = path.resolve(__dirname, 'src/stubs/empty.js');

// Stub all unavailable native modules
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  'react-native-agora': stubPath,
  'react-native-background-task': stubPath,
  'react-native-secure-store': stubPath,
  'react-native-vector-icons/MaterialCommunityIcons': stubPath,
  'react-native-vector-icons': stubPath,
  'react-native-maps': stubPath,
  'react-native-camera': stubPath,
  'react-native-localize': stubPath,
  '@react-native-firebase/app': stubPath,
  '@react-native-firebase/messaging': stubPath,
  '@react-native-firebase/crashlytics': stubPath,
  '@react-native-firebase/analytics': stubPath,
  '@react-native-community/netinfo': stubPath,
  '@react-native-community/geolocation': stubPath,
  'perf_hooks': stubPath,
};

module.exports = config;

import '@testing-library/jest-native/extend-expect';
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock Firebase
jest.mock('@react-native-firebase/messaging', () => ({
  messaging: jest.fn(() => ({
    requestUserPermission: jest.fn().mockResolvedValue(1),
    getToken: jest.fn().mockResolvedValue('test-token'),
    onTokenRefresh: jest.fn(),
    onMessage: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn().mockResolvedValue(null),
  })),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    PROVISIONAL: 2,
    NOT_DETERMINED: 0,
    DENIED: -1,
  },
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn().mockResolvedValue({ isConnected: true }),
  addEventListener: jest.fn(),
}));

// Mock geolocation
jest.mock('@react-native-community/geolocation', () => ({
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn(),
  clearWatch: jest.fn(),
}));

// Mock React Navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    push: jest.fn(),
  }),
  useRoute: () => ({
    params: {},
  }),
  useFocusEffect: jest.fn(),
}));

// Mock ImagePickerManager
jest.mock('react-native-image-picker', () => ({
  launchCamera: jest.fn(),
  launchImageLibrary: jest.fn(),
}));

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};

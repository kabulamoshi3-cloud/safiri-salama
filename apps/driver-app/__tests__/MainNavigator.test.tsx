import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Marker: View };
});
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

jest.mock('../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#1a73e8',
        textSecondary: '#666',
        surface: '#fff',
        border: '#eee',
      },
    },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'tabs.home': 'Home',
        'tabs.earnings': 'Earnings',
        'tabs.trips': 'Trips',
        tab_activity: 'Activity',
        tab_notifications: 'Notifications',
        tab_account: 'Account',
        'tabs.profile': 'Account',
      };
      return map[key] ?? key;
    },
  }),
}));

// Mock all leaf screens to prevent deep rendering failures
const MockView = () => {
  const { View } = require('react-native');
  return <View />;
};

jest.mock('../src/screens/main/HomeScreen', () => MockView);
jest.mock('../src/screens/main/EarningsScreen', () => MockView);
jest.mock('../src/screens/main/TripsScreen', () => MockView);
jest.mock('../src/screens/main/NotificationsScreen', () => MockView);
jest.mock('../src/screens/main/ProfileScreen', () => MockView);
jest.mock('../src/screens/trip/TripDetailsScreen', () => MockView);
jest.mock('../src/screens/trip/ActiveTripScreen', () => MockView);
jest.mock('../src/screens/trip/NavigationScreen', () => MockView);
jest.mock('../src/screens/trip/RatePassengerScreen', () => MockView);
jest.mock('../src/screens/profile/VehicleInfoScreen', () => MockView);
jest.mock('../src/screens/profile/SettingsScreen', () => MockView);
jest.mock('../src/services/api/DriverAPI', () => ({
  DriverAPI: {
    getEarnings: jest.fn(),
    getEarningsHistory: jest.fn(),
  },
}));

import MainNavigator from '../src/navigation/MainNavigator';

describe('MainNavigator', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <NavigationContainer>
          <MainNavigator />
        </NavigationContainer>
      )
    ).not.toThrow();
  });
});

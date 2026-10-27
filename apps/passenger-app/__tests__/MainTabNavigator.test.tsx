import React from 'react';
import { render } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('react-native-maps', () => {
  const { View } = require('react-native');
  return { __esModule: true, default: View, Marker: View, Polyline: View };
});
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// i18n tab labels: tab_home → 'Home', tab_activity → 'Activity', etc.
jest.mock('../i18n', () => ({
  t: (key: string) => {
    const map: Record<string, string> = {
      tab_home: 'Home',
      tab_activity: 'Activity',
      tab_payments: 'Payments',
      tab_notifications: 'Notifications',
      tab_account: 'Account',
    };
    return map[key] ?? key;
  },
  subscribe: () => () => {},
}));

// Mock all screens referenced by navigators to prevent deep rendering
jest.mock('../screens/HomeScreen', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('../screens/ActivityScreen', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('../screens/PaymentsScreen', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('../screens/NotificationsScreen', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('../screens/AccountScreen', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('../navigation/HomeStackNavigator', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('../navigation/ActivityStackNavigator', () => {
  const { View } = require('react-native');
  return () => <View />;
});
jest.mock('../navigation/AccountStackNavigator', () => {
  const { View } = require('react-native');
  return () => <View />;
});

import MainTabNavigator from '../navigation/MainTabNavigator';

describe('MainTabNavigator', () => {
  it('renders without crashing', () => {
    expect(() =>
      render(
        <NavigationContainer>
          <MainTabNavigator />
        </NavigationContainer>
      )
    ).not.toThrow();
  });

  it('shows Home tab label', () => {
    const { getByText } = render(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
    );
    expect(getByText('Home')).toBeTruthy();
  });

  it('shows Activity tab label', () => {
    const { getByText } = render(
      <NavigationContainer>
        <MainTabNavigator />
      </NavigationContainer>
    );
    expect(getByText('Activity')).toBeTruthy();
  });
});

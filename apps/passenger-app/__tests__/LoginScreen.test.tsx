import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import axios from 'axios';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);
jest.mock('expo-location', () => ({ requestForegroundPermissionsAsync: jest.fn() }));

// AnimatedButton uses Animated API; mock it to render a simple TouchableOpacity
jest.mock('../components/AnimatedButton', () => {
  const { TouchableOpacity, Text } = require('react-native');
  return function AnimatedButton({ title, onPress, disabled }: any) {
    return (
      <TouchableOpacity onPress={onPress} disabled={disabled}>
        <Text>{title}</Text>
      </TouchableOpacity>
    );
  };
});

// i18n returns key as fallback in test environment
jest.mock('../i18n', () => ({
  t: (key: string) => key,
  subscribe: () => () => {},
}));

import LoginScreen from '../screens/LoginScreen';

const mockNavigation = {
  reset: jest.fn(),
  navigate: jest.fn(),
  goBack: jest.fn(),
};

const mockRoute = { params: {} };

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders phone input with placeholder', () => {
    const { getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    // Actual placeholder from LoginScreen.tsx: "+255 7XX XXX XXX"
    expect(getByPlaceholderText('+255 7XX XXX XXX')).toBeTruthy();
  });

  it('renders password input with placeholder', () => {
    const { getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    // Actual placeholder from LoginScreen.tsx: "••••••••"
    expect(getByPlaceholderText('••••••••')).toBeTruthy();
  });

  it('does not call API when phone is too short', async () => {
    const { getByText, getByPlaceholderText } = render(
      <LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    // Clear the default "+255" value so phone.length < 10
    fireEvent.changeText(getByPlaceholderText('+255 7XX XXX XXX'), '+25');
    // Button title rendered by AnimatedButton: "login →" (i18n.t('login') + " →")
    fireEvent.press(getByText(/login/i));
    await waitFor(() => {
      expect(axios.post).not.toHaveBeenCalled();
    });
  });

  it('calls API on valid phone and password, then navigates', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        token: 'test-token',
        user: { id: '1', userType: 'passenger', name: 'Test User' },
      },
    });
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    fireEvent.changeText(getByPlaceholderText('+255 7XX XXX XXX'), '+255700000000');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText(/login/i));
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalled();
    });
  });

  it('navigates to MainTabs for passenger userType', async () => {
    (axios.post as jest.Mock).mockResolvedValueOnce({
      data: {
        token: 'test-token',
        user: { id: '1', userType: 'passenger', name: 'Test User' },
      },
    });
    const { getByPlaceholderText, getByText } = render(
      <LoginScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    fireEvent.changeText(getByPlaceholderText('+255 7XX XXX XXX'), '+255700000000');
    fireEvent.changeText(getByPlaceholderText('••••••••'), 'password123');
    fireEvent.press(getByText(/login/i));
    await waitFor(() => {
      expect(mockNavigation.reset).toHaveBeenCalledWith(
        expect.objectContaining({ routes: [expect.objectContaining({ name: 'MainTabs' })] })
      );
    });
  });
});

import React from 'react';
import { render, waitFor } from '@testing-library/react-native';
import axios from 'axios';

jest.mock('axios');
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// @expo/vector-icons is a native module; mock with a simple Text component
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('../i18n', () => ({
  t: (key: string) => key,
  subscribe: () => () => {},
}));

import ActivityScreen from '../screens/ActivityScreen';

const mockNavigation = { navigate: jest.fn(), goBack: jest.fn() };
const mockRoute = { params: {} };

describe('ActivityScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially (refreshing=false, trips=[]) then shows filter tabs', async () => {
    (axios.get as jest.Mock).mockImplementation(() => new Promise(() => {}));
    const { getByText } = render(
      <ActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    // Filter tabs are always rendered; 'all' filter is the first tab
    expect(getByText('all')).toBeTruthy();
  });

  it('shows trip pickup address after successful API call', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: '1',
          status: 'completed',
          pickup_address: 'Kariakoo',
          destination_address: 'Mlimani City',
          fare: 5000,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const { findByText } = render(
      <ActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    await findByText('Kariakoo');
  });

  it('shows destination address after successful API call', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: '1',
          status: 'completed',
          pickup_address: 'Kariakoo',
          destination_address: 'Mlimani City',
          fare: 5000,
          created_at: new Date().toISOString(),
        },
      ],
    });
    const { findByText } = render(
      <ActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    await findByText('Mlimani City');
  });

  it('shows empty state text when no trips returned', async () => {
    (axios.get as jest.Mock).mockResolvedValueOnce({ data: [] });
    const { findByText } = render(
      <ActivityScreen navigation={mockNavigation as any} route={mockRoute as any} />
    );
    // ActivityScreen.tsx: i18n.t('no_trips_yet') || 'No trips yet'
    // With mocked i18n, t('no_trips_yet') returns 'no_trips_yet'
    await findByText('no_trips_yet');
  });
});

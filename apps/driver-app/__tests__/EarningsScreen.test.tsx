import React from 'react';
import { render, waitFor } from '@testing-library/react-native';

// Mock DriverAPI used inside EarningsScreen
jest.mock('../src/services/api/DriverAPI', () => ({
  DriverAPI: {
    getEarnings: jest.fn(),
    getEarningsHistory: jest.fn(),
  },
}));

jest.mock('../src/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        primary: '#1a73e8',
        primaryDark: '#1557b0',
        background: '#f8f8f8',
        surface: '#fff',
        text: '#1c1c1e',
        textSecondary: '#666',
        border: '#eee',
        success: '#34c759',
        error: '#ff3b30',
        white: '#fff',
      },
    },
  }),
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'earnings.period.today': 'Today',
        'earnings.period.week': 'Week',
        'earnings.period.month': 'Month',
        'earnings.title': 'Earnings',
        'earnings.last7Days': 'Last 7 Days',
        'earnings.breakdown': 'Breakdown',
        'earnings.cashFares': 'Cash Fares',
        'earnings.digitalPayments': 'Digital Payments',
        'earnings.total': 'Total',
        'earnings.history': 'History',
        'earnings.noRecords': 'No records',
        'earnings.withdraw': 'Withdraw',
        'earnings.comingSoon': 'Coming soon',
        'earnings.loadError': 'Failed to load',
        'earnings.retry': 'Retry',
      };
      return map[key] ?? key;
    },
  }),
}));

import { DriverAPI } from '../src/services/api/DriverAPI';
import EarningsScreen from '../src/screens/main/EarningsScreen';

describe('EarningsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders period selector tabs (Today, Week, Month)', async () => {
    (DriverAPI.getEarnings as jest.Mock).mockResolvedValue({
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      cashCollected: 0,
      digitalPayments: 0,
    });
    (DriverAPI.getEarningsHistory as jest.Mock).mockResolvedValue([]);

    const { findByText } = render(<EarningsScreen />);

    await findByText('Today');
    await findByText('Week');
    await findByText('Month');
  });

  it('displays total earnings from API in TSh format', async () => {
    (DriverAPI.getEarnings as jest.Mock).mockResolvedValue({
      today: 45000,
      week: 45000,
      month: 45000,
      total: 45000,
      cashCollected: 36000,
      digitalPayments: 9000,
    });
    (DriverAPI.getEarningsHistory as jest.Mock).mockResolvedValue([]);

    const { findByText } = render(<EarningsScreen />);
    // formatCurrency(45000) => "TSh 45,000"
    await findByText('TSh 45,000');
  });

  it('shows empty history message when no history records', async () => {
    (DriverAPI.getEarnings as jest.Mock).mockResolvedValue({
      today: 0,
      week: 0,
      month: 0,
      total: 0,
      cashCollected: 0,
      digitalPayments: 0,
    });
    (DriverAPI.getEarningsHistory as jest.Mock).mockResolvedValue([]);

    const { findByText } = render(<EarningsScreen />);
    await findByText('No records');
  });
});

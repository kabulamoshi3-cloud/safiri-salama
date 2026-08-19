import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { DriverAPI } from '../../services/api/DriverAPI';
import type { EarningsSummary } from '../../services/api/DriverAPI';

const EarningsScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    try {
      const data = await DriverAPI.getEarnings();
      setEarnings(data);
    } catch (error) {
      console.error('Failed to load earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `TSh ${amount.toLocaleString()}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!earnings) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          Failed to load earnings
        </Text>
      </View>
    );
  }

  const selectedAmount =
    selectedPeriod === 'today'
      ? earnings.today
      : selectedPeriod === 'week'
        ? earnings.week
        : earnings.month;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('tabs.earnings')}
        </Text>
      </View>

      <View style={[styles.earningsCard, { backgroundColor: theme.colors.primary }]}>
        <Text style={[styles.earningsLabel, { color: theme.colors.white }]}>
          Period Total
        </Text>
        <Text style={[styles.earningsAmount, { color: theme.colors.white }]}>
          {formatCurrency(selectedAmount)}
        </Text>

        <View style={styles.periodSelector}>
          {(['today', 'week', 'month'] as const).map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                {
                  backgroundColor:
                    selectedPeriod === period
                      ? theme.colors.white
                      : theme.colors.primaryDark,
                },
              ]}
              onPress={() => setSelectedPeriod(period)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  {
                    color:
                      selectedPeriod === period
                        ? theme.colors.primary
                        : theme.colors.white,
                  },
                ]}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.breakdownSection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Breakdown
        </Text>

        <View style={[styles.breakdownCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabel}>
              <Icon name="cash-multiple" size={24} color={theme.colors.success} />
              <Text style={[styles.breakdownText, { color: theme.colors.text }]}>
                {t('earnings.cashCollected')}
              </Text>
            </View>
            <Text style={[styles.breakdownAmount, { color: theme.colors.text }]}>
              {formatCurrency(earnings.cashCollected)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabel}>
              <Icon name="credit-card" size={24} color={theme.colors.primary} />
              <Text style={[styles.breakdownText, { color: theme.colors.text }]}>
                {t('earnings.digitalPayments')}
              </Text>
            </View>
            <Text style={[styles.breakdownAmount, { color: theme.colors.text }]}>
              {formatCurrency(earnings.digitalPayments)}
            </Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <View style={styles.breakdownLabel}>
              <Icon name="clock-outline" size={24} color={theme.colors.warning} />
              <Text style={[styles.breakdownText, { color: theme.colors.text }]}>
                {t('earnings.pendingPayment')}
              </Text>
            </View>
            <Text style={[styles.breakdownAmount, { color: theme.colors.text }]}>
              {formatCurrency(earnings.pendingPayment)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.summarySection}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          All Time
        </Text>

        <View style={[styles.summaryCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>
              {t('earnings.totalEarnings')}
            </Text>
            <Text style={[styles.summaryAmount, { color: theme.colors.primary }]}>
              {formatCurrency(earnings.total)}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
  },
  header: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  earningsCard: {
    margin: 16,
    padding: 24,
    borderRadius: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  earningsLabel: {
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 8,
  },
  earningsAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  periodSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  breakdownSection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  breakdownCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  breakdownLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  breakdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  breakdownAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  summarySection: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  summaryCard: {
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default EarningsScreen;

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { WalletAPI } from '../../services/api/WalletAPI';
import type { Transaction } from '@dalasmart/shared-types';

const TransactionHistoryScreen: React.FC = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTransactions();
  }, []);

  const loadTransactions = async () => {
    try {
      const data = await WalletAPI.getTransactions(50);
      setTransactions(data);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <View style={[styles.transactionCard, { backgroundColor: theme.colors.surface }]}>
      <View style={styles.transactionHeader}>
        <Text style={[styles.transactionType, { color: theme.colors.text }]}>
          {item.type.toUpperCase()}
        </Text>
        <Text
          style={[
            styles.transactionAmount,
            { color: item.type === 'topup' ? theme.colors.success : theme.colors.error },
          ]}
        >
          {item.type === 'topup' ? '+' : '-'}TSh {item.amount.toLocaleString()}
        </Text>
      </View>
      <Text style={[styles.transactionDate, { color: theme.colors.textSecondary }]}>
        {formatDate(item.timestamp)}
      </Text>
      <View style={[styles.statusBadge, { backgroundColor: theme.colors.success + '20' }]}>
        <Text style={[styles.statusText, { color: theme.colors.success }]}>
          {item.status}
        </Text>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
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
  list: {
    padding: 16,
  },
  transactionCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '600',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionDate: {
    fontSize: 14,
    marginBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
});

export default TransactionHistoryScreen;

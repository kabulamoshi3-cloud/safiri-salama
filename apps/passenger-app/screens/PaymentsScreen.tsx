import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  ActivityIndicator, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import i18n from '../i18n';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://safiriharaka-api.vercel.app/api/v1';
const POLL_INTERVAL_MS = 30_000;

interface PaymentMethod {
  method: string;
  label: string;
  recommended: boolean;
  available: boolean;
  balance?: number;
}

interface PaymentInfo {
  masked_phone: string;
  detected_provider: string | null;
  wallet_balance: number;
  wallet_balance_formatted: string;
  payment_methods: PaymentMethod[];
}

interface Transaction {
  id: string;
  reference: string;
  amount: number;
  method: string;
  provider: string;
  status: string;
  description: string;
  created_at: string;
  context: string;
}

const METHOD_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  mpesa:        'phone-portrait-outline',
  airtel_money: 'phone-portrait-outline',
  tigo_pesa:    'phone-portrait-outline',
  halotel:      'phone-portrait-outline',
  wallet:       'wallet-outline',
  qr_code:      'qr-code-outline',
  cash:         'cash-outline',
};

const STATUS_COLORS: Record<string, string> = {
  completed:            '#34c759',
  pending:              '#ffc107',
  failed:               '#ff3b30',
  expired:              '#999',
  pending_confirmation: '#007aff',
};

export default function PaymentsScreen() {
  const [paymentInfo, setPaymentInfo] = useState<PaymentInfo | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingInfo, setLoadingInfo] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedTx, setExpandedTx] = useState<string | null>(null);

  const fetchPaymentInfo = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@safiriharaka:token');
      const res = await axios.get(`${API}/payments/info`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPaymentInfo(res.data);
    } catch (err) {
      console.error('Failed to fetch payment info:', err);
    } finally {
      setLoadingInfo(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const token = await AsyncStorage.getItem('@safiriharaka:token');
      const res = await axios.get(`${API}/payments/history`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { limit: 20 },
      });
      const data = res.data;
      setTransactions(Array.isArray(data) ? data : data.transactions ?? data.history ?? []);
    } catch (err) {
      console.error('Failed to fetch payment history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchPaymentInfo(), fetchHistory()]);
  }, [fetchPaymentInfo, fetchHistory]);

  useEffect(() => {
    fetchAll();

    const timer = setInterval(fetchAll, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchAll]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  const isLoading = loadingInfo && loadingHistory;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007aff" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('payments_title') || 'Payments'}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Wallet balance */}
        {paymentInfo && (
          <View style={styles.walletCard}>
            <Ionicons name="wallet" size={28} color="#fff" />
            <Text style={styles.walletLabel}>Safiri Haraka Wallet</Text>
            <Text style={styles.walletBalance}>{paymentInfo.wallet_balance_formatted}</Text>
            {paymentInfo.masked_phone ? (
              <Text style={styles.walletPhone}>{paymentInfo.masked_phone}</Text>
            ) : null}
          </View>
        )}

        {/* Payment Methods */}
        {paymentInfo && paymentInfo.payment_methods.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>{i18n.t('payment_method') || 'Payment Methods'}</Text>
            {paymentInfo.payment_methods.map((method: PaymentMethod) => (
              <View key={method.method} style={styles.methodCard}>
                <View style={styles.methodLeft}>
                  <Ionicons
                    name={METHOD_ICONS[method.method] ?? 'card-outline'}
                    size={24}
                    color="#007aff"
                    style={styles.methodIcon}
                  />
                  <View style={styles.methodInfo}>
                    <Text style={styles.methodName}>{method.label}</Text>
                    {method.recommended && (
                      <Text style={styles.methodRecommended}>Recommended for your number</Text>
                    )}
                  </View>
                </View>
                {method.recommended && (
                  <Ionicons name="checkmark-circle" size={24} color="#34c759" />
                )}
              </View>
            ))}
          </>
        )}

        {/* Transaction History */}
        <View style={styles.transactionsSection}>
          <Text style={styles.sectionTitle}>{i18n.t('transaction_history') || 'Transaction History'}</Text>

          {loadingHistory && transactions.length === 0 ? (
            <ActivityIndicator color="#007aff" style={{ marginVertical: 20 }} />
          ) : transactions.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="receipt-outline" size={48} color="#ccc" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          ) : (
            transactions.map((tx: Transaction) => {
              const isExpanded = expandedTx === tx.id || expandedTx === tx.reference;
              const txKey = tx.id ?? tx.reference;
              return (
                <TouchableOpacity
                  key={txKey}
                  style={styles.transactionCard}
                  onPress={() =>
                    setExpandedTx(isExpanded ? null : txKey)
                  }
                  activeOpacity={0.8}
                >
                  <View style={styles.transactionRow}>
                    <View style={styles.transactionLeft}>
                      <View style={styles.transactionIcon}>
                        <Ionicons
                          name={METHOD_ICONS[tx.method] ?? METHOD_ICONS[tx.provider] ?? 'card-outline'}
                          size={20}
                          color="#007aff"
                        />
                      </View>
                      <View style={styles.transactionInfo}>
                        <Text style={styles.transactionDesc} numberOfLines={1}>
                          {tx.description || tx.context || 'Payment'}
                        </Text>
                        <Text style={styles.transactionDate}>{formatDate(tx.created_at)}</Text>
                      </View>
                    </View>
                    <View style={styles.transactionRight}>
                      <Text style={styles.transactionAmount}>
                        Sh {Number(tx.amount).toLocaleString()}
                      </Text>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: STATUS_COLORS[tx.status] ?? '#999' },
                        ]}
                      />
                    </View>
                  </View>

                  {isExpanded && (
                    <View style={styles.txDetail}>
                      <View style={styles.txDetailRow}>
                        <Text style={styles.txDetailLabel}>Reference</Text>
                        <Text style={styles.txDetailValue}>{tx.reference}</Text>
                      </View>
                      <View style={styles.txDetailRow}>
                        <Text style={styles.txDetailLabel}>Method</Text>
                        <Text style={styles.txDetailValue}>{tx.method}</Text>
                      </View>
                      <View style={styles.txDetailRow}>
                        <Text style={styles.txDetailLabel}>Status</Text>
                        <Text style={[styles.txDetailValue, { color: STATUS_COLORS[tx.status] ?? '#999' }]}>
                          {tx.status}
                        </Text>
                      </View>
                      <View style={styles.txDetailRow}>
                        <Text style={styles.txDetailLabel}>Amount</Text>
                        <Text style={styles.txDetailValue}>Sh {Number(tx.amount).toLocaleString()}</Text>
                      </View>
                      <View style={styles.txDetailRow}>
                        <Text style={styles.txDetailLabel}>Date</Text>
                        <Text style={styles.txDetailValue}>{new Date(tx.created_at).toLocaleString()}</Text>
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1c1c1e' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },

  walletCard: {
    backgroundColor: '#007aff',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  walletLabel: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 8 },
  walletBalance: { fontSize: 32, fontWeight: '800', color: '#fff', marginTop: 4 },
  walletPhone: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 6 },

  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginBottom: 16 },

  methodCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  methodLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  methodIcon: { marginRight: 14 },
  methodInfo: { flex: 1 },
  methodName: { fontSize: 16, fontWeight: '600', color: '#1c1c1e' },
  methodRecommended: { fontSize: 12, color: '#34c759', marginTop: 2 },

  transactionsSection: { marginTop: 8 },

  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: { fontSize: 16, color: '#999', marginTop: 12 },

  transactionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  transactionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e3f2fd',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: { flex: 1 },
  transactionDesc: { fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
  transactionDate: { fontSize: 13, color: '#999', marginTop: 2 },
  transactionRight: { alignItems: 'flex-end' },
  transactionAmount: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 4,
  },
  txDetail: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  txDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  txDetailLabel: { fontSize: 13, color: '#999' },
  txDetailValue: { fontSize: 13, fontWeight: '600', color: '#1c1c1e', flex: 1, textAlign: 'right' },
});

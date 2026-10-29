import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import i18n from '../i18n';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';

interface EarningsSummary {
  today: number;
  week: number;
  month: number;
  total: number;
  cashCollected: number;
  digitalPayments: number;
  pendingPayment: number;
}

export default function EarningsScreen() {
  const [data, setData] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const load = useCallback(async () => {
    try {
      setError(null);
      const token = await AsyncStorage.getItem('@skyrex:token');
      const resp = await axios.get<EarningsSummary>(`${API_BASE}/earnings/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(resp.data);
    } catch (err) {
      console.error('EarningsScreen load error:', err);
      setError(i18n.t('load_error'));
    }
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const fmt = (n: number) => `TSh ${Math.round(n).toLocaleString()}`;

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#2e7d32" />
      </View>
    );
  }

  if (error || !data) {
    return (
      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error ?? i18n.t('error')}</Text>
          <Text style={styles.hintText}>{i18n.t('pull_to_refresh')}</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#2e7d32']} />
      }
    >
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>{i18n.t('this_week')}</Text>
        <Text style={styles.summaryAmount}>{fmt(data.week)}</Text>
        <Text style={styles.summaryLabel}>{i18n.t('total_label')} {fmt(data.total)}</Text>
      </View>

      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>{i18n.t('breakdown')}</Text>
        {[
          { label: i18n.t('today'), amount: fmt(data.today) },
          { label: i18n.t('this_month'), amount: fmt(data.month) },
          { label: i18n.t('cash_fares'), amount: fmt(data.cashCollected) },
          { label: i18n.t('digital_payments'), amount: fmt(data.digitalPayments) },
        ].map((item) => (
          <View key={item.label} style={styles.row}>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.rowAmount}>{item.amount}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>{i18n.t('net_earnings')}</Text>
          <Text style={styles.totalAmount}>{fmt(data.total)}</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#f5f5f5' },
  centered:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  errorText:      { fontSize: 15, color: '#c00', textAlign: 'center', marginBottom: 8 },
  hintText:       { fontSize: 13, color: '#999', textAlign: 'center' },
  summaryCard: {
    backgroundColor: '#2e7d32', margin: 16, padding: 24,
    borderRadius: 14, alignItems: 'center',
  },
  summaryLabel:   { fontSize: 14, color: '#c8e6c9' },
  summaryAmount:  { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 4, marginBottom: 6 },
  breakdownCard:  { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 20 },
  breakdownTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 14 },
  row:            { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel:       { fontSize: 14, color: '#666' },
  rowAmount:      { fontSize: 14, color: '#333' },
  divider:        { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  totalLabel:     { fontSize: 15, fontWeight: '600', color: '#333' },
  totalAmount:    { fontSize: 15, fontWeight: 'bold', color: '#2e7d32' },
});

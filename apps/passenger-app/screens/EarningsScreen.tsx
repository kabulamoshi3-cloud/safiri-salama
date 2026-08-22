import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export default function EarningsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>This Week</Text>
        <Text style={styles.summaryAmount}>Sh 0</Text>
        <Text style={styles.summaryTrips}>0 trips completed</Text>
      </View>

      <View style={styles.breakdownCard}>
        <Text style={styles.breakdownTitle}>Breakdown</Text>
        {[
          { label: 'Trip fares', amount: 'Sh 0' },
          { label: 'Bonuses', amount: 'Sh 0' },
          { label: 'Tips', amount: 'Sh 0' },
          { label: 'Commission (-15%)', amount: '- Sh 0' },
        ].map((item) => (
          <View key={item.label} style={styles.row}>
            <Text style={styles.rowLabel}>{item.label}</Text>
            <Text style={styles.rowAmount}>{item.amount}</Text>
          </View>
        ))}
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.totalLabel}>Net Earnings</Text>
          <Text style={styles.totalAmount}>Sh 0</Text>
        </View>
      </View>

      <View style={styles.historyCard}>
        <Text style={styles.breakdownTitle}>Recent Payouts</Text>
        <Text style={styles.emptyText}>No payouts yet</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  summaryCard: {
    backgroundColor: '#2e7d32', margin: 16, padding: 24,
    borderRadius: 14, alignItems: 'center',
  },
  summaryLabel: { fontSize: 14, color: '#c8e6c9' },
  summaryAmount: { fontSize: 36, fontWeight: 'bold', color: '#fff', marginTop: 4 },
  summaryTrips: { fontSize: 13, color: '#c8e6c9', marginTop: 6 },
  breakdownCard: { backgroundColor: '#fff', marginHorizontal: 16, borderRadius: 12, padding: 20 },
  breakdownTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  rowLabel: { fontSize: 14, color: '#666' },
  rowAmount: { fontSize: 14, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  totalLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  totalAmount: { fontSize: 15, fontWeight: 'bold', color: '#2e7d32' },
  historyCard: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 20 },
  emptyText: { fontSize: 14, color: '#999', textAlign: 'center', marginTop: 10 },
});

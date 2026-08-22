import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';

const trips = [
  { id: '1', from: 'Kariakoo', to: 'Sinza', fare: 'Sh 3,500', date: 'Today', status: 'completed' },
  { id: '2', from: 'Mwenge', to: 'Ubungo', fare: 'Sh 2,000', date: 'Yesterday', status: 'completed' },
  { id: '3', from: 'Posta', to: 'Masaki', fare: 'Sh 5,000', date: '2 days ago', status: 'completed' },
];

export default function TripsScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={trips}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={styles.tripCard}>
            <View style={styles.tripHeader}>
              <Text style={styles.tripDate}>{item.date}</Text>
              <Text style={styles.tripFare}>{item.fare}</Text>
            </View>
            <Text style={styles.tripRoute}>{item.from} → {item.to}</Text>
            <Text style={styles.tripStatus}>✓ {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No trips yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  tripCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16,
    marginBottom: 12, elevation: 1,
  },
  tripHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tripDate: { fontSize: 12, color: '#999' },
  tripFare: { fontSize: 14, fontWeight: '600', color: '#1a73e8' },
  tripRoute: { fontSize: 16, color: '#333', marginBottom: 4 },
  tripStatus: { fontSize: 12, color: '#4caf50' },
  empty: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, color: '#999' },
});

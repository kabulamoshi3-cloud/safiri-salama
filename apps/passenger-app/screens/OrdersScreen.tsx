import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import i18n from '../i18n';

const API = 'https://simon-daladala-api.vercel.app/api/v1';

export default function OrdersScreen({ navigation }: any) {
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const res = await axios.get(`${API}/trips`, { headers: { Authorization: `Bearer ${token}` } });
      setTrips(res.data.trips || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  const getStatusColor = (s: string) => s === 'completed' ? '#34c759' : s === 'cancelled' ? '#ff3b30' : '#ff9500';
  const getVehicle = (t: string) => t === 'bajaji' ? '🛺' : t === 'boda-boda' ? '🏍️' : '🚗';
  const getStatusLabel = (s: string) => {
    if (s === 'completed') return i18n.t('completed');
    if (s === 'cancelled') return i18n.t('cancelled');
    if (s === 'pending') return i18n.t('pending');
    if (s === 'in_progress') return i18n.t('trip_in_progress');
    if (s === 'accepted') return i18n.t('accept');
    return s;
  };

  const filtered = filter === 'all' ? trips : trips.filter(t => t.status === filter);

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color="#34c759" /></View>;

  return (
    <View style={styles.container}>
      <View style={styles.filterRow}>
        {['all', 'completed', 'cancelled', 'pending'].map(f => (
          <TouchableOpacity key={f} style={[styles.chip, filter === f && styles.chipActive]} onPress={() => setFilter(f)}>
            <Text style={[styles.chipText, filter === f && styles.chipTextActive]}>{i18n.t(f)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrips(); }} />}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardTop}>
              <Text style={styles.vehicle}>{getVehicle(item.vehicle_type)}</Text>
              <View style={[styles.badge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                <Text style={[styles.badgeText, { color: getStatusColor(item.status) }]}>{getStatusLabel(item.status)}</Text>
              </View>
            </View>
            <View style={styles.route}>
              <View style={styles.routeRow}><View style={[styles.dot, { backgroundColor: '#34c759' }]} /><Text style={styles.routeText}>{item.pickup_address || i18n.t('pickup_location')}</Text></View>
              <View style={styles.line} />
              <View style={styles.routeRow}><View style={[styles.dot, { backgroundColor: '#ff3b30' }]} /><Text style={styles.routeText}>{item.dropoff_address || i18n.t('destination')}</Text></View>
            </View>
            <View style={styles.cardBottom}>
              <Text style={styles.fare}>Sh {(item.final_fare || item.estimated_fare || 0).toLocaleString()}</Text>
              <TouchableOpacity style={styles.rebookBtn} onPress={() => navigation.navigate('RideRequest')}>
                <Text style={styles.rebookText}>{i18n.t('rebook')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<View style={styles.center}><Ionicons name="car-outline" size={50} color="#ddd" /><Text style={styles.empty}>{i18n.t('no_trips')}</Text></View>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 },
  filterRow: { flexDirection: 'row', padding: 12, backgroundColor: '#fff' },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: '#f0f0f0', marginRight: 8 },
  chipActive: { backgroundColor: '#34c759' },
  chipText: { fontSize: 12, fontWeight: '600', color: '#666' },
  chipTextActive: { color: '#fff' },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 12, elevation: 2 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  vehicle: { fontSize: 24 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  route: { marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  line: { width: 1, height: 10, backgroundColor: '#ddd', marginLeft: 3.5 },
  routeText: { fontSize: 14, color: '#333', flex: 1 },
  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#f5f5f5', paddingTop: 10 },
  fare: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  rebookBtn: { backgroundColor: '#34c75920', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 8 },
  rebookText: { fontSize: 12, fontWeight: '600', color: '#34c759' },
  empty: { fontSize: 16, color: '#999', marginTop: 12 },
});

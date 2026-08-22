import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = 'https://simon-daladala-api.vercel.app/api/v1';

interface Trip {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  estimated_fare: number;
  final_fare: number;
  vehicle_type: string;
  status: string;
  payment_method: string;
  created_at: string;
  passenger_rating: number;
}

export default function TripsScreen() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { fetchTrips(); }, []);

  const fetchTrips = async () => {
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      if (!token) return;
      const res = await axios.get(`${API}/trips`, { headers: { Authorization: `Bearer ${token}` } });
      setTrips(res.data.trips || []);
    } catch (e) { console.log('Failed to load trips'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4caf50';
      case 'cancelled': return '#f44336';
      case 'in_progress': return '#2196f3';
      default: return '#ff9800';
    }
  };

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case 'bajaji': return '🛺';
      case 'boda-boda': return '🏍️';
      default: return '🚗';
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    if (diff < 86400000) return 'Today';
    if (diff < 172800000) return 'Yesterday';
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  };

  const filteredTrips = filter === 'all' ? trips : trips.filter(t => t.status === filter);

  const renderTrip = ({ item }: { item: Trip }) => (
    <TouchableOpacity style={styles.tripCard} activeOpacity={0.7}>
      <View style={styles.tripHeader}>
        <View style={styles.tripVehicle}>
          <Text style={styles.vehicleIcon}>{getVehicleIcon(item.vehicle_type)}</Text>
        </View>
        <View style={styles.tripInfo}>
          <Text style={styles.tripDate}>{formatDate(item.created_at)}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {item.status?.replace('_', ' ')}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.routeSection}>
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: '#4caf50' }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.pickup_address || 'Pickup'}</Text>
        </View>
        <View style={styles.routeLine} />
        <View style={styles.routeRow}>
          <View style={[styles.routeDot, { backgroundColor: '#f44336' }]} />
          <Text style={styles.routeText} numberOfLines={1}>{item.dropoff_address || 'Destination'}</Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <Text style={styles.tripFare}>Sh {(item.final_fare || item.estimated_fare || 0).toLocaleString()}</Text>
        <View style={styles.paymentBadge}>
          <Ionicons name={item.payment_method === 'cash' ? 'cash-outline' : 'phone-portrait-outline'} size={14} color="#666" />
          <Text style={styles.paymentText}>{item.payment_method || 'cash'}</Text>
        </View>
        {item.passenger_rating && (
          <View style={styles.ratingBadge}>
            <Ionicons name="star" size={12} color="#ffc107" />
            <Text style={styles.ratingText}>{item.passenger_rating}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#1a73e8" /></View>;
  }

  return (
    <View style={styles.container}>
      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {[
          { id: 'all', label: 'All' },
          { id: 'completed', label: 'Completed' },
          { id: 'cancelled', label: 'Cancelled' },
          { id: 'pending', label: 'Pending' },
        ].map((f) => (
          <TouchableOpacity
            key={f.id}
            style={[styles.filterChip, filter === f.id && styles.filterActive]}
            onPress={() => setFilter(f.id)}
          >
            <Text style={[styles.filterText, filter === f.id && styles.filterTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={filteredTrips}
        renderItem={renderTrip}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchTrips(); }} colors={['#1a73e8']} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={60} color="#ddd" />
            <Text style={styles.emptyTitle}>No trips yet</Text>
            <Text style={styles.emptySubtext}>Your ride history will appear here</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#fff' },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f0f0f0', marginRight: 8 },
  filterActive: { backgroundColor: '#1a73e8' },
  filterText: { fontSize: 13, color: '#666', fontWeight: '500' },
  filterTextActive: { color: '#fff' },
  tripCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 8 },
  tripHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  tripVehicle: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#f0f4ff', justifyContent: 'center', alignItems: 'center' },
  vehicleIcon: { fontSize: 20 },
  tripInfo: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginLeft: 12 },
  tripDate: { fontSize: 13, color: '#999' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  routeSection: { marginBottom: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 3 },
  routeDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  routeLine: { width: 1, height: 12, backgroundColor: '#ddd', marginLeft: 3.5, marginVertical: 1 },
  routeText: { fontSize: 14, color: '#333', flex: 1 },
  tripFooter: { flexDirection: 'row', alignItems: 'center', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f5f5f5' },
  tripFare: { fontSize: 16, fontWeight: '700', color: '#1a73e8', flex: 1 },
  paymentBadge: { flexDirection: 'row', alignItems: 'center', marginRight: 12 },
  paymentText: { fontSize: 12, color: '#666', marginLeft: 4, textTransform: 'capitalize' },
  ratingBadge: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { fontSize: 12, color: '#666', marginLeft: 3 },
  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 13, color: '#ccc', marginTop: 4 },
});

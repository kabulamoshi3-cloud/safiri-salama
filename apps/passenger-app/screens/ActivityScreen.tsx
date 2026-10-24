import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import i18n from '../i18n';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://safiriharaka-api.vercel.app/api/v1';

export default function ActivityScreen({ navigation }: any) {
  const [filter, setFilter] = useState('all');
  const [trips, setTrips] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTrips();
  }, [filter]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('@safiriharaka:token');
      const res = await axios.get(`${API}/trips`, {
        headers: { Authorization: `Bearer ${token}` },
        params: filter !== 'all' ? { status: filter } : {},
      });
      setTrips(res.data || []);
    } catch (error) {
      console.error('Failed to fetch trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return i18n.t('today') || 'Today';
    if (days === 1) return i18n.t('yesterday') || 'Yesterday';
    return date.toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#34c759';
      case 'cancelled': return '#ff3b30';
      case 'in_progress': return '#007aff';
      default: return '#ffc107';
    }
  };

  const getStatusText = (status: string) => {
    return i18n.t(status) || status;
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('activity_title') || 'Activity'}</Text>
      </View>

      {/* Filter tabs */}
      <View style={styles.filterRow}>
        {['all', 'completed', 'cancelled', 'in_progress'].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterTabActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {i18n.t(f) || f.replace('_', ' ')}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Trips list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchTrips} />}
      >
        {trips.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="car-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>{i18n.t('no_trips_yet') || 'No trips yet'}</Text>
            <Text style={styles.emptySubtext}>
              {i18n.t('trip_history_message') || 'Your ride history will appear here'}
            </Text>
          </View>
        ) : (
          trips.map((trip: any) => (
            <TouchableOpacity
              key={trip.id}
              style={styles.tripCard}
              onPress={() => navigation.navigate('TripDetail', { tripId: trip.id })}
            >
              <View style={styles.tripHeader}>
                <View style={styles.tripRoute}>
                  <Ionicons name="location" size={18} color="#34c759" />
                  <Text style={styles.tripLocation} numberOfLines={1}>
                    {trip.pickup_address || i18n.t('pickup')}
                  </Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(trip.status) }]}>
                  <Text style={styles.statusText}>{getStatusText(trip.status)}</Text>
                </View>
              </View>

              <View style={styles.tripRoute}>
                <Ionicons name="location" size={18} color="#ff3b30" />
                <Text style={styles.tripLocation} numberOfLines={1}>
                  {trip.destination_address || i18n.t('destination')}
                </Text>
              </View>

              <View style={styles.tripFooter}>
                <Text style={styles.tripDate}>{formatDate(trip.created_at)}</Text>
                <Text style={styles.tripFare}>Sh {trip.fare?.toLocaleString() || '0'}</Text>
              </View>

              {trip.status === 'completed' && trip.rating && (
                <View style={styles.ratingRow}>
                  {[...Array(5)].map((_, i) => (
                    <Ionicons
                      key={i}
                      name={i < trip.rating ? 'star' : 'star-outline'}
                      size={14}
                      color="#ffc107"
                    />
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1c1c1e' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f7',
  },
  filterTabActive: { backgroundColor: '#007aff' },
  filterText: { fontSize: 14, fontWeight: '600', color: '#666' },
  filterTextActive: { color: '#fff' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8 },
  tripCard: {
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
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  tripRoute: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  tripLocation: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginLeft: 8 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#fff' },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  tripDate: { fontSize: 13, color: '#999' },
  tripFare: { fontSize: 16, fontWeight: '700', color: '#1c1c1e' },
  ratingRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
});

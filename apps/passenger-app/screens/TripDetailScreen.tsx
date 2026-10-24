import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://safiri-salama.vercel.app/api/v1';

const STATUS_COLORS: Record<string, string> = {
  REQUESTED:       '#ffc107',
  ACCEPTED:        '#007aff',
  DRIVER_ARRIVING: '#007aff',
  ARRIVED:         '#5856d6',
  IN_PROGRESS:     '#34aadc',
  COMPLETED:       '#34c759',
  CANCELLED:       '#ff3b30',
};

const STATUS_LABELS: Record<string, string> = {
  REQUESTED:       'Requested',
  ACCEPTED:        'Accepted',
  DRIVER_ARRIVING: 'Driver Arriving',
  ARRIVED:         'Driver Arrived',
  IN_PROGRESS:     'In Progress',
  COMPLETED:       'Completed',
  CANCELLED:       'Cancelled',
};

interface StateLogEntry {
  id: string;
  from_state: string | null;
  to_state: string;
  actor_type: string;
  created_at: string;
  note: string | null;
}

interface Trip {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  fare: number;
  estimated_fare: number;
  created_at: string;
  completed_at: string | null;
  driver: {
    id: string;
    name: string;
    phone: string;
    rating: number;
    vehicle: {
      make: string;
      model: string;
      color: string;
      plate: string;
      type: string;
    } | null;
  } | null;
  state_log: StateLogEntry[];
}

export default function TripDetailScreen({ route }: any) {
  const { tripId } = route.params ?? {};
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tripId) fetchTrip();
  }, [tripId]);

  const fetchTrip = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const res = await axios.get(`${API}/trips/${tripId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setTrip(res.data);
    } catch (err: any) {
      setError(err?.response?.data?.error ?? 'Failed to load trip details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    }) + ' · ' + d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007aff" />
      </SafeAreaView>
    );
  }

  if (error || !trip) {
    return (
      <SafeAreaView style={styles.centered}>
        <Ionicons name="alert-circle-outline" size={48} color="#ff3b30" />
        <Text style={styles.errorText}>{error ?? 'Trip not found'}</Text>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[trip.status] ?? '#999';
  const statusLabel = STATUS_LABELS[trip.status] ?? trip.status;
  const fare = trip.fare ?? trip.estimated_fare ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
        <Text style={styles.statusText}>{statusLabel}</Text>
      </View>

      {/* Route card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Route</Text>
        <View style={styles.routeRow}>
          <Ionicons name="location" size={20} color="#34c759" />
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>Pickup</Text>
            <Text style={styles.routeAddress}>{trip.pickup_address || '—'}</Text>
          </View>
        </View>
        <View style={styles.routeDivider} />
        <View style={styles.routeRow}>
          <Ionicons name="location" size={20} color="#ff3b30" />
          <View style={styles.routeTextWrap}>
            <Text style={styles.routeLabel}>Dropoff</Text>
            <Text style={styles.routeAddress}>{trip.dropoff_address || '—'}</Text>
          </View>
        </View>
      </View>

      {/* Fare + date */}
      <View style={styles.card}>
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Ionicons name="cash-outline" size={20} color="#007aff" />
            <Text style={styles.infoLabel}>Fare</Text>
            <Text style={styles.infoValue}>Sh {fare.toLocaleString()}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#007aff" />
            <Text style={styles.infoLabel}>Date</Text>
            <Text style={styles.infoValue}>{formatDate(trip.created_at)}</Text>
          </View>
        </View>
      </View>

      {/* Driver card */}
      {trip.driver?.id ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Driver</Text>
          <View style={styles.driverRow}>
            <View style={styles.driverAvatar}>
              <Text style={styles.driverAvatarText}>
                {trip.driver.name?.charAt(0)?.toUpperCase() ?? 'D'}
              </Text>
            </View>
            <View style={styles.driverInfo}>
              <Text style={styles.driverName}>{trip.driver.name}</Text>
              {trip.driver.rating != null && (
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={14} color="#ffc107" />
                  <Text style={styles.ratingText}>{trip.driver.rating}</Text>
                </View>
              )}
              {trip.driver.vehicle && (
                <Text style={styles.vehicleText}>
                  {trip.driver.vehicle.color} {trip.driver.vehicle.make} {trip.driver.vehicle.model}
                  {' · '}{trip.driver.vehicle.plate}
                </Text>
              )}
            </View>
          </View>
        </View>
      ) : null}

      {/* Timeline */}
      {trip.state_log && trip.state_log.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Timeline</Text>
          {[...trip.state_log].reverse().map((entry, idx) => (
            <View key={entry.id ?? idx} style={styles.timelineRow}>
              <View style={styles.timelineDot} />
              <View style={styles.timelineContent}>
                <Text style={styles.timelineState}>
                  {STATUS_LABELS[entry.to_state] ?? entry.to_state}
                </Text>
                <Text style={styles.timelineDate}>{formatDate(entry.created_at)}</Text>
                {entry.note ? (
                  <Text style={styles.timelineNote}>{entry.note}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorText: { fontSize: 16, color: '#ff3b30', marginTop: 12, textAlign: 'center' },

  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 16,
  },
  statusText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  card: {
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
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#999', textTransform: 'uppercase', marginBottom: 12 },

  routeRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 4 },
  routeTextWrap: { flex: 1, marginLeft: 12 },
  routeLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: '600' },
  routeAddress: { fontSize: 15, color: '#1c1c1e', fontWeight: '600', marginTop: 2 },
  routeDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8, marginLeft: 32 },

  infoRow: { flexDirection: 'row', justifyContent: 'space-around' },
  infoItem: { alignItems: 'center', flex: 1 },
  infoLabel: { fontSize: 11, color: '#999', textTransform: 'uppercase', fontWeight: '600', marginTop: 4 },
  infoValue: { fontSize: 14, fontWeight: '700', color: '#1c1c1e', marginTop: 2, textAlign: 'center' },

  driverRow: { flexDirection: 'row', alignItems: 'center' },
  driverAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  driverAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  driverInfo: { flex: 1 },
  driverName: { fontSize: 17, fontWeight: '700', color: '#1c1c1e' },
  ratingRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  ratingText: { fontSize: 13, color: '#666', marginLeft: 4 },
  vehicleText: { fontSize: 13, color: '#999', marginTop: 4 },

  timelineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  timelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#007aff',
    marginTop: 4,
    marginRight: 12,
  },
  timelineContent: { flex: 1 },
  timelineState: { fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
  timelineDate: { fontSize: 12, color: '#999', marginTop: 2 },
  timelineNote: { fontSize: 13, color: '#666', marginTop: 2 },
});

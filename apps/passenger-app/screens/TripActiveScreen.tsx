import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator,
} from 'react-native';

type TripStatus = 'searching' | 'accepted' | 'arriving' | 'in_progress' | 'completed';

export default function TripActiveScreen({ route, navigation }: any) {
  const { pickup, destination, vehicle, fare, paymentMethod } = route.params;
  const [status, setStatus] = useState<TripStatus>('searching');
  const [driver, setDriver] = useState({ name: '', plate: '', rating: 0, vehicle: '' });
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    // Simulate trip flow
    const timers: NodeJS.Timeout[] = [];

    timers.push(setTimeout(() => {
      setDriver({ name: 'Juma Hassan', plate: 'T 456 DFS', rating: 4.8, vehicle: vehicle });
      setStatus('accepted');
    }, 3000));

    timers.push(setTimeout(() => setStatus('arriving'), 8000));
    timers.push(setTimeout(() => setStatus('in_progress'), 14000));
    timers.push(setTimeout(() => setStatus('completed'), 25000));

    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (status === 'in_progress') {
      const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  useEffect(() => {
    if (status === 'completed') {
      setTimeout(() => {
        navigation.replace('Rating', { driver, fare, pickup, destination });
      }, 1500);
    }
  }, [status]);

  const cancelTrip = () => {
    Alert.alert('Cancel Trip', 'Are you sure you want to cancel?', [
      { text: 'No' },
      { text: 'Yes, Cancel', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const getStatusUI = () => {
    switch (status) {
      case 'searching':
        return {
          emoji: '🔍', title: 'Finding your driver...',
          subtitle: 'Looking for nearby drivers', color: '#1a73e8',
        };
      case 'accepted':
        return {
          emoji: '✅', title: 'Driver found!',
          subtitle: `${driver.name} is on the way`, color: '#2e7d32',
        };
      case 'arriving':
        return {
          emoji: '🚗', title: 'Driver is arriving',
          subtitle: `${driver.name} will arrive in 2 min`, color: '#f57c00',
        };
      case 'in_progress':
        return {
          emoji: '🛣️', title: 'Trip in progress',
          subtitle: `${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')} elapsed`, color: '#1a73e8',
        };
      case 'completed':
        return {
          emoji: '🎉', title: 'Trip completed!',
          subtitle: 'Thank you for riding with DalaSmart', color: '#2e7d32',
        };
    }
  };

  const ui = getStatusUI();

  return (
    <View style={styles.container}>
      {/* Map area with tracking simulation */}
      <View style={styles.mapArea}>
        {status === 'searching' && <ActivityIndicator size="large" color="#1a73e8" />}
        {status === 'accepted' && <Text style={styles.mapEmoji}>🚗💨</Text>}
        {status === 'arriving' && <Text style={styles.mapEmoji}>🚗 → 📍</Text>}
        {status === 'in_progress' && <Text style={styles.mapEmoji}>🟢 ━━━ 🚗 ━━━ 🔴</Text>}
        {status === 'completed' && <Text style={styles.mapEmoji}>✅ 🎉</Text>}
      </View>

      {/* Status card */}
      <View style={[styles.statusCard, { borderLeftColor: ui.color }]}>
        <Text style={styles.statusEmoji}>{ui.emoji}</Text>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>{ui.title}</Text>
          <Text style={styles.statusSubtitle}>{ui.subtitle}</Text>
        </View>
      </View>

      {/* Driver info */}
      {status !== 'searching' && (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{driver.name.charAt(0)}</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.driverPlate}>{driver.plate} • ⭐ {driver.rating}</Text>
          </View>
          <TouchableOpacity style={styles.callBtn}>
            <Text style={styles.callText}>📞</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Trip details */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailDot}>🟢</Text>
          <Text style={styles.detailText}>{pickup}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailDot}>🔴</Text>
          <Text style={styles.detailText}>{destination}</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>Fare: Sh {fare?.toLocaleString()}</Text>
          <Text style={styles.farePayment}>
            {paymentMethod === 'cash' ? '💵 Cash' : '📱 Mobile'}
          </Text>
        </View>
      </View>

      {/* Cancel button (only before in_progress) */}
      {(status === 'searching' || status === 'accepted') && (
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelTrip}>
          <Text style={styles.cancelText}>Cancel Trip</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  mapArea: {
    height: 200, backgroundColor: '#e8f5e9', justifyContent: 'center',
    alignItems: 'center',
  },
  mapEmoji: { fontSize: 28 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 16, padding: 16, borderRadius: 12, borderLeftWidth: 4, elevation: 2,
  },
  statusEmoji: { fontSize: 28, marginRight: 12 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#333' },
  statusSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  driverCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    marginHorizontal: 16, padding: 14, borderRadius: 12, elevation: 1,
  },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a73e8',
    justifyContent: 'center', alignItems: 'center',
  },
  driverAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  driverInfo: { flex: 1, marginLeft: 12 },
  driverName: { fontSize: 15, fontWeight: '600', color: '#333' },
  driverPlate: { fontSize: 12, color: '#999', marginTop: 2 },
  callBtn: { padding: 10 },
  callText: { fontSize: 22 },
  detailsCard: { backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailDot: { fontSize: 10, marginRight: 10 },
  detailText: { fontSize: 14, color: '#333', flex: 1 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#eee' },
  fareLabel: { fontSize: 15, fontWeight: '600', color: '#1a73e8' },
  farePayment: { fontSize: 13, color: '#666' },
  cancelBtn: { margin: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e53935', alignItems: 'center' },
  cancelText: { color: '#e53935', fontSize: 15, fontWeight: '600' },
});

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert,
} from 'react-native';

type DriverTripStatus = 'going_pickup' | 'arrived' | 'trip_started' | 'completed';

export default function DriverActiveTripScreen({ route, navigation }: any) {
  const { trip } = route.params;
  const [status, setStatus] = useState<DriverTripStatus>('going_pickup');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (status === 'trip_started') {
      const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  const advanceStatus = () => {
    switch (status) {
      case 'going_pickup':
        setStatus('arrived');
        break;
      case 'arrived':
        setStatus('trip_started');
        break;
      case 'trip_started':
        setStatus('completed');
        Alert.alert('Trip Completed!', `You earned ${trip.fare}`, [
          { text: 'Done', onPress: () => navigation.popToTop() },
        ]);
        break;
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'going_pickup': return "I've Arrived at Pickup";
      case 'arrived': return 'Start Trip';
      case 'trip_started': return 'Complete Trip';
      case 'completed': return 'Done';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'going_pickup': return '🚗 Driving to pickup...';
      case 'arrived': return '📍 Waiting for passenger...';
      case 'trip_started': return `🛣️ Trip in progress • ${Math.floor(elapsed / 60)}:${(elapsed % 60).toString().padStart(2, '0')}`;
      case 'completed': return '✅ Trip completed!';
    }
  };

  return (
    <View style={styles.container}>
      {/* Navigation area */}
      <View style={styles.navArea}>
        <Text style={styles.navEmoji}>
          {status === 'going_pickup' ? '📍 ← 🚗' : status === 'arrived' ? '🚗 📍' : '🟢 ━━ 🚗 ━━ 🔴'}
        </Text>
        <Text style={styles.navText}>{getStatusText()}</Text>
      </View>

      {/* Trip info */}
      <View style={styles.card}>
        <View style={styles.passengerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{trip.passenger.charAt(0)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.passengerName}>{trip.passenger}</Text>
            <Text style={styles.tripInfo}>{trip.distance} • {trip.fare}</Text>
          </View>
          <TouchableOpacity style={styles.phoneBtn}>
            <Text style={{ fontSize: 20 }}>📞</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.routeInfo}>
          <View style={styles.routeRow}>
            <Text style={styles.dot}>🟢</Text>
            <Text style={styles.routeText}>{trip.pickup}</Text>
          </View>
          <View style={styles.routeRow}>
            <Text style={styles.dot}>🔴</Text>
            <Text style={styles.routeText}>{trip.destination}</Text>
          </View>
        </View>
      </View>

      {/* Action button */}
      <TouchableOpacity
        style={[styles.actionBtn, status === 'trip_started' && styles.completeBtn]}
        onPress={advanceStatus}
      >
        <Text style={styles.actionText}>{getButtonText()}</Text>
      </TouchableOpacity>

      {/* SOS button */}
      <TouchableOpacity style={styles.sosBtn} onPress={() => Alert.alert('SOS', 'Emergency alert sent!')}>
        <Text style={styles.sosText}>🆘 Emergency SOS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  navArea: {
    height: 180, backgroundColor: '#e8f5e9', justifyContent: 'center',
    alignItems: 'center',
  },
  navEmoji: { fontSize: 26, marginBottom: 8 },
  navText: { fontSize: 15, color: '#333', fontWeight: '500' },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 18, elevation: 2 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a73e8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  tripInfo: { fontSize: 12, color: '#666', marginTop: 2 },
  phoneBtn: { padding: 8 },
  routeInfo: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 12 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dot: { fontSize: 10, marginRight: 10 },
  routeText: { fontSize: 14, color: '#333' },
  actionBtn: {
    backgroundColor: '#2e7d32', margin: 16, padding: 18,
    borderRadius: 12, alignItems: 'center',
  },
  completeBtn: { backgroundColor: '#1a73e8' },
  actionText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  sosBtn: { margin: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e53935', alignItems: 'center' },
  sosText: { color: '#e53935', fontSize: 14 },
});

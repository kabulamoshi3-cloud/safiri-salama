import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Vibration,
} from 'react-native';

export default function DriverTripRequestScreen({ navigation }: any) {
  const [timeLeft, setTimeLeft] = useState(30);
  const [trip] = useState({
    passenger: 'Sarah M.',
    pickup: 'Kariakoo Market',
    destination: 'Masaki Peninsula',
    distance: '8.2 km',
    fare: 'Sh 12,300',
    time: '18 min',
    rating: 4.9,
  });

  useEffect(() => {
    Vibration.vibrate([0, 500, 200, 500]);
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          navigation.goBack();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const acceptTrip = () => {
    navigation.replace('DriverActiveTrip', { trip });
  };

  const rejectTrip = () => {
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.timerBar}>
        <View style={[styles.timerFill, { width: `${(timeLeft / 30) * 100}%` }]} />
      </View>

      <View style={styles.header}>
        <Text style={styles.headerTitle}>New Trip Request!</Text>
        <Text style={styles.timerText}>{timeLeft}s</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.passengerRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{trip.passenger.charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.passengerName}>{trip.passenger}</Text>
            <Text style={styles.passengerRating}>⭐ {trip.rating}</Text>
          </View>
        </View>

        <View style={styles.routeCard}>
          <View style={styles.routeRow}>
            <Text style={styles.routeDot}>🟢</Text>
            <Text style={styles.routeText}>{trip.pickup}</Text>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routeRow}>
            <Text style={styles.routeDot}>🔴</Text>
            <Text style={styles.routeText}>{trip.destination}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trip.distance}</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trip.time}</Text>
            <Text style={styles.statLabel}>Est. Time</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{trip.fare}</Text>
            <Text style={styles.statLabel}>Fare</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.rejectBtn} onPress={rejectTrip}>
          <Text style={styles.rejectText}>✕ Reject</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.acceptBtn} onPress={acceptTrip}>
          <Text style={styles.acceptText}>✓ Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  timerBar: { height: 4, backgroundColor: '#eee' },
  timerFill: { height: 4, backgroundColor: '#2e7d32' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#333' },
  timerText: { fontSize: 22, fontWeight: 'bold', color: '#f57c00' },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 20, elevation: 2 },
  passengerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#1a73e8', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  passengerName: { fontSize: 16, fontWeight: '600', color: '#333' },
  passengerRating: { fontSize: 12, color: '#666', marginTop: 2 },
  routeCard: { backgroundColor: '#f9f9f9', borderRadius: 10, padding: 14, marginBottom: 16 },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  routeDot: { fontSize: 10, marginRight: 10 },
  routeText: { fontSize: 14, color: '#333' },
  routeLine: { width: 1, height: 14, backgroundColor: '#ccc', marginLeft: 5 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  buttonRow: { flexDirection: 'row', margin: 16 },
  rejectBtn: { flex: 1, padding: 16, borderRadius: 10, borderWidth: 2, borderColor: '#e53935', alignItems: 'center', marginRight: 8 },
  rejectText: { color: '#e53935', fontSize: 16, fontWeight: '600' },
  acceptBtn: { flex: 2, padding: 16, borderRadius: 10, backgroundColor: '#2e7d32', alignItems: 'center', marginLeft: 8 },
  acceptText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

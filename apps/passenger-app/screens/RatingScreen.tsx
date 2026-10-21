import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export default function RatingScreen({ route, navigation }: any) {
  const { driver: driverParam, fare, pickup, destination, tripId, driverId: driverIdParam } = route.params ?? {};
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState(0);
  const [comment, setComment] = useState('');

  // When navigated from a push notification tap, only tripId is available.
  // Fetch the trip to resolve the driver identity so the rating POST can proceed.
  const [resolvedDriver, setResolvedDriver] = useState<{ id: string; name?: string; plate?: string } | null>(
    driverIdParam ? { id: driverIdParam, ...driverParam } : driverParam ?? null
  );
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (resolvedDriver?.id) return; // already have what we need
    if (!tripId) return;

    setFetching(true);
    (async () => {
      try {
        const token = await AsyncStorage.getItem('@dalasmart:token');
        const resp = await axios.get(`${API_BASE}/trips/${tripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const tripData = resp.data;
        const d = tripData.driver;
        if (d?.id) {
          setResolvedDriver({ id: d.id, name: d.name, plate: d.vehicle?.plate });
        }
      } catch (err) {
        console.warn('[RatingScreen] failed to fetch trip for driver id:', err);
      } finally {
        setFetching(false);
      }
    })();
  }, [tripId]);

  const submitRating = async () => {
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      // ratee_id is no longer sent — the server derives it from the trip.
      if (tripId) {
        await axios.post(
          `${API_BASE}/ratings`,
          { trip_id: tripId, rating, review: comment || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      Alert.alert('Asante! 🌟', `Umempa ${resolvedDriver?.name ?? 'dereva'} nyota ${rating}`, [
        { text: 'Sawa', onPress: () => navigation.popToTop() },
      ]);
    } catch {
      Alert.alert('Hitilafu', 'Imeshindwa kutuma tathmini. Jaribu tena.');
    }
  };

  const displayFare = fare ?? null;
  const displayPickup = pickup ?? null;
  const displayDestination = destination ?? null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.title}>Safari Imekamilika</Text>
        {displayPickup && displayDestination
          ? <Text style={styles.route}>{displayPickup} → {displayDestination}</Text>
          : null}
        {displayFare != null
          ? <Text style={styles.fare}>Sh {displayFare?.toLocaleString()}</Text>
          : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kadirisha dereva wako</Text>

        {fetching ? (
          <ActivityIndicator size="small" color="#00d46a" style={{ marginBottom: 16 }} />
        ) : (
          <View style={styles.driverRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(resolvedDriver?.name ?? 'D').charAt(0)}
              </Text>
            </View>
            <View>
              <Text style={styles.driverName}>{resolvedDriver?.name ?? 'Dereva'}</Text>
              {resolvedDriver?.plate
                ? <Text style={styles.driverPlate}>{resolvedDriver.plate}</Text>
                : null}
            </View>
          </View>
        )}

        {/* Stars */}
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.ratingText}>
          {rating === 5 ? 'Bora sana!' : rating === 4 ? 'Nzuri' : rating === 3 ? 'Sawa' : rating === 2 ? 'Mbaya' : 'Mbaya sana'}
        </Text>

        {/* Tip */}
        <Text style={styles.tipTitle}>Ongeza tip?</Text>
        <View style={styles.tipRow}>
          {[0, 500, 1000, 2000].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[styles.tipBtn, tip === amount && styles.tipSelected]}
              onPress={() => setTip(amount)}
            >
              <Text style={[styles.tipText, tip === amount && styles.tipTextSelected]}>
                {amount === 0 ? 'Hapana' : `Sh ${amount}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment */}
        <TextInput
          style={styles.commentInput}
          placeholder="Andika maoni (si lazima)"
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <TouchableOpacity style={styles.submitBtn} onPress={submitRating} disabled={fetching}>
          <Text style={styles.submitText}>Wasilisha</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.popToTop()}>
          <Text style={styles.skipText}>Ruka</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  header: { backgroundColor: '#16213e', padding: 30, alignItems: 'center' },
  checkmark: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  route: { fontSize: 13, color: '#aaaaaa', marginTop: 6 },
  fare: { fontSize: 24, fontWeight: 'bold', color: '#00d46a', marginTop: 8 },
  card: { backgroundColor: '#16213e', margin: 16, borderRadius: 14, padding: 20 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#fff', marginBottom: 14 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#00d46a',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  driverName: { fontSize: 16, color: '#fff' },
  driverPlate: { fontSize: 12, color: '#aaaaaa', marginTop: 2 },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
  star: { fontSize: 40, color: '#444', marginHorizontal: 4 },
  starActive: { color: '#ffc107' },
  ratingText: { textAlign: 'center', fontSize: 14, color: '#aaaaaa', marginBottom: 16 },
  tipTitle: { fontSize: 14, fontWeight: '500', color: '#fff', marginBottom: 8 },
  tipRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tipBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#2a2a4e' },
  tipSelected: { backgroundColor: '#00d46a' },
  tipText: { fontSize: 13, color: '#fff' },
  tipTextSelected: { color: '#fff' },
  commentInput: {
    borderWidth: 1, borderColor: '#2a2a4e', borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 16,
    color: '#fff', backgroundColor: '#0f3460',
  },
  submitBtn: { backgroundColor: '#00d46a', padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipText: { textAlign: 'center', fontSize: 14, color: '#aaaaaa', paddingVertical: 8 },
});

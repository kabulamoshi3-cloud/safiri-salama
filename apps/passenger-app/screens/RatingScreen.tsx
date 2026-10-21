import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

export default function RatingScreen({ route, navigation }: any) {
  const { driver, fare, pickup, destination, tripId, driverId } = route.params;
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState(0);
  const [comment, setComment] = useState('');

  const submitRating = async () => {
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const rateeId = driverId ?? driver?.id ?? null;
      if (tripId && rateeId) {
        await axios.post(
          `${API_BASE}/ratings`,
          { trip_id: tripId, ratee_id: rateeId, rating, review: comment || null },
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      Alert.alert('Asante! 🌟', `Umempa ${driver?.name ?? 'dereva'} nyota ${rating}`, [
        { text: 'Sawa', onPress: () => navigation.popToTop() },
      ]);
    } catch {
      Alert.alert('Hitilafu', 'Imeshindwa kutuma tathmini. Jaribu tena.');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.title}>Safari Imekamilika</Text>
        <Text style={styles.route}>{pickup} → {destination}</Text>
        <Text style={styles.fare}>Sh {fare?.toLocaleString()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Kadirisha dereva wako</Text>
        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{(driver?.name ?? 'D').charAt(0)}</Text>
          </View>
          <View>
            <Text style={styles.driverName}>{driver?.name ?? 'Dereva'}</Text>
            {driver?.plate ? <Text style={styles.driverPlate}>{driver.plate}</Text> : null}
          </View>
        </View>

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

        <TouchableOpacity style={styles.submitBtn} onPress={submitRating}>
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

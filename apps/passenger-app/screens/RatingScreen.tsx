import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert,
} from 'react-native';

export default function RatingScreen({ route, navigation }: any) {
  const { driver, fare, pickup, destination } = route.params;
  const [rating, setRating] = useState(5);
  const [tip, setTip] = useState(0);
  const [comment, setComment] = useState('');

  const submitRating = () => {
    Alert.alert('Thank you!', `You rated ${driver.name} ${rating} stars`, [
      { text: 'Done', onPress: () => navigation.popToTop() },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.title}>Trip Completed</Text>
        <Text style={styles.route}>{pickup} → {destination}</Text>
        <Text style={styles.fare}>Sh {fare?.toLocaleString()}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Rate your driver</Text>
        <View style={styles.driverRow}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{driver.name.charAt(0)}</Text>
          </View>
          <Text style={styles.driverName}>{driver.name}</Text>
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
          {rating === 5 ? 'Excellent!' : rating === 4 ? 'Good' : rating === 3 ? 'Okay' : rating === 2 ? 'Poor' : 'Terrible'}
        </Text>

        {/* Tip */}
        <Text style={styles.tipTitle}>Add a tip?</Text>
        <View style={styles.tipRow}>
          {[0, 500, 1000, 2000].map((amount) => (
            <TouchableOpacity
              key={amount}
              style={[styles.tipBtn, tip === amount && styles.tipSelected]}
              onPress={() => setTip(amount)}
            >
              <Text style={[styles.tipText, tip === amount && styles.tipTextSelected]}>
                {amount === 0 ? 'No tip' : `Sh ${amount}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Comment */}
        <TextInput
          style={styles.commentInput}
          placeholder="Leave a comment (optional)"
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <TouchableOpacity style={styles.submitBtn} onPress={submitRating}>
          <Text style={styles.submitText}>Submit Rating</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#2e7d32', padding: 30, alignItems: 'center' },
  checkmark: { fontSize: 40, marginBottom: 8 },
  title: { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  route: { fontSize: 13, color: '#c8e6c9', marginTop: 6 },
  fare: { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 14, padding: 20 },
  cardTitle: { fontSize: 17, fontWeight: '600', color: '#333', marginBottom: 14 },
  driverRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#1a73e8',
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  avatarText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  driverName: { fontSize: 16, color: '#333' },
  starsRow: { flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
  star: { fontSize: 40, color: '#ddd', marginHorizontal: 4 },
  starActive: { color: '#ffc107' },
  ratingText: { textAlign: 'center', fontSize: 14, color: '#666', marginBottom: 16 },
  tipTitle: { fontSize: 14, fontWeight: '500', color: '#333', marginBottom: 8 },
  tipRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  tipBtn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, backgroundColor: '#f5f5f5' },
  tipSelected: { backgroundColor: '#1a73e8' },
  tipText: { fontSize: 13, color: '#333' },
  tipTextSelected: { color: '#fff' },
  commentInput: {
    borderWidth: 1, borderColor: '#eee', borderRadius: 10, padding: 12,
    fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 16,
  },
  submitBtn: { backgroundColor: '#1a73e8', padding: 16, borderRadius: 10, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

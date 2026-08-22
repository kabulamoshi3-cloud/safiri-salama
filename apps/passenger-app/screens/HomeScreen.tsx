import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Image,
} from 'react-native';

export default function HomeScreen({ navigation }: any) {
  return (
    <ScrollView style={styles.container}>
      {/* Quick booking card */}
      <TouchableOpacity style={styles.bookCard} onPress={() => navigation.navigate('RideRequest')}>
        <Text style={styles.bookEmoji}>🚗</Text>
        <View style={styles.bookInfo}>
          <Text style={styles.bookTitle}>Where to?</Text>
          <Text style={styles.bookSubtitle}>Tap to book a ride</Text>
        </View>
        <Text style={styles.bookArrow}>›</Text>
      </TouchableOpacity>

      {/* Vehicle options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Choose your ride</Text>
        <View style={styles.vehicleRow}>
          {[
            { emoji: '🚗', name: 'Car', desc: 'Comfort', price: 'from Sh 3,000' },
            { emoji: '🛺', name: 'Bajaji', desc: 'Affordable', price: 'from Sh 2,000' },
            { emoji: '🏍️', name: 'Boda', desc: 'Fast', price: 'from Sh 1,500' },
          ].map((v) => (
            <TouchableOpacity
              key={v.name}
              style={styles.vehicleCard}
              onPress={() => navigation.navigate('RideRequest')}
            >
              <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
              <Text style={styles.vehicleName}>{v.name}</Text>
              <Text style={styles.vehicleDesc}>{v.desc}</Text>
              <Text style={styles.vehiclePrice}>{v.price}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Promo */}
      <View style={styles.promoCard}>
        <Text style={styles.promoEmoji}>🎉</Text>
        <View style={styles.promoInfo}>
          <Text style={styles.promoTitle}>Refer & Earn Sh 5,000</Text>
          <Text style={styles.promoDesc}>Share DalaSmart with friends</Text>
        </View>
      </View>

      {/* Recent */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Places</Text>
        <View style={styles.placesRow}>
          <TouchableOpacity style={styles.placeCard}>
            <Text style={styles.placeEmoji}>🏠</Text>
            <Text style={styles.placeText}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.placeCard}>
            <Text style={styles.placeEmoji}>💼</Text>
            <Text style={styles.placeText}>Work</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.placeCard}>
            <Text style={styles.placeEmoji}>➕</Text>
            <Text style={styles.placeText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  bookCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 16, padding: 18, borderRadius: 14, elevation: 2,
  },
  bookEmoji: { fontSize: 30, marginRight: 14 },
  bookInfo: { flex: 1 },
  bookTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  bookSubtitle: { fontSize: 13, color: '#999', marginTop: 2 },
  bookArrow: { fontSize: 24, color: '#ccc' },
  section: { marginHorizontal: 16, marginTop: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: '#333', marginBottom: 10 },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', marginHorizontal: 4, elevation: 1,
  },
  vehicleEmoji: { fontSize: 28, marginBottom: 6 },
  vehicleName: { fontSize: 14, fontWeight: '600', color: '#333' },
  vehicleDesc: { fontSize: 11, color: '#666', marginTop: 2 },
  vehiclePrice: { fontSize: 10, color: '#1a73e8', marginTop: 4 },
  promoCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff3e0',
    margin: 16, padding: 16, borderRadius: 12,
  },
  promoEmoji: { fontSize: 28, marginRight: 12 },
  promoInfo: { flex: 1 },
  promoTitle: { fontSize: 14, fontWeight: '600', color: '#e65100' },
  promoDesc: { fontSize: 12, color: '#f57c00', marginTop: 2 },
  placesRow: { flexDirection: 'row' },
  placeCard: {
    backgroundColor: '#fff', borderRadius: 10, padding: 14, marginRight: 10,
    alignItems: 'center', elevation: 1, width: 80,
  },
  placeEmoji: { fontSize: 22, marginBottom: 4 },
  placeText: { fontSize: 11, color: '#666' },
});

import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedButton from '../components/AnimatedButton';

export default function HomeScreen({ navigation }: any) {
  const fadeIn = useRef(new Animated.Value(0)).current;
  const slideUp = useRef(new Animated.Value(30)).current;
  const cardScale = useRef(new Animated.Value(0.95)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideUp, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, tension: 50, friction: 8, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Hero card */}
      <Animated.View style={{ transform: [{ scale: cardScale }], opacity: fadeIn }}>
        <TouchableOpacity activeOpacity={0.9} onPress={() => navigation.navigate('RideRequest')}>
          <LinearGradient colors={['#1a73e8', '#1565c0']} style={styles.heroCard}>
            <Text style={styles.heroGreeting}>Habari! 👋</Text>
            <Text style={styles.heroTitle}>Where are you going?</Text>
            <View style={styles.searchBar}>
              <Text style={styles.searchIcon}>🔍</Text>
              <Text style={styles.searchText}>Enter destination...</Text>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Vehicle options */}
      <Animated.View style={[styles.section, { opacity: fadeIn, transform: [{ translateY: slideUp }] }]}>
        <Text style={styles.sectionTitle}>Choose your ride</Text>
        <View style={styles.vehicleRow}>
          {[
            { emoji: '🚗', name: 'Car', desc: 'Comfort', price: 'Sh 3,000+', colors: ['#e3f2fd', '#bbdefb'] },
            { emoji: '🛺', name: 'Bajaji', desc: 'Affordable', price: 'Sh 2,000+', colors: ['#fff3e0', '#ffe0b2'] },
            { emoji: '🏍️', name: 'Boda', desc: 'Fast', price: 'Sh 1,500+', colors: ['#e8f5e9', '#c8e6c9'] },
          ].map((v) => (
            <TouchableOpacity
              key={v.name} activeOpacity={0.8}
              style={styles.vehicleCard}
              onPress={() => navigation.navigate('RideRequest')}
            >
              <LinearGradient colors={v.colors} style={styles.vehicleGradient}>
                <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
                <Text style={styles.vehicleName}>{v.name}</Text>
                <Text style={styles.vehicleDesc}>{v.desc}</Text>
                <Text style={styles.vehiclePrice}>{v.price}</Text>
              </LinearGradient>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* Promo banner */}
      <Animated.View style={{ opacity: fadeIn }}>
        <TouchableOpacity activeOpacity={0.85}>
          <LinearGradient colors={['#ff6f00', '#ff8f00']} style={styles.promoCard}>
            <View style={styles.promoLeft}>
              <Text style={styles.promoTitle}>🎉 Refer & Earn</Text>
              <Text style={styles.promoAmount}>Sh 5,000 bonus</Text>
              <Text style={styles.promoDesc}>Share with friends</Text>
            </View>
            <Text style={styles.promoArrow}>→</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Saved places */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Saved Places</Text>
        <View style={styles.placesRow}>
          {[
            { emoji: '🏠', name: 'Home', color: '#e3f2fd' },
            { emoji: '💼', name: 'Work', color: '#f3e5f5' },
            { emoji: '🏋️', name: 'Gym', color: '#e8f5e9' },
            { emoji: '➕', name: 'Add', color: '#f5f5f5' },
          ].map((p) => (
            <TouchableOpacity key={p.name} style={[styles.placeCard, { backgroundColor: p.color }]}>
              <Text style={styles.placeEmoji}>{p.emoji}</Text>
              <Text style={styles.placeText}>{p.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fafafa' },
  heroCard: { margin: 16, borderRadius: 20, padding: 24, elevation: 6 },
  heroGreeting: { fontSize: 16, color: '#e3f2fd' },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 4 },
  searchBar: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12, padding: 14, marginTop: 16,
  },
  searchIcon: { fontSize: 16, marginRight: 10 },
  searchText: { fontSize: 15, color: 'rgba(255,255,255,0.7)' },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#333', marginBottom: 12 },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleCard: { flex: 1, marginHorizontal: 4, borderRadius: 16, overflow: 'hidden', elevation: 2 },
  vehicleGradient: { padding: 16, alignItems: 'center' },
  vehicleEmoji: { fontSize: 32, marginBottom: 8 },
  vehicleName: { fontSize: 14, fontWeight: '700', color: '#333' },
  vehicleDesc: { fontSize: 11, color: '#666', marginTop: 2 },
  vehiclePrice: { fontSize: 11, color: '#1a73e8', fontWeight: '600', marginTop: 6 },
  promoCard: {
    margin: 16, borderRadius: 16, padding: 20, flexDirection: 'row',
    alignItems: 'center', elevation: 3,
  },
  promoLeft: { flex: 1 },
  promoTitle: { fontSize: 15, color: '#fff', fontWeight: '600' },
  promoAmount: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 2 },
  promoDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  promoArrow: { fontSize: 24, color: '#fff' },
  placesRow: { flexDirection: 'row' },
  placeCard: {
    borderRadius: 14, padding: 14, marginRight: 10,
    alignItems: 'center', width: 72, elevation: 1,
  },
  placeEmoji: { fontSize: 22, marginBottom: 4 },
  placeText: { fontSize: 11, color: '#555', fontWeight: '500' },
});

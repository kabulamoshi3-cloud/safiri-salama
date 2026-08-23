import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, Animated,
} from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  { id: '1', emoji: '🚗', bg: '#1a73e8', title: 'Book a Ride Instantly', desc: 'Choose Car, Bajaji, or Boda-Boda. Get picked up in minutes.' },
  { id: '2', emoji: '📍', bg: '#00897b', title: 'Real-Time Tracking', desc: 'Track your driver live on the map. Share trips with family.' },
  { id: '3', emoji: '💰', bg: '#f57c00', title: 'Easy & Safe Payments', desc: 'Pay with Cash, M-Pesa, Tigo Pesa, or Airtel Money.' },
  { id: '4', emoji: '🏍️', bg: '#6a1b9a', title: 'Drive & Earn', desc: 'Join as a driver. Accept trips, earn money, and grow.' },
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Welcome');
    }
  };

  const renderSlide = ({ item }: any) => (
    <View style={[styles.slide, { backgroundColor: item.bg }]}>  
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{item.emoji}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.desc}>{item.desc}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={() => navigation.replace('Welcome')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? 'Get Started' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  slide: { width, flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emojiCircle: { width: 120, height: 120, borderRadius: 60, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 30 },
  emoji: { fontSize: 60 },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 15, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 22 },
  footer: { position: 'absolute', bottom: 50, left: 0, right: 0, paddingHorizontal: 24 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 24 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.4)', marginHorizontal: 4 },
  dotActive: { backgroundColor: '#fff', width: 24 },
  buttons: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipText: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  nextBtn: { backgroundColor: '#fff', borderRadius: 24, paddingVertical: 12, paddingHorizontal: 24 },
  nextText: { fontSize: 15, fontWeight: '700', color: '#333' },
});

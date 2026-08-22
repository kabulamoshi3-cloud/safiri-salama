import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, Image,
} from 'react-native';

const { width } = Dimensions.get('window');

const slides = [
  {
    id: '1',
    emoji: '🚗',
    title: 'Book a Ride Instantly',
    description: 'Choose from Car, Bajaji, or Boda-Boda. Get picked up in minutes anywhere in Dar es Salaam.',
  },
  {
    id: '2',
    emoji: '📍',
    title: 'Real-Time Tracking',
    description: 'Track your driver live on the map. Share your trip with family for safety.',
  },
  {
    id: '3',
    emoji: '💰',
    title: 'Easy & Safe Payments',
    description: 'Pay with cash, M-Pesa, Tigo Pesa, or Airtel Money. Transparent pricing, no surprises.',
  },
  {
    id: '4',
    emoji: '🏍️',
    title: 'Drive & Earn',
    description: 'Join as a driver. Accept trips, earn money, and grow your business with DalaSmart.',
  },
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

  const handleSkip = () => {
    navigation.replace('Welcome');
  };

  const renderSlide = ({ item }: any) => (
    <View style={styles.slide}>
      <Text style={styles.emoji}>{item.emoji}</Text>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header with logo */}
      <View style={styles.header}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.appName}>DalaSmart</Text>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      {/* Dots */}
      <View style={styles.dotsContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.buttonRow}>
        <TouchableOpacity onPress={handleSkip}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', marginTop: 60 },
  logo: { width: 60, height: 60, borderRadius: 14 },
  appName: { fontSize: 20, fontWeight: 'bold', color: '#1a73e8', marginTop: 8 },
  slide: { width, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 40 },
  emoji: { fontSize: 80, marginBottom: 24 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#333', textAlign: 'center', marginBottom: 14 },
  description: { fontSize: 15, color: '#666', textAlign: 'center', lineHeight: 22 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dot: {
    width: 8, height: 8, borderRadius: 4,
    backgroundColor: '#ddd', marginHorizontal: 4,
  },
  activeDot: { backgroundColor: '#1a73e8', width: 24 },
  buttonRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 40,
  },
  skipText: { fontSize: 16, color: '#999' },
  nextButton: {
    backgroundColor: '#1a73e8', borderRadius: 10,
    paddingVertical: 14, paddingHorizontal: 32,
  },
  nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

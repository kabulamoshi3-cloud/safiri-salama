import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList,
  Dimensions, Image, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const slides = [
  {
    id: '1', emoji: '🚗', colors: ['#1a73e8', '#4a90d9'],
    title: 'Book a Ride\nInstantly',
    description: 'Choose from Car, Bajaji, or Boda-Boda.\nGet picked up in minutes.',
  },
  {
    id: '2', emoji: '📍', colors: ['#00897b', '#26a69a'],
    title: 'Real-Time\nTracking',
    description: 'Track your driver live on the map.\nShare trips with family for safety.',
  },
  {
    id: '3', emoji: '💰', colors: ['#f57c00', '#ffb74d'],
    title: 'Easy & Safe\nPayments',
    description: 'Pay with Cash, M-Pesa, Tigo Pesa,\nor Airtel Money. No surprises.',
  },
  {
    id: '4', emoji: '🏍️', colors: ['#6a1b9a', '#ab47bc'],
    title: 'Drive &\nEarn',
    description: 'Join as a driver. Accept trips,\nearn money, and grow.',
  },
];

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      navigation.replace('Welcome');
    }
  };

  const renderSlide = ({ item, index }: any) => {
    const inputRange = [(index - 1) * width, index * width, (index + 1) * width];
    const scale = scrollX.interpolate({ inputRange, outputRange: [0.8, 1, 0.8], extrapolate: 'clamp' });
    const opacity = scrollX.interpolate({ inputRange, outputRange: [0.4, 1, 0.4], extrapolate: 'clamp' });

    return (
      <View style={styles.slide}>
        <LinearGradient colors={item.colors} style={styles.gradient}>
          <Animated.View style={[styles.emojiContainer, { transform: [{ scale }], opacity }]}>
            <Text style={styles.emoji}>{item.emoji}</Text>
          </Animated.View>
          <Animated.View style={{ opacity }}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
          </Animated.View>
        </LinearGradient>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: true })}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      {/* Bottom controls */}
      <View style={styles.footer}>
        {/* Dots */}
        <View style={styles.dotsContainer}>
          {slides.map((_, index) => {
            const dotWidth = scrollX.interpolate({
              inputRange: [(index - 1) * width, index * width, (index + 1) * width],
              outputRange: [8, 28, 8], extrapolate: 'clamp',
            });
            const dotOpacity = scrollX.interpolate({
              inputRange: [(index - 1) * width, index * width, (index + 1) * width],
              outputRange: [0.3, 1, 0.3], extrapolate: 'clamp',
            });
            return (
              <Animated.View key={index} style={[styles.dot, { width: dotWidth, opacity: dotOpacity }]} />
            );
          })}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={() => navigation.replace('Welcome')}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextButton} onPress={handleNext} activeOpacity={0.8}>
            <Text style={styles.nextText}>
              {currentIndex === slides.length - 1 ? 'Get Started →' : 'Next →'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  slide: { width, height },
  gradient: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 },
  emojiContainer: {
    width: 140, height: 140, borderRadius: 70, backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 40,
  },
  emoji: { fontSize: 70 },
  title: { fontSize: 36, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 16, lineHeight: 44 },
  description: { fontSize: 16, color: 'rgba(255,255,255,0.85)', textAlign: 'center', lineHeight: 24 },
  footer: { position: 'absolute', bottom: 50, left: 0, right: 0, paddingHorizontal: 24 },
  dotsContainer: { flexDirection: 'row', justifyContent: 'center', marginBottom: 30 },
  dot: { height: 8, borderRadius: 4, backgroundColor: '#fff', marginHorizontal: 4 },
  buttonRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  skipText: { fontSize: 16, color: 'rgba(255,255,255,0.6)' },
  nextButton: { backgroundColor: '#fff', borderRadius: 30, paddingVertical: 14, paddingHorizontal: 28 },
  nextText: { fontSize: 16, fontWeight: '700', color: '#1a73e8' },
});

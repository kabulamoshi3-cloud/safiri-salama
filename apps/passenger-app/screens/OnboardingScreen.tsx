import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions,
} from 'react-native';
import i18n from '../i18n';

const { width } = Dimensions.get('window');

const SLIDE_IDS = ['1', '2', '3', '4'];
const SLIDE_BOGS = ['#1a73e8', '#00897b', '#f57c00', '#6a1b9a'];
const SLIDE_EMOJIS = ['🚗', '📍', '💰', '🏍️'];
const SLIDE_TITLE_KEYS = ['onboarding_1_title', 'onboarding_2_title', 'onboarding_3_title', 'onboarding_4_title'];
const SLIDE_DESC_KEYS = ['onboarding_1_desc', 'onboarding_2_desc', 'onboarding_3_desc', 'onboarding_4_desc'];

export default function OnboardingScreen({ navigation }: any) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [, forceUpdate] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const handleNext = () => {
    if (currentIndex < SLIDE_IDS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      navigation.replace('Welcome');
    }
  };

  const renderSlide = ({ item, index }: { item: string; index: number }) => (
    <View style={[styles.slide, { backgroundColor: SLIDE_BOGS[index] }]}>
      <View style={styles.emojiCircle}>
        <Text style={styles.emoji}>{SLIDE_EMOJIS[index]}</Text>
      </View>
      <Text style={styles.title}>{i18n.t(SLIDE_TITLE_KEYS[index])}</Text>
      <Text style={styles.desc}>{i18n.t(SLIDE_DESC_KEYS[index])}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={SLIDE_IDS}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item}
        onMomentumScrollEnd={(e) => {
          setCurrentIndex(Math.round(e.nativeEvent.contentOffset.x / width));
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {SLIDE_IDS.map((_, i) => (
            <View key={i} style={[styles.dot, currentIndex === i && styles.dotActive]} />
          ))}
        </View>

        <View style={styles.buttons}>
          <TouchableOpacity onPress={() => navigation.replace('Welcome')}>
            <Text style={styles.skipText}>{i18n.t('skip')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
            <Text style={styles.nextText}>
              {currentIndex === SLIDE_IDS.length - 1 ? i18n.t('get_started') : `${i18n.t('next')} →`}
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

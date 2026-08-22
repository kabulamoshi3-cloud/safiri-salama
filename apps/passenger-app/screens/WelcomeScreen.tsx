import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen({ navigation }: any) {
  const logoScale = useRef(new Animated.Value(0)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const cardsTranslate = useRef(new Animated.Value(50)).current;
  const cardsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(logoScale, { toValue: 1, tension: 50, friction: 7, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(titleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        Animated.timing(cardsTranslate, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(cardsOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  const selectRole = async (role: 'passenger' | 'driver') => {
    await AsyncStorage.setItem('@dalasmart:onboarded', 'true');
    navigation.navigate('Login', { role });
  };

  return (
    <LinearGradient colors={['#1a73e8', '#0d47a1']} style={styles.container}>
      {/* Animated logo */}
      <Animated.View style={[styles.logoContainer, { transform: [{ scale: logoScale }] }]}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
      </Animated.View>

      <Animated.View style={{ opacity: titleOpacity }}>
        <Text style={styles.title}>DalaSmart</Text>
        <Text style={styles.subtitle}>Smart, safe & affordable transport</Text>
        <Text style={styles.city}>🇹🇿 Dar es Salaam, Tanzania</Text>
      </Animated.View>

      {/* Role cards with animation */}
      <Animated.View style={[styles.roleSection, { transform: [{ translateY: cardsTranslate }], opacity: cardsOpacity }]}>
        <Text style={styles.roleTitle}>I am a...</Text>

        <TouchableOpacity style={styles.roleCard} onPress={() => selectRole('passenger')} activeOpacity={0.85}>
          <LinearGradient colors={['#ffffff', '#f8f9fa']} style={styles.roleGradient}>
            <View style={styles.roleEmojiContainer}>
              <Text style={styles.roleEmoji}>🚗</Text>
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Passenger</Text>
              <Text style={styles.roleDesc}>Book rides, track trips, pay easily</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.roleCard} onPress={() => selectRole('driver')} activeOpacity={0.85}>
          <LinearGradient colors={['#e8f5e9', '#f1f8e9']} style={styles.roleGradient}>
            <View style={[styles.roleEmojiContainer, { backgroundColor: '#c8e6c9' }]}>
              <Text style={styles.roleEmoji}>🏍️</Text>
            </View>
            <View style={styles.roleInfo}>
              <Text style={styles.roleName}>Driver</Text>
              <Text style={styles.roleDesc}>Accept trips, earn money, grow</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      <Text style={styles.footer}>By continuing, you agree to our Terms of Service</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  logoContainer: { alignItems: 'center', marginTop: 80 },
  logo: { width: 100, height: 100, borderRadius: 24, borderWidth: 3, borderColor: 'rgba(255,255,255,0.3)' },
  title: { fontSize: 34, fontWeight: '800', color: '#fff', textAlign: 'center', marginTop: 16 },
  subtitle: { fontSize: 15, color: '#e3f2fd', textAlign: 'center', marginTop: 6 },
  city: { fontSize: 13, color: '#bbdefb', textAlign: 'center', marginTop: 6 },
  roleSection: { marginTop: 50 },
  roleTitle: { fontSize: 18, color: '#fff', fontWeight: '700', marginBottom: 16 },
  roleCard: { marginBottom: 14, borderRadius: 16, overflow: 'hidden', elevation: 4 },
  roleGradient: { flexDirection: 'row', alignItems: 'center', padding: 18 },
  roleEmojiContainer: {
    width: 50, height: 50, borderRadius: 14, backgroundColor: '#e3f2fd',
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  roleEmoji: { fontSize: 26 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 18, fontWeight: '700', color: '#333' },
  roleDesc: { fontSize: 13, color: '#666', marginTop: 3 },
  arrow: { fontSize: 26, color: '#ccc', fontWeight: '300' },
  footer: { position: 'absolute', bottom: 30, alignSelf: 'center', fontSize: 11, color: '#bbdefb' },
});

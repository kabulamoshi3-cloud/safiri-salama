import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function WelcomeScreen({ navigation }: any) {
  const selectRole = async (role: 'passenger' | 'driver') => {
    await AsyncStorage.setItem('@dalasmart:onboarded', 'true');
    navigation.navigate('Login', { role });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Image source={require('../assets/icon.png')} style={styles.logo} />
        <Text style={styles.title}>DalaSmart</Text>
        <Text style={styles.subtitle}>Smart, safe & affordable transport</Text>
        <Text style={styles.city}>Dar es Salaam</Text>
      </View>

      <View style={styles.roleSection}>
        <Text style={styles.roleTitle}>I am a...</Text>

        <TouchableOpacity style={styles.roleCard} onPress={() => selectRole('passenger')}>
          <Text style={styles.roleEmoji}>🚗</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>Passenger</Text>
            <Text style={styles.roleDesc}>Book rides, track trips, pay easily</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.roleCard, styles.driverCard]} onPress={() => selectRole('driver')}>
          <Text style={styles.roleEmoji}>🏍️</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>Driver</Text>
            <Text style={styles.roleDesc}>Accept trips, earn money, grow</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footer}>By continuing, you agree to our Terms of Service</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a73e8', paddingHorizontal: 24 },
  header: { alignItems: 'center', marginTop: 80 },
  logo: { width: 90, height: 90, borderRadius: 20, marginBottom: 16 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  subtitle: { fontSize: 15, color: '#e3f2fd', marginTop: 6 },
  city: { fontSize: 13, color: '#bbdefb', marginTop: 4 },
  roleSection: { marginTop: 50 },
  roleTitle: { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 16 },
  roleCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 20, marginBottom: 14,
  },
  driverCard: { backgroundColor: '#e8f5e9' },
  roleEmoji: { fontSize: 32, marginRight: 14 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 18, fontWeight: '600', color: '#333' },
  roleDesc: { fontSize: 13, color: '#666', marginTop: 3 },
  arrow: { fontSize: 24, color: '#ccc' },
  footer: { position: 'absolute', bottom: 30, alignSelf: 'center', fontSize: 11, color: '#bbdefb' },
});

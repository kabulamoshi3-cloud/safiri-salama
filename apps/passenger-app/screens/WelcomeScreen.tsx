import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export default function WelcomeScreen({ navigation }: any) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const selectRole = async (role: 'passenger' | 'driver') => {
    try {
      await AsyncStorage.setItem('@safiriharaka:onboarded', 'true');
    } catch {}
    navigation.navigate('Login', { role });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logoEmoji}>🚗</Text>
        <Text style={styles.title}>{i18n.t('app_name')}</Text>
        <Text style={styles.subtitle}>{i18n.t('tagline')}</Text>
        <Text style={styles.city}>{i18n.t('dar_es_salaam')}</Text>
      </View>

      <View style={styles.roleSection}>
        <Text style={styles.roleTitle}>{i18n.t('i_am_a')}</Text>

        <TouchableOpacity style={styles.roleCard} onPress={() => selectRole('passenger')}>
          <Text style={styles.roleEmoji}>🚗</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>{i18n.t('passenger')}</Text>
            <Text style={styles.roleDesc}>{i18n.t('passenger_desc')}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.roleCard, styles.driverCard]} onPress={() => selectRole('driver')}>
          <Text style={styles.roleEmoji}>🏍️</Text>
          <View style={styles.roleInfo}>
            <Text style={styles.roleName}>{i18n.t('driver')}</Text>
            <Text style={styles.roleDesc}>{i18n.t('driver_desc')}</Text>
          </View>
          <Text style={styles.arrow}>›</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a73e8', paddingHorizontal: 24, justifyContent: 'center' },
  header: { alignItems: 'center', marginBottom: 50 },
  logoEmoji: { fontSize: 50, marginBottom: 10 },
  title: { fontSize: 32, fontWeight: '800', color: '#fff' },
  subtitle: { fontSize: 14, color: '#e3f2fd', marginTop: 6 },
  city: { fontSize: 13, color: '#bbdefb', marginTop: 6 },
  roleSection: {},
  roleTitle: { fontSize: 18, color: '#fff', fontWeight: '600', marginBottom: 14 },
  roleCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 18, marginBottom: 12 },
  driverCard: { backgroundColor: '#e8f5e9' },
  roleEmoji: { fontSize: 28, marginRight: 14 },
  roleInfo: { flex: 1 },
  roleName: { fontSize: 17, fontWeight: '700', color: '#333' },
  roleDesc: { fontSize: 12, color: '#666', marginTop: 3 },
  arrow: { fontSize: 24, color: '#ccc' },
});

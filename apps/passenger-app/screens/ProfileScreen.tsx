import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen({ navigation }: any) {
  const logout = async () => {
    await AsyncStorage.removeItem('@dalasmart:token');
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>DS</Text>
        </View>
        <Text style={styles.name}>DalaSmart User</Text>
        <Text style={styles.phone}>+255 712 345 678</Text>
      </View>

      <View style={styles.section}>
        {[
          { label: 'Payment Methods', icon: '💳' },
          { label: 'Saved Places', icon: '📍' },
          { label: 'Safety', icon: '🛡️' },
          { label: 'Language', icon: '🌍' },
          { label: 'Help & Support', icon: '❓' },
          { label: 'About DalaSmart', icon: 'ℹ️' },
        ].map((item) => (
          <TouchableOpacity key={item.label} style={styles.menuItem}>
            <Text style={styles.menuIcon}>{item.icon}</Text>
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Text style={styles.menuArrow}>›</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { backgroundColor: '#1a73e8', padding: 30, alignItems: 'center' },
  avatar: {
    width: 72, height: 72, borderRadius: 36, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { fontSize: 24, fontWeight: 'bold', color: '#1a73e8' },
  name: { fontSize: 20, fontWeight: '600', color: '#fff', marginTop: 12 },
  phone: { fontSize: 14, color: '#e3f2fd', marginTop: 4 },
  section: { backgroundColor: '#fff', margin: 16, borderRadius: 12, overflow: 'hidden' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  menuIcon: { fontSize: 20, width: 32 },
  menuLabel: { flex: 1, fontSize: 16, color: '#333' },
  menuArrow: { fontSize: 20, color: '#ccc' },
  logoutButton: {
    backgroundColor: '#fff', margin: 16, borderRadius: 12,
    padding: 16, alignItems: 'center',
  },
  logoutText: { fontSize: 16, color: '#e53935', fontWeight: '600' },
});

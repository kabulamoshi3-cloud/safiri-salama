import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export default function AccountScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const data = await AsyncStorage.getItem('@safiriharaka:user');
    if (data) setUser(JSON.parse(data));
  };

  const logout = () => {
    Alert.alert(
      i18n.t('logout') || 'Logout',
      i18n.t('logout_confirm') || 'Are you sure you want to logout?',
      [
        { text: i18n.t('cancel') || 'Cancel', style: 'cancel' },
        {
          text: i18n.t('logout') || 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['@safiriharaka:token', '@safiriharaka:role', '@safiriharaka:user']);
            navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
          },
        },
      ]
    );
  };

  const menuItems = [
    { icon: 'card-outline', label: i18n.t('payments'), desc: 'Cash, M-Pesa, Tigo', screen: 'Payment', tab: 'PaymentsTab' },
    { icon: 'location-outline', label: i18n.t('saved_places'), desc: 'Home, Work, Favorites', screen: 'SavedPlaces' },
    { icon: 'shield-checkmark-outline', label: i18n.t('safety'), desc: 'Emergency contacts, SOS', screen: 'EmergencyContacts' },
    { icon: 'pricetag-outline', label: i18n.t('promo_codes'), desc: 'Promo codes & discounts', screen: 'Promo' },
    { icon: 'people-outline', label: i18n.t('refer_friends'), desc: 'Earn Sh 5,000 per referral', screen: 'Promo' },
    { icon: 'language-outline', label: i18n.t('language'), desc: 'English / Swahili', screen: 'Settings' },
    { icon: 'notifications-outline', label: i18n.t('notifications'), desc: 'Push & SMS alerts', screen: 'Settings' },
    { icon: 'help-circle-outline', label: i18n.t('help_support'), desc: '24/7 support', screen: 'Support' },
    { icon: 'document-text-outline', label: i18n.t('legal_terms'), desc: 'Terms, Privacy Policy', screen: 'Settings' },
    { icon: 'information-circle-outline', label: i18n.t('about_app'), desc: 'Version 1.0.0', screen: 'Settings' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{i18n.t('account_title') || 'Account'}</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'D'}</Text>
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
            <Text style={styles.profilePhone}>{user?.phone || '+255...'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.stat}>
                <Ionicons name="star" size={16} color="#ffc107" />
                <Text style={styles.statText}>4.8</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statText}>45 trips</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.stat}>
                <Text style={styles.statText}>Member since 2024</Text>
              </View>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Ionicons name="create-outline" size={20} color="#007aff" />
          </TouchableOpacity>
        </View>

        {/* Menu items */}
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={() => {
              if (item.tab) {
                navigation.navigate(item.tab);
              } else {
                navigation.navigate(item.screen);
              }
            }}
          >
            <View style={styles.menuLeft}>
              <View style={styles.menuIcon}>
                <Ionicons name={item.icon as any} size={22} color="#007aff" />
              </View>
              <View style={styles.menuInfo}>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Text style={styles.menuDesc}>{item.desc}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        ))}

        {/* Logout button */}
        <TouchableOpacity style={styles.logoutButton} onPress={logout}>
          <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
          <Text style={styles.logoutText}>{i18n.t('logout') || 'Logout'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  header: {
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#1c1c1e' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16 },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#007aff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '700', color: '#1c1c1e', marginBottom: 4 },
  profilePhone: { fontSize: 14, color: '#999', marginBottom: 8 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flexDirection: 'row', alignItems: 'center' },
  statText: { fontSize: 12, color: '#666', marginLeft: 4 },
  statDivider: { width: 1, height: 12, backgroundColor: '#e0e0e0', marginHorizontal: 8 },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  menuLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 16, fontWeight: '600', color: '#1c1c1e', marginBottom: 2 },
  menuDesc: { fontSize: 13, color: '#999' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginTop: 24,
    marginBottom: 32,
    borderWidth: 2,
    borderColor: '#ff3b30',
  },
  logoutText: { fontSize: 16, fontWeight: '600', color: '#ff3b30', marginLeft: 8 },
});

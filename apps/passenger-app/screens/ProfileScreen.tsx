import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';

export default function ProfileScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    loadUser();
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const loadUser = async () => {
    const userData = await AsyncStorage.getItem('@safiriharaka:user');
    if (userData) setUser(JSON.parse(userData));
  };

  const logout = () => {
    Alert.alert(i18n.t('logout'), i18n.t('logout_confirm'), [
      { text: i18n.t('cancel'), style: 'cancel' },
      {
        text: i18n.t('logout'), style: 'destructive',
        onPress: async () => {
          await AsyncStorage.multiRemove(['@safiriharaka:token', '@safiriharaka:role', '@safiriharaka:user']);
          navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
        },
      },
    ]);
  };

  const menuItems = [
    { icon: 'wallet-outline', label: i18n.t('wallet_payments'), desc: i18n.t('wallet_desc'), color: '#1a73e8' },
    { icon: 'location-outline', label: i18n.t('saved_places'), desc: i18n.t('saved_places_desc'), color: '#4caf50' },
    { icon: 'shield-checkmark-outline', label: i18n.t('safety'), desc: i18n.t('sos_contacts'), color: '#f44336' },
    { icon: 'gift-outline', label: i18n.t('promotions'), desc: i18n.t('promotions_desc'), color: '#ff9800' },
    { icon: 'people-outline', label: i18n.t('refer_friends'), desc: i18n.t('earn_per_referral'), color: '#9c27b0' },
    { icon: 'language-outline', label: i18n.t('language'), desc: i18n.t('language_desc'), color: '#00bcd4' },
    { icon: 'notifications-outline', label: i18n.t('notifications'), desc: i18n.t('notifications_desc'), color: '#795548' },
    { icon: 'document-text-outline', label: i18n.t('legal'), desc: i18n.t('terms_privacy'), color: '#607d8b' },
    { icon: 'information-circle-outline', label: i18n.t('about'), desc: `${i18n.t('version')} 1.0.0`, color: '#999' },
  ];

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profile header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.editBtn}>
          <Ionicons name="create-outline" size={18} color="#fff" />
        </TouchableOpacity>

        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || 'D'}</Text>
          </View>
          <View style={styles.onlineDot} />
        </View>

        <Text style={styles.userName}>{user?.name || 'Safiri Haraka User'}</Text>
        <Text style={styles.userPhone}>{user?.phone || '+255 ...'}</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>4.9</Text>
            <Text style={styles.statLabel}>{i18n.t('rating_label')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>{i18n.t('trips_label')}</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>2yr</Text>
            <Text style={styles.statLabel}>{i18n.t('member_label')}</Text>
          </View>
        </View>
      </View>

      {/* Menu items */}
      <View style={styles.menuSection}>
        {menuItems.map((item, index) => (
          <TouchableOpacity key={index} style={styles.menuItem} activeOpacity={0.6}>
            <View style={[styles.menuIcon, { backgroundColor: item.color + '15' }]}>
              <Ionicons name={item.icon as any} size={20} color={item.color} />
            </View>
            <View style={styles.menuInfo}>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuDesc}>{item.desc}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#ddd" />
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
        <Ionicons name="log-out-outline" size={20} color="#f44336" />
        <Text style={styles.logoutText}>{i18n.t('logout')}</Text>
      </TouchableOpacity>

      <Text style={styles.version}>{i18n.t('app_name')} v1.0.0 • Made in Tanzania 🇹🇿</Text>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 24, paddingTop: 20, alignItems: 'center', borderBottomLeftRadius: 24, borderBottomRightRadius: 24 },
  editBtn: { position: 'absolute', top: 16, right: 16, padding: 8 },
  avatarContainer: { position: 'relative', marginBottom: 12 },
  avatar: { width: 80, height: 80, borderRadius: 40, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.4)' },
  avatarText: { fontSize: 30, fontWeight: '800', color: '#fff' },
  onlineDot: { position: 'absolute', bottom: 4, right: 4, width: 14, height: 14, borderRadius: 7, backgroundColor: '#4caf50', borderWidth: 2, borderColor: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: '#fff' },
  userPhone: { fontSize: 13, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statsRow: { flexDirection: 'row', marginTop: 20, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 14 },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.2)' },
  menuSection: { backgroundColor: '#fff', margin: 16, borderRadius: 16, overflow: 'hidden', elevation: 2 },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#f8f8f8' },
  menuIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  menuInfo: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: '#333' },
  menuDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff', margin: 16, padding: 16, borderRadius: 14, elevation: 1 },
  logoutText: { fontSize: 16, color: '#f44336', fontWeight: '600', marginLeft: 8 },
  version: { textAlign: 'center', fontSize: 12, color: '#bbb', marginTop: 8 },
});

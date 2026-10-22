import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, ScrollView, Alert, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import AnimatedButton from '../components/AnimatedButton';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

export default function DriverMainScreen({ navigation }: any) {
  const [isOnline, setIsOnline] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  useEffect(() => {
    loadUser();
  }, []);

  useEffect(() => {
    if (isOnline) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.1, duration: 1000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [isOnline]);

  const loadUser = async () => {
    const data = await AsyncStorage.getItem('@dalasmart:user');
    if (data) setUser(JSON.parse(data));
  };

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, tension: 65, friction: 11, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: -DRAWER_WIDTH, duration: 200, useNativeDriver: true }),
      Animated.timing(overlayAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setDrawerOpen(false));
  };

  const toggleOnline = () => {
    setIsOnline(!isOnline);
    if (!isOnline) {
      // Simulate trip request after 5s
      setTimeout(() => { if (!isOnline) navigation.navigate('TripRequest'); }, 8000);
    }
  };

  const logout = async () => {
    closeDrawer();
    await AsyncStorage.multiRemove(['@dalasmart:token', '@dalasmart:role', '@dalasmart:user']);
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map area */}
      <View style={[styles.mapArea, isOnline ? styles.mapOnline : styles.mapOffline]}>
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={26} color="#1c1c1e" />
          </TouchableOpacity>
          <View style={[styles.statusBadge, isOnline ? styles.badgeOnline : styles.badgeOffline]}>
            <View style={[styles.statusDot, { backgroundColor: isOnline ? '#34c759' : '#ff3b30' }]} />
            <Text style={styles.statusText}>{isOnline ? i18n.t('you_are_online') : i18n.t('you_are_offline')}</Text>
          </View>
        </View>

        {/* Center content */}
        <View style={styles.centerContent}>
          {isOnline ? (
            <Animated.View style={[styles.pulseCircle, { transform: [{ scale: pulseAnim }] }]}>
              <Text style={styles.pulseEmoji}>📡</Text>
            </Animated.View>
          ) : (
            <Text style={styles.offlineEmoji}>💤</Text>
          )}
          <Text style={styles.centerText}>
            {isOnline ? i18n.t('waiting_trips') : i18n.t('offline_msg')}
          </Text>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>0</Text>
            <Text style={styles.statLabel}>{i18n.t('trips_today')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>Sh 0</Text>
            <Text style={styles.statLabel}>{i18n.t('earned_today')}</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>5.0⭐</Text>
            <Text style={styles.statLabel}>{i18n.t('rating')}</Text>
          </View>
        </View>

        {/* Go Online button */}
        <AnimatedButton
          title={isOnline ? i18n.t('go_offline') : i18n.t('go_online')}
          onPress={toggleOnline}
          colors={isOnline ? ['#ff3b30', '#cc2d25'] : ['#34c759', '#28a745']}
          icon={isOnline ? '⏸' : '▶'}
        />
      </View>

      {/* Drawer overlay */}
      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={closeDrawer} activeOpacity={1} />
        </Animated.View>
      )}

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        <View style={styles.drawerHeader}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text></View>
          <Text style={styles.drawerName}>{user?.name || 'Driver'}</Text>
          <Text style={styles.drawerPhone}>{user?.phone || ''}</Text>
        </View>
        <ScrollView>
          {[
            { icon: 'wallet-outline', label: i18n.t('earnings'), screen: 'Earnings' },
            { icon: 'document-text-outline', label: i18n.t('activity'), screen: 'Orders' },
            { icon: 'car-outline', label: i18n.t('vehicle'), screen: 'Settings' },
            { icon: 'settings-outline', label: i18n.t('language'), screen: 'Settings' },
            { icon: 'help-circle-outline', label: i18n.t('help_support'), screen: 'Support' },
          ].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.drawerItem} onPress={() => { closeDrawer(); setTimeout(() => navigation.navigate(item.screen), 250); }}>
              <Ionicons name={item.icon as any} size={22} color="#1c1c1e" />
              <Text style={styles.drawerItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}
          <View style={styles.divider} />
          <TouchableOpacity style={styles.drawerItem} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
            <Text style={[styles.drawerItemText, { color: '#ff3b30' }]}>{i18n.t('logout')}</Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  mapArea: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapOnline: { backgroundColor: '#e8f5e9' },
  mapOffline: { backgroundColor: '#f5f5f5' },
  topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  menuBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  badgeOnline: { backgroundColor: '#dcfce7' },
  badgeOffline: { backgroundColor: '#fee2e2' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
  statusText: { fontSize: 12, fontWeight: '600', color: '#1c1c1e' },
  centerContent: { alignItems: 'center' },
  pulseCircle: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#34c75930', justifyContent: 'center', alignItems: 'center' },
  pulseEmoji: { fontSize: 36 },
  offlineEmoji: { fontSize: 48 },
  centerText: { fontSize: 14, color: '#666', marginTop: 12, textAlign: 'center' },
  bottomPanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, marginTop: -20, elevation: 10 },
  statsRow: { flexDirection: 'row', marginBottom: 16 },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#1c1c1e' },
  statLabel: { fontSize: 11, color: '#8e8e93', marginTop: 2 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 },
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#fff', zIndex: 200, elevation: 20 },
  drawerHeader: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  avatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#34c759', justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  avatarText: { fontSize: 20, fontWeight: '700', color: '#fff' },
  drawerName: { fontSize: 18, fontWeight: '700', color: '#1c1c1e' },
  drawerPhone: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 24 },
  drawerItemText: { fontSize: 16, color: '#1c1c1e', marginLeft: 16, fontWeight: '500' },
  divider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8, marginHorizontal: 24 },
});

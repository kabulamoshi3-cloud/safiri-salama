import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  ScrollView, Modal, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import i18n from '../i18n';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

export default function MainScreen({ navigation }: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentAddress, setCurrentAddress] = useState('Getting location...');
  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadUser();
    getLocation();
  }, []);

  const loadUser = async () => {
    const data = await AsyncStorage.getItem('@dalasmart:user');
    if (data) setUser(JSON.parse(data));
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const addr = await Location.reverseGeocodeAsync(loc.coords);
        if (addr[0]) {
          setCurrentAddress(`${addr[0].street || addr[0].district || ''}, ${addr[0].city || 'Dar es Salaam'}`);
        }
      } catch { setCurrentAddress('Dar es Salaam'); }
    } else {
      setCurrentAddress('Dar es Salaam');
    }
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

  const navigate = (screen: string) => {
    closeDrawer();
    setTimeout(() => navigation.navigate(screen), 250);
  };

  const logout = async () => {
    closeDrawer();
    await AsyncStorage.multiRemove(['@dalasmart:token', '@dalasmart:role', '@dalasmart:user']);
    navigation.reset({ index: 0, routes: [{ name: 'Welcome' }] });
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return i18n.t('good_morning');
    if (h < 18) return i18n.t('good_afternoon');
    return i18n.t('good_evening');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map area */}
      <View style={styles.mapArea}>
        <View style={styles.mapContent}>
          <Text style={styles.mapPin}>📍</Text>
          <Text style={styles.mapCity}>Dar es Salaam</Text>
          {/* Simulated nearby drivers */}
          <Text style={[styles.driverIcon, { top: 40, left: 60 }]}>🚗</Text>
          <Text style={[styles.driverIcon, { top: 80, left: 180 }]}>🛺</Text>
          <Text style={[styles.driverIcon, { top: 30, left: 250 }]}>🚗</Text>
          <Text style={[styles.driverIcon, { top: 110, left: 100 }]}>🏍️</Text>
          <Text style={[styles.driverIcon, { top: 60, left: 300 }]}>🚗</Text>
        </View>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={26} color="#1c1c1e" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notifBtn}>
            <Ionicons name="notifications-outline" size={22} color="#1c1c1e" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'User'} 👋</Text>

        {/* Address fields */}
        <TouchableOpacity style={styles.addressCard} onPress={() => navigation.navigate('RideRequest')}>
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: '#34c759' }]} />
            <Text style={styles.addressText} numberOfLines={1}>{currentAddress}</Text>
          </View>
          <View style={styles.addressDivider} />
          <View style={styles.addressRow}>
            <View style={[styles.dot, { backgroundColor: '#ff3b30' }]} />
            <Text style={styles.addressPlaceholder}>{i18n.t('where_to')}</Text>
            <Ionicons name="arrow-forward" size={18} color="#999" />
          </View>
        </TouchableOpacity>

        {/* Categories */}
        <Text style={styles.catTitle}>Services</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {[
            { icon: '🚗', label: i18n.t('car'), color: '#e3f2fd' },
            { icon: '🛺', label: i18n.t('bajaji'), color: '#fff3e0' },
            { icon: '🏍️', label: i18n.t('boda'), color: '#e8f5e9' },
            { icon: '📦', label: 'Delivery', color: '#f3e5f5' },
            { icon: '🍔', label: 'Food', color: '#fce4ec' },
            { icon: '🎁', label: 'Rewards', color: '#fff8e1' },
          ].map((cat) => (
            <TouchableOpacity key={cat.label} style={[styles.catCard, { backgroundColor: cat.color }]}
              onPress={() => navigation.navigate('RideRequest')}>
              <Text style={styles.catIcon}>{cat.icon}</Text>
              <Text style={styles.catLabel}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Saved places */}
        <View style={styles.savedRow}>
          <TouchableOpacity style={styles.savedItem}>
            <Ionicons name="home" size={18} color="#34c759" />
            <Text style={styles.savedText}>{i18n.t('home')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.savedItem}>
            <Ionicons name="briefcase" size={18} color="#007aff" />
            <Text style={styles.savedText}>{i18n.t('work')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.savedItem}>
            <Ionicons name="add-circle-outline" size={18} color="#999" />
            <Text style={styles.savedText}>{i18n.t('add_new')}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Drawer overlay */}
      {drawerOpen && (
        <Animated.View style={[styles.overlay, { opacity: overlayAnim }]}>
          <TouchableOpacity style={styles.overlayTouch} onPress={closeDrawer} activeOpacity={1} />
        </Animated.View>
      )}

      {/* Drawer */}
      <Animated.View style={[styles.drawer, { transform: [{ translateX: drawerAnim }] }]}>
        {/* Drawer header */}
        <View style={styles.drawerHeader}>
          <View style={styles.drawerAvatar}>
            <Text style={styles.drawerAvatarText}>{user?.name?.charAt(0) || 'D'}</Text>
          </View>
          <Text style={styles.drawerName}>{user?.name || 'User'}</Text>
          <Text style={styles.drawerPhone}>{user?.phone || '+255...'}</Text>
          <View style={styles.drawerRating}>
            <Ionicons name="star" size={14} color="#ffc107" />
            <Text style={styles.drawerRatingText}>4.9</Text>
          </View>
        </View>

        {/* Drawer menu */}
        <ScrollView style={styles.drawerMenu}>
          {[
            { icon: 'document-text-outline', label: i18n.t('activity'), screen: 'Orders' },
            { icon: 'card-outline', label: i18n.t('payments'), screen: 'Payment' },
            { icon: 'pricetag-outline', label: i18n.t('promo_codes'), screen: 'Promo' },
            { icon: 'people-outline', label: i18n.t('refer_friends'), screen: 'Promo' },
            { icon: 'shield-checkmark-outline', label: i18n.t('safety'), screen: 'Settings' },
            { icon: 'settings-outline', label: i18n.t('language'), screen: 'Settings' },
            { icon: 'help-circle-outline', label: i18n.t('help_support'), screen: 'Support' },
            { icon: 'information-circle-outline', label: i18n.t('about'), screen: 'Settings' },
          ].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.drawerItem} onPress={() => navigate(item.screen)}>
              <Ionicons name={item.icon as any} size={22} color="#1c1c1e" />
              <Text style={styles.drawerItemText}>{item.label}</Text>
            </TouchableOpacity>
          ))}

          <View style={styles.drawerDivider} />

          <TouchableOpacity style={styles.drawerItem} onPress={logout}>
            <Ionicons name="log-out-outline" size={22} color="#ff3b30" />
            <Text style={[styles.drawerItemText, { color: '#ff3b30' }]}>{i18n.t('logout')}</Text>
          </TouchableOpacity>
        </ScrollView>

        <Text style={styles.drawerVersion}>DalaSmart v1.0.0 🇹🇿</Text>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  mapArea: { flex: 1, backgroundColor: '#e8f5e9', position: 'relative' },
  mapContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  mapPin: { fontSize: 36 },
  mapCity: { fontSize: 12, color: '#666', marginTop: 4 },
  driverIcon: { position: 'absolute', fontSize: 18 },
  topBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  menuBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6 },
  notifBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff', justifyContent: 'center', alignItems: 'center', elevation: 4 },
  bottomPanel: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, marginTop: -20, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10 },
  greeting: { fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 14 },
  addressCard: { backgroundColor: '#f8f8f8', borderRadius: 14, padding: 14, marginBottom: 16 },
  addressRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  addressText: { flex: 1, fontSize: 15, color: '#1c1c1e' },
  addressPlaceholder: { flex: 1, fontSize: 15, color: '#999' },
  addressDivider: { height: 1, backgroundColor: '#eee', marginLeft: 22, marginVertical: 4 },
  catTitle: { fontSize: 15, fontWeight: '600', color: '#1c1c1e', marginBottom: 10 },
  catScroll: { marginBottom: 14 },
  catCard: { width: 80, height: 80, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  catIcon: { fontSize: 28, marginBottom: 4 },
  catLabel: { fontSize: 11, fontWeight: '500', color: '#333' },
  savedRow: { flexDirection: 'row', justifyContent: 'space-between' },
  savedItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flex: 1, marginHorizontal: 3 },
  savedText: { fontSize: 12, color: '#333', marginLeft: 6, fontWeight: '500' },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 },
  overlayTouch: { flex: 1 },

  // Drawer
  drawer: { position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH, backgroundColor: '#fff', zIndex: 200, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  drawerHeader: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  drawerAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: '#34c759', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  drawerAvatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  drawerName: { fontSize: 18, fontWeight: '700', color: '#1c1c1e' },
  drawerPhone: { fontSize: 13, color: '#8e8e93', marginTop: 2 },
  drawerRating: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  drawerRatingText: { fontSize: 13, color: '#1c1c1e', fontWeight: '600', marginLeft: 4 },
  drawerMenu: { flex: 1, paddingTop: 12 },
  drawerItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, paddingHorizontal: 24 },
  drawerItemText: { fontSize: 16, color: '#1c1c1e', marginLeft: 16, fontWeight: '500' },
  drawerDivider: { height: 1, backgroundColor: '#f0f0f0', marginVertical: 8, marginHorizontal: 24 },
  drawerVersion: { textAlign: 'center', fontSize: 11, color: '#ccc', paddingBottom: 20 },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  ScrollView, Modal, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import i18n from '../i18n';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.78;

interface NearbyDriver {
  driver_id: string;
  name: string;
  vehicle_plate: string;
  lat: number;
  lng: number;
  distance_km: number;
  eta_minutes: number;
  vehicle_type: string;
}

export default function MainScreen({ navigation }: any) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [currentAddress, setCurrentAddress] = useState('Getting location...');
  const [, forceUpdate] = useState(0);
  const [region, setRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null);
  const [showDriverCard, setShowDriverCard] = useState(false);

  const drawerAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const regionRef = useRef(region);

  useEffect(() => {
    loadUser();
    getLocation();
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  useEffect(() => {
    if (!isPolling) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [isPolling]);

  const loadUser = async () => {
    const data = await AsyncStorage.getItem('@skyrex:user');
    if (data) setUser(JSON.parse(data));
  };

  const fetchNearbyDrivers = async () => {
    try {
      const token = await AsyncStorage.getItem('@skyrex:token');
      const { latitude, longitude } = regionRef.current;
      const res = await axios.get(
        `${API}/tracking/nearby-drivers?lat=${latitude}&lng=${longitude}&radius=3`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && Array.isArray(res.data)) {
        setNearbyDrivers(res.data);
      }
      setIsPolling(true);
    } catch {
      // On failure: keep last known positions, indicator stays green
      setIsPolling(true);
    }
  };

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const newRegion = {
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };
        setRegion(newRegion);
        regionRef.current = newRegion;
        const addr = await Location.reverseGeocodeAsync(loc.coords);
        if (addr[0]) {
          setCurrentAddress(`${addr[0].street || addr[0].district || ''}, ${addr[0].city || 'Dar es Salaam'}`);
        }
      } catch {
        setCurrentAddress('Dar es Salaam');
      }
    } else {
      setCurrentAddress('Dar es Salaam');
    }
    // Start polling after location is known
    fetchNearbyDrivers();
    pollingIntervalRef.current = setInterval(fetchNearbyDrivers, 5000);
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
    await AsyncStorage.multiRemove(['@skyrex:token', '@skyrex:role', '@skyrex:user']);
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
      {/* Real Google Map */}
      <View style={styles.mapArea}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {/* Nearby drivers as markers */}
          {nearbyDrivers.map((d) => (
            <Marker
              key={d.driver_id}
              coordinate={{ latitude: d.lat, longitude: d.lng }}
              onPress={() => { setSelectedDriver(d); setShowDriverCard(true); }}
              title={d.name}
              description={`${d.vehicle_plate} • ${d.distance_km.toFixed(1)} km • ${d.eta_minutes} ${i18n.t('minutes')}`}
            >
              <View style={styles.driverMarker}>
                <Text style={{ fontSize: 22 }}>
                  {d.vehicle_type === 'car' ? '🚗' : d.vehicle_type === 'bajaji' ? '🛺' : '🏍️'}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Top bar over map */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.menuBtn} onPress={openDrawer}>
            <Ionicons name="menu" size={26} color="#1c1c1e" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.trafficBtn} onPress={() => navigation.navigate('Traffic')}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1c1c1e' }}>🚦 {i18n.t('traffic')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isPolling && (
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            )}
            <TouchableOpacity style={styles.notifBtn}>
              <Ionicons name="notifications-outline" size={22} color="#1c1c1e" />
            </TouchableOpacity>
          </View>
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
        <Text style={styles.catTitle}>{i18n.t('services')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {[
            { icon: '🚗', label: i18n.t('car'), color: '#e3f2fd' },
            { icon: '🛺', label: i18n.t('bajaji'), color: '#fff3e0' },
            { icon: '🏍️', label: i18n.t('boda'), color: '#e8f5e9' },
            { icon: '📦', label: i18n.t('delivery'), color: '#f3e5f5' },
            { icon: '🍔', label: i18n.t('food'), color: '#fce4ec' },
            { icon: '🎁', label: i18n.t('rewards'), color: '#fff8e1' },
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

        <Text style={styles.drawerVersion}>{i18n.t('app_name')} v1.0.0 🇹🇿</Text>
      </Animated.View>

      {/* Driver detail bottom card */}
      <Modal
        visible={showDriverCard}
        transparent
        animationType="slide"
        onRequestClose={() => setShowDriverCard(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDriverCard(false)}
        />
        {selectedDriver && (
          <View style={styles.driverBottomCard}>
            <View style={styles.driverCardHandle} />
            <Text style={styles.driverCardName}>{selectedDriver.name}</Text>
            <Text style={styles.driverCardPlate}>{selectedDriver.vehicle_plate}</Text>
            <View style={styles.driverCardRow}>
              <Text style={styles.driverCardStat}>📍 {selectedDriver.distance_km.toFixed(1)} km</Text>
              <Text style={styles.driverCardStat}>⏱ {selectedDriver.eta_minutes} {i18n.t('minutes')}</Text>
            </View>
            <TouchableOpacity
              style={styles.bookBtn}
              onPress={() => {
                setShowDriverCard(false);
                navigation.navigate('RideRequest');
              }}
            >
              <Text style={styles.bookBtnText}>{i18n.t('book_ride')} 🚗</Text>
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f0f4f0' },
  mapArea: { flex: 1, position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  topBar: {
    position: 'absolute', top: 12, left: 16, right: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  menuBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center',
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
  notifBtn: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#fff',
    justifyContent: 'center', alignItems: 'center', elevation: 4,
  },
  trafficBtn: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
  liveDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: '#00d46a', marginRight: 6,
  },
  driverMarker: { alignItems: 'center', justifyContent: 'center' },
  bottomPanel: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16, marginTop: -20,
    elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10,
  },
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
  savedItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8f8f8',
    borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, flex: 1, marginHorizontal: 3,
  },
  savedText: { fontSize: 12, color: '#333', marginLeft: 6, fontWeight: '500' },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 100 },
  overlayTouch: { flex: 1 },

  // Drawer
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0, width: DRAWER_WIDTH,
    backgroundColor: '#fff', zIndex: 200, elevation: 20,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20,
  },
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

  // Modal driver card
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' },
  driverBottomCard: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, paddingBottom: 36,
  },
  driverCardHandle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: '#444',
    alignSelf: 'center', marginBottom: 16,
  },
  driverCardName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  driverCardPlate: { fontSize: 14, color: '#aaa', marginBottom: 12 },
  driverCardRow: { flexDirection: 'row', gap: 20, marginBottom: 20 },
  driverCardStat: { fontSize: 15, color: '#00d46a', fontWeight: '600' },
  bookBtn: { backgroundColor: '#00d46a', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  bookBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions,
  ScrollView, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import i18n from '../i18n';

const API = process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';
const { width } = Dimensions.get('window');

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

export default function HomeScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null);
  const [currentAddress, setCurrentAddress] = useState('Getting location...');
  const [region, setRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [isPolling, setIsPolling] = useState(false);

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
    fetchNearbyDrivers();
    pollingIntervalRef.current = setInterval(fetchNearbyDrivers, 5000);
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return i18n.t('good_morning');
    if (h < 18) return i18n.t('good_afternoon');
    return i18n.t('good_evening');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Map */}
      <View style={styles.mapArea}>
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation
          showsMyLocationButton={false}
        >
          {nearbyDrivers.map((d) => (
            <Marker
              key={d.driver_id}
              coordinate={{ latitude: d.lat, longitude: d.lng }}
              title={d.name}
              description={`${d.vehicle_plate} • ${d.distance_km.toFixed(1)} km`}
            >
              <View style={styles.driverMarker}>
                <Text style={{ fontSize: 22 }}>
                  {d.vehicle_type === 'car' ? '🚗' : d.vehicle_type === 'bajaji' ? '🛺' : '🏍️'}
                </Text>
              </View>
            </Marker>
          ))}
        </MapView>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity style={styles.trafficBtn} onPress={() => navigation.navigate('Traffic')}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1c1c1e' }}>🚦 {i18n.t('traffic')}</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isPolling && (
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
            )}
          </View>
        </View>
      </View>

      {/* Bottom panel */}
      <View style={styles.bottomPanel}>
        <Text style={styles.greeting}>{getGreeting()}, {user?.name?.split(' ')[0] || 'User'} 👋</Text>

        {/* Where to field */}
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

        {/* Services */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  mapArea: { flex: 1 },
  map: { flex: 1 },
  driverMarker: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  topBar: {
    position: 'absolute',
    top: 10,
    left: 15,
    right: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trafficBtn: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#34c759',
    marginRight: 8,
  },
  bottomPanel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  greeting: { fontSize: 24, fontWeight: '700', color: '#1c1c1e', marginBottom: 16 },
  addressCard: {
    backgroundColor: '#f5f5f7',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  addressRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 4 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 12 },
  addressText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1c1c1e' },
  addressPlaceholder: { flex: 1, fontSize: 15, color: '#999' },
  addressDivider: { height: 1, backgroundColor: '#e0e0e0', marginVertical: 8, marginLeft: 22 },
  catTitle: { fontSize: 17, fontWeight: '600', color: '#1c1c1e', marginBottom: 12 },
  catScroll: { marginBottom: 16 },
  catCard: {
    width: 90,
    height: 90,
    borderRadius: 16,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  catIcon: { fontSize: 32, marginBottom: 4 },
  catLabel: { fontSize: 13, fontWeight: '600', color: '#1c1c1e' },
  savedRow: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 8 },
  savedItem: { alignItems: 'center' },
  savedText: { fontSize: 12, color: '#1c1c1e', marginTop: 4, fontWeight: '500' },
});

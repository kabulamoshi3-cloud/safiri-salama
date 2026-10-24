import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import AnimatedButton from '../components/AnimatedButton';
import i18n from '../i18n';

const FARES: Record<string, { perKm: number; base: number; perMin: number }> = {
  car: { perKm: 1500, base: 3000, perMin: 50 },
  bajaji: { perKm: 1000, base: 2000, perMin: 30 },
  'boda-boda': { perKm: 800, base: 1500, perMin: 25 },
};

// Haversine distance in km
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type AutocompleteResult = {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
};

export default function RideRequestScreen({ navigation }: any) {
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState('car');
  const [estimatedFare, setEstimatedFare] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<string>('');
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('cash');

  // Coords
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);

  // Routing state
  const [routeError, setRouteError] = useState(false);
  const [polylineCoords, setPolylineCoords] = useState<Array<[number, number]>>([]);

  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<AutocompleteResult[]>([]);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      setPickupCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      const address = await Location.reverseGeocodeAsync(loc.coords);
      if (address[0]) {
        const addr = `${address[0].street || ''} ${address[0].district || ''}, ${address[0].city || 'Dar es Salaam'}`;
        setCurrentLocation(addr.trim());
        setPickup(addr.trim());
      }
    }
  };

  const handleDestinationChange = (text: string) => {
    setDestination(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (text.length < 3) {
      setAutocompleteResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(text)}&countrycodes=tz&format=json&limit=5`;
        const res = await fetch(url, { headers: { 'Accept-Language': 'sw,en' } });
        const json: AutocompleteResult[] = await res.json();
        setAutocompleteResults(json);
      } catch {
        // silently ignore autocomplete failures
      }
    }, 500);
  };

  const handleAutocompleteSelect = (result: AutocompleteResult) => {
    const name = result.display_name.length > 60
      ? result.display_name.slice(0, 60) + '…'
      : result.display_name;
    setDestination(name);
    setDestinationCoords({ lat: parseFloat(result.lat), lng: parseFloat(result.lon) });
    setAutocompleteResults([]);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  };

  const calculateRoute = async () => {
    setRouteError(false);
    if (!pickupCoords || !destinationCoords) return;
    try {
      const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://safiriharaka-api.vercel.app/api/v1';
      const res = await fetch(`${API_BASE}/tracking/calculate-route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from_lat: pickupCoords.lat,
          from_lng: pickupCoords.lng,
          to_lat: destinationCoords.lat,
          to_lng: destinationCoords.lng,
        }),
      });
      if (!res.ok) throw new Error('Route fetch failed');
      const data = await res.json();
      setPolylineCoords(data.polyline_coords ?? []);
      if (data.distance_km) {
        const distKm: number = data.distance_km;
        const fare = FARES[selectedVehicle];
        const total = Math.round((fare.base + fare.perKm * distKm) / 100) * 100;
        setEstimatedFare(total);
        setEstimatedTime(data.duration_minutes ?? Math.round(distKm * 2));
      }
    } catch {
      setRouteError(true);
    }
  };

  const estimateFare = () => {
    if (!pickup || !destination) {
      Alert.alert(i18n.t('error'), i18n.t('enter_pickup_destination'));
      return;
    }
    setLoading(true);
    if (pickupCoords && destinationCoords) {
      calculateRoute().finally(() => {
        if (!estimatedFare) {
          const dist = haversineKm(pickupCoords.lat, pickupCoords.lng, destinationCoords.lat, destinationCoords.lng);
          const roadDist = dist * 1.3;
          const fare = FARES[selectedVehicle];
          const total = Math.round((fare.base + fare.perKm * roadDist) / 100) * 100;
          setEstimatedFare(total);
          setEstimatedTime(Math.round(roadDist * 2));
        }
        setLoading(false);
      });
    } else {
      setTimeout(() => {
        const distance = Math.random() * 10 + 5;
        const time = Math.round(distance * 3 + Math.random() * 10);
        const fare = FARES[selectedVehicle];
        const total = Math.round(fare.base + fare.perKm * distance + fare.perMin * time);
        setEstimatedFare(total);
        setEstimatedTime(time);
        setLoading(false);
      }, 1500);
    }
  };

  const getFallbackFareEstimate = (): number | null => {
    if (!pickupCoords || !destinationCoords) return null;
    const dist = haversineKm(pickupCoords.lat, pickupCoords.lng, destinationCoords.lat, destinationCoords.lng);
    const roadDist = dist * 1.3;
    return Math.round((roadDist * 500) / 100) * 100;
  };

  const confirmRide = () => {
    navigation.navigate('TripActive', {
      pickup,
      destination,
      vehicle: selectedVehicle,
      fare: estimatedFare,
      paymentMethod,
      to_lat: destinationCoords?.lat ?? null,
      to_lng: destinationCoords?.lng ?? null,
      tripId: null,
      polylineCoords,
      destinationCoords,
      pickupCoords,
    });
  };

  const getPaymentLabel = (method: string) => {
    if (method === 'cash') return i18n.t('cash');
    if (method === 'mpesa') return 'M-Pesa';
    if (method === 'tigo') return i18n.t('tigo_pesa');
    return i18n.t('airtel_money');
  };

  return (
    <ScrollView style={styles.container}>
      {/* Map placeholder */}
      <View style={styles.mapArea}>
        <Text style={styles.mapPin}>📍</Text>
        <Text style={styles.mapText}>
          {currentLocation || i18n.t('getting_location')}
        </Text>
        <View style={styles.mapDrivers}>
          <Text style={styles.driverDot}>🚗</Text>
          <Text style={[styles.driverDot, { top: 20, left: 60 }]}>🛺</Text>
          <Text style={[styles.driverDot, { top: 50, left: 120 }]}>🏍️</Text>
        </View>
        <Text style={styles.driversNearby}>{i18n.t('drivers_nearby').replace('{n}', '3')}</Text>
      </View>

      {/* Location inputs */}
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>🟢</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('pickup_location')}
            value={pickup}
            onChangeText={setPickup}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>🔴</Text>
          <TextInput
            style={styles.input}
            placeholder={i18n.t('where_to')}
            value={destination}
            onChangeText={handleDestinationChange}
          />
        </View>
      </View>

      {/* Autocomplete results */}
      {autocompleteResults.length > 0 && (
        <View style={styles.autocompleteCard}>
          {autocompleteResults.map((result) => (
            <TouchableOpacity
              key={result.place_id}
              style={styles.autocompleteRow}
              onPress={() => handleAutocompleteSelect(result)}
            >
              <Text style={styles.autocompleteText} numberOfLines={2}>
                📍 {result.display_name.length > 60
                  ? result.display_name.slice(0, 60) + '…'
                  : result.display_name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Route error card */}
      {routeError && (
        <View style={styles.errorCard}>
          <Text style={styles.errorTitle}>🚫 {i18n.t('route_not_found')}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={calculateRoute}>
            <Text style={styles.retryText}>{i18n.t('try_again')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fallback fare estimate */}
      {routeError && pickupCoords && destinationCoords && (() => {
        const est = getFallbackFareEstimate();
        if (!est) return null;
        return (
          <View style={styles.estimateCard}>
            <Text style={styles.estimateLabel}>{i18n.t('estimated_fare')}</Text>
            <Text style={styles.estimateAmount}>Sh {est.toLocaleString()}</Text>
          </View>
        );
      })()}

      {/* Vehicle selection */}
      <View style={styles.vehicleSection}>
        <Text style={styles.sectionTitle}>{i18n.t('choose_vehicle')}</Text>
        <View style={styles.vehicleRow}>
          {[
            { id: 'car', emoji: '🚗', nameKey: 'car', time: '5 min' },
            { id: 'bajaji', emoji: '🛺', nameKey: 'bajaji', time: '3 min' },
            { id: 'boda-boda', emoji: '🏍️', nameKey: 'boda', time: '2 min' },
          ].map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.vehicleCard, selectedVehicle === v.id && styles.vehicleSelected]}
              onPress={() => { setSelectedVehicle(v.id); setEstimatedFare(null); }}
            >
              <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
              <Text style={styles.vehicleName}>{i18n.t(v.nameKey)}</Text>
              <Text style={styles.vehicleTime}>{v.time}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Payment method */}
      <TouchableOpacity style={styles.paymentRow} onPress={() => setShowPayment(true)}>
        <Text style={styles.paymentIcon}>
          {paymentMethod === 'cash' ? '💵' : paymentMethod === 'mpesa' ? '📱' : '💳'}
        </Text>
        <Text style={styles.paymentText}>{getPaymentLabel(paymentMethod)}</Text>
        <Text style={styles.paymentChange}>{i18n.t('change')} ›</Text>
      </TouchableOpacity>

      {/* Estimate / Confirm button */}
      {!estimatedFare ? (
        <AnimatedButton
          title={i18n.t('get_fare')}
          onPress={estimateFare}
          disabled={loading}
          icon="💰"
          colors={['#1a73e8', '#1565c0']}
          style={{ marginHorizontal: 16, marginTop: 12 }}
        />
      ) : (
        <View style={styles.fareCard}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>{i18n.t('estimated_fare')}</Text>
            <Text style={styles.fareAmount}>Sh {estimatedFare?.toLocaleString()}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>{i18n.t('estimated_time')}</Text>
            <Text style={styles.fareTime}>{estimatedTime} {i18n.t('minutes')}</Text>
          </View>
          <AnimatedButton
            title={i18n.t('confirm_ride')}
            onPress={confirmRide}
            icon="🚗"
            colors={['#2e7d32', '#1b5e20']}
          />
        </View>
      )}

      {/* Payment Modal */}
      <Modal visible={showPayment} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{i18n.t('payment_method')}</Text>
            {[
              { id: 'cash', label: `💵 ${i18n.t('cash')}`, desc: i18n.t('pay_driver') },
              { id: 'mpesa', label: '📱 M-Pesa', desc: i18n.t('vodacom_mobile') },
              { id: 'tigo', label: `📱 ${i18n.t('tigo_pesa')}`, desc: i18n.t('tigo_mobile') },
              { id: 'airtel', label: `📱 ${i18n.t('airtel_money')}`, desc: i18n.t('airtel_mobile') },
            ].map((p) => (
              <TouchableOpacity
                key={p.id}
                style={[styles.paymentOption, paymentMethod === p.id && styles.paymentSelected]}
                onPress={() => { setPaymentMethod(p.id); setShowPayment(false); }}
              >
                <Text style={styles.paymentOptionLabel}>{p.label}</Text>
                <Text style={styles.paymentOptionDesc}>{p.desc}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setShowPayment(false)}>
              <Text style={styles.modalClose}>{i18n.t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  mapArea: {
    height: 200, backgroundColor: '#e3f2fd', justifyContent: 'center',
    alignItems: 'center', position: 'relative',
  },
  mapPin: { fontSize: 36 },
  mapText: { fontSize: 12, color: '#666', marginTop: 6 },
  mapDrivers: { position: 'absolute', top: 30, left: 40 },
  driverDot: { position: 'absolute', fontSize: 20 },
  driversNearby: { position: 'absolute', bottom: 10, fontSize: 12, color: '#1a73e8', fontWeight: '600' },
  card: { backgroundColor: '#fff', margin: 16, borderRadius: 12, padding: 4, elevation: 2 },
  inputRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  inputIcon: { fontSize: 12, marginRight: 10 },
  input: { flex: 1, fontSize: 15, color: '#333' },
  divider: { height: 1, backgroundColor: '#eee', marginLeft: 34 },
  autocompleteCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: -8, borderRadius: 12,
    elevation: 4, borderWidth: 1, borderColor: '#e0e0e0', zIndex: 10,
  },
  autocompleteRow: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0' },
  autocompleteText: { fontSize: 13, color: '#333' },
  errorCard: {
    borderWidth: 1, borderColor: '#ff3b30', borderRadius: 12,
    padding: 12, marginHorizontal: 16, marginTop: 8, backgroundColor: '#fff5f5',
  },
  errorTitle: { fontSize: 15, fontWeight: 'bold', color: '#ff3b30', marginBottom: 8 },
  retryBtn: { backgroundColor: '#ff3b30', borderRadius: 8, padding: 8, alignItems: 'center' },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  estimateCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    marginHorizontal: 16, marginTop: 8, elevation: 1,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  estimateLabel: { fontSize: 14, color: '#666' },
  estimateAmount: { fontSize: 16, fontWeight: 'bold', color: '#1a73e8' },
  vehicleSection: { marginHorizontal: 16, marginTop: 8 },
  sectionTitle: { fontSize: 15, fontWeight: '600', color: '#333', marginBottom: 10 },
  vehicleRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vehicleCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14,
    alignItems: 'center', marginHorizontal: 4, elevation: 1, borderWidth: 2, borderColor: 'transparent',
  },
  vehicleSelected: { borderColor: '#1a73e8', backgroundColor: '#e3f2fd' },
  vehicleEmoji: { fontSize: 28, marginBottom: 4 },
  vehicleName: { fontSize: 13, fontWeight: '600', color: '#333' },
  vehicleTime: { fontSize: 11, color: '#999', marginTop: 2 },
  paymentRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    margin: 16, padding: 14, borderRadius: 10, elevation: 1,
  },
  paymentIcon: { fontSize: 20, marginRight: 10 },
  paymentText: { flex: 1, fontSize: 15, color: '#333' },
  paymentChange: { color: '#1a73e8', fontSize: 13 },
  fareCard: { backgroundColor: '#fff', margin: 16, padding: 18, borderRadius: 12, elevation: 2 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fareLabel: { fontSize: 14, color: '#666' },
  fareAmount: { fontSize: 18, fontWeight: 'bold', color: '#1a73e8' },
  fareTime: { fontSize: 15, color: '#333' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  paymentOption: { padding: 16, borderRadius: 10, marginBottom: 8, backgroundColor: '#f9f9f9' },
  paymentSelected: { backgroundColor: '#e3f2fd', borderWidth: 1, borderColor: '#1a73e8' },
  paymentOptionLabel: { fontSize: 16, fontWeight: '500' },
  paymentOptionDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  modalClose: { textAlign: 'center', color: '#999', marginTop: 12, fontSize: 15 },
});

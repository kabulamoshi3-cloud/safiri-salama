import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Modal, FlatList,
} from 'react-native';
import * as Location from 'expo-location';
import AnimatedButton from '../components/AnimatedButton';

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
  const [autocompleteQuery, setAutocompleteQuery] = useState('');
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

  // Nominatim autocomplete for destination
  const handleDestinationChange = (text: string) => {
    setDestination(text);
    setAutocompleteQuery(text);

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
      const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';
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
      Alert.alert('Error', 'Enter both pickup and destination');
      return;
    }
    setLoading(true);
    if (pickupCoords && destinationCoords) {
      // Try real route first, fallback to haversine
      calculateRoute().finally(() => {
        if (!estimatedFare) {
          // haversine fallback already set in catch, but if no coords-based estimate yet, compute
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
      // Simulate distance calculation (5-15km random for demo)
      setTimeout(() => {
        const distance = Math.random() * 10 + 5; // 5-15 km
        const time = Math.round(distance * 3 + Math.random() * 10); // minutes
        const fare = FARES[selectedVehicle];
        const total = Math.round(fare.base + fare.perKm * distance + fare.perMin * time);
        setEstimatedFare(total);
        setEstimatedTime(time);
        setLoading(false);
      }, 1500);
    }
  };

  // Haversine-based fare estimate for when routing fails
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

  return (
    <ScrollView style={styles.container}>
      {/* Map placeholder */}
      <View style={styles.mapArea}>
        <Text style={styles.mapPin}>📍</Text>
        <Text style={styles.mapText}>
          {currentLocation || 'Getting your location...'}
        </Text>
        <View style={styles.mapDrivers}>
          <Text style={styles.driverDot}>🚗</Text>
          <Text style={[styles.driverDot, { top: 20, left: 60 }]}>🛺</Text>
          <Text style={[styles.driverDot, { top: 50, left: 120 }]}>🏍️</Text>
        </View>
        <Text style={styles.driversNearby}>3 drivers nearby</Text>
      </View>

      {/* Location inputs */}
      <View style={styles.card}>
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>🟢</Text>
          <TextInput
            style={styles.input}
            placeholder="Pickup location"
            value={pickup}
            onChangeText={setPickup}
          />
        </View>
        <View style={styles.divider} />
        <View style={styles.inputRow}>
          <Text style={styles.inputIcon}>🔴</Text>
          <TextInput
            style={styles.input}
            placeholder="Where to?"
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
          <Text style={styles.errorTitle}>🚫 Njia haipatikani</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={calculateRoute}>
            <Text style={styles.retryText}>Jaribu Tena</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Fallback fare estimate when routing fails but both coords known */}
      {routeError && pickupCoords && destinationCoords && (() => {
        const est = getFallbackFareEstimate();
        if (!est) return null;
        return (
          <View style={styles.estimateCard}>
            <Text style={styles.estimateLabel}>Bei ya Kadirio</Text>
            <Text style={styles.estimateAmount}>Sh {est.toLocaleString()}</Text>
          </View>
        );
      })()}

      {/* Vehicle selection */}
      <View style={styles.vehicleSection}>
        <Text style={styles.sectionTitle}>Choose vehicle</Text>
        <View style={styles.vehicleRow}>
          {[
            { id: 'car', emoji: '🚗', name: 'Car', time: '5 min' },
            { id: 'bajaji', emoji: '🛺', name: 'Bajaji', time: '3 min' },
            { id: 'boda-boda', emoji: '🏍️', name: 'Boda', time: '2 min' },
          ].map((v) => (
            <TouchableOpacity
              key={v.id}
              style={[styles.vehicleCard, selectedVehicle === v.id && styles.vehicleSelected]}
              onPress={() => { setSelectedVehicle(v.id); setEstimatedFare(null); }}
            >
              <Text style={styles.vehicleEmoji}>{v.emoji}</Text>
              <Text style={styles.vehicleName}>{v.name}</Text>
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
        <Text style={styles.paymentText}>
          {paymentMethod === 'cash' ? 'Cash' : paymentMethod === 'mpesa' ? 'M-Pesa' : paymentMethod === 'tigo' ? 'Tigo Pesa' : 'Airtel Money'}
        </Text>
        <Text style={styles.paymentChange}>Change ›</Text>
      </TouchableOpacity>

      {/* Estimate / Confirm button */}
      {!estimatedFare ? (
        <AnimatedButton
          title="Get Fare Estimate"
          onPress={estimateFare}
          disabled={loading}
          icon="💰"
          colors={['#1a73e8', '#1565c0']}
          style={{ marginHorizontal: 16, marginTop: 12 }}
        />
      ) : (
        <View style={styles.fareCard}>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Estimated fare</Text>
            <Text style={styles.fareAmount}>Sh {estimatedFare?.toLocaleString()}</Text>
          </View>
          <View style={styles.fareRow}>
            <Text style={styles.fareLabel}>Estimated time</Text>
            <Text style={styles.fareTime}>{estimatedTime} min</Text>
          </View>
          <AnimatedButton
            title="Confirm Ride"
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
            <Text style={styles.modalTitle}>Payment Method</Text>
            {[
              { id: 'cash', label: '💵 Cash', desc: 'Pay driver directly' },
              { id: 'mpesa', label: '📱 M-Pesa', desc: 'Vodacom mobile money' },
              { id: 'tigo', label: '📱 Tigo Pesa', desc: 'Tigo mobile money' },
              { id: 'airtel', label: '📱 Airtel Money', desc: 'Airtel mobile money' },
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
              <Text style={styles.modalClose}>Cancel</Text>
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

  // Autocomplete
  autocompleteCard: {
    backgroundColor: '#fff', marginHorizontal: 16, marginTop: -8, borderRadius: 12,
    elevation: 4, borderWidth: 1, borderColor: '#e0e0e0', zIndex: 10,
  },
  autocompleteRow: {
    padding: 12, borderBottomWidth: 1, borderBottomColor: '#f0f0f0',
  },
  autocompleteText: { fontSize: 13, color: '#333' },

  // Route error card
  errorCard: {
    borderWidth: 1, borderColor: '#ff3b30', borderRadius: 12,
    padding: 12, marginHorizontal: 16, marginTop: 8,
    backgroundColor: '#fff5f5',
  },
  errorTitle: { fontSize: 15, fontWeight: 'bold', color: '#ff3b30', marginBottom: 8 },
  retryBtn: {
    backgroundColor: '#ff3b30', borderRadius: 8, padding: 8, alignItems: 'center',
  },
  retryText: { color: '#fff', fontWeight: '600', fontSize: 14 },

  // Fallback fare estimate card
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
  estimateBtn: {
    backgroundColor: '#1a73e8', margin: 16, padding: 16,
    borderRadius: 10, alignItems: 'center',
  },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  fareCard: { backgroundColor: '#fff', margin: 16, padding: 18, borderRadius: 12, elevation: 2 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  fareLabel: { fontSize: 14, color: '#666' },
  fareAmount: { fontSize: 18, fontWeight: 'bold', color: '#1a73e8' },
  fareTime: { fontSize: 15, color: '#333' },
  confirmBtn: {
    backgroundColor: '#2e7d32', padding: 16, borderRadius: 10,
    alignItems: 'center', marginTop: 8,
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { fontSize: 18, fontWeight: '600', marginBottom: 16 },
  paymentOption: { padding: 16, borderRadius: 10, marginBottom: 8, backgroundColor: '#f9f9f9' },
  paymentSelected: { backgroundColor: '#e3f2fd', borderWidth: 1, borderColor: '#1a73e8' },
  paymentOptionLabel: { fontSize: 16, fontWeight: '500' },
  paymentOptionDesc: { fontSize: 12, color: '#999', marginTop: 2 },
  modalClose: { textAlign: 'center', color: '#999', marginTop: 12, fontSize: 15 },
});

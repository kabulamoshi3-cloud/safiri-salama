import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Alert, ActivityIndicator, Modal,
} from 'react-native';
import * as Location from 'expo-location';

const FARES: Record<string, { perKm: number; base: number; perMin: number }> = {
  car: { perKm: 1500, base: 3000, perMin: 50 },
  bajaji: { perKm: 1000, base: 2000, perMin: 30 },
  'boda-boda': { perKm: 800, base: 1500, perMin: 25 },
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

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({});
      const address = await Location.reverseGeocodeAsync(loc.coords);
      if (address[0]) {
        const addr = `${address[0].street || ''} ${address[0].district || ''}, ${address[0].city || 'Dar es Salaam'}`;
        setCurrentLocation(addr.trim());
        setPickup(addr.trim());
      }
    }
  };

  const estimateFare = () => {
    if (!pickup || !destination) {
      Alert.alert('Error', 'Enter both pickup and destination');
      return;
    }
    setLoading(true);
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
  };

  const confirmRide = () => {
    navigation.navigate('TripActive', {
      pickup,
      destination,
      vehicle: selectedVehicle,
      fare: estimatedFare,
      paymentMethod,
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
            onChangeText={setDestination}
          />
        </View>
      </View>

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
        <TouchableOpacity style={styles.estimateBtn} onPress={estimateFare} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Get Fare Estimate</Text>}
        </TouchableOpacity>
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
          <TouchableOpacity style={styles.confirmBtn} onPress={confirmRide}>
            <Text style={styles.btnText}>Confirm Ride</Text>
          </TouchableOpacity>
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

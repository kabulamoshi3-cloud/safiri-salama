import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  FlatList, ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { HomeStackParamList } from '../../navigation/MainNavigator';
import { startBackgroundTracking, stopBackgroundTracking } from '../../services/BackgroundLocation';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

type RouteStep = {
  instruction: string;
  distance_m: number;
  swahili: string;
};

const ORS_TO_SW: [RegExp, string][] = [
  [/\bturn left\b/i,             'Pinda kushoto'],
  [/\bturn right\b/i,            'Pinda kulia'],
  [/\bcontinue straight\b/i,     'Endelea moja kwa moja'],
  [/\bkeep left\b/i,             'Shikilia kushoto'],
  [/\bkeep right\b/i,            'Shikilia kulia'],
  [/\bhead\b/i,                  'Enda'],
  [/\barrive at destination\b/i, 'Umefika unapoenda'],
  [/\bturn\b/i,                  'Geuka'],
  [/\bstraight\b/i,              'Moja kwa moja'],
  [/\bright\b/i,                 'Kulia'],
  [/\bleft\b/i,                  'Kushoto'],
];

function translateToSwahili(instruction: string): string {
  for (const [pattern, sw] of ORS_TO_SW) {
    if (pattern.test(instruction)) return sw;
  }
  return instruction;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

type NavigationScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'Navigation'>;
type NavigationScreenRouteProp = RouteProp<HomeStackParamList, 'Navigation'>;

interface Props {
  navigation: NavigationScreenNavigationProp;
  route: NavigationScreenRouteProp;
}

const NavigationScreen: React.FC<Props> = ({ navigation, route }) => {
  const params = route.params;

  const [steps, setSteps] = useState<RouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [distanceRemaining, setDistanceRemaining] = useState(0);
  const [etaMinutes, setEtaMinutes] = useState(0);
  const [progressPercent, setProgressPercent] = useState(0);
  const [driverLocation, setDriverLocation] = useState<{
    lat: number; lng: number; bearing: number; speed: number;
  } | null>(null);
  const [canArrive, setCanArrive] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [polylineCoords, setPolylineCoords] = useState<Array<[number, number]>>([]);
  const [stepPolylineIndices, setStepPolylineIndices] = useState<number[]>([]);

  const locationSub = useRef<Location.LocationSubscription | null>(null);
  // Use a ref alongside totalDistance state to avoid stale closures in callbacks
  const totalDistanceRef = useRef(0);

  const fetchRoute = async () => {
    setIsLoading(true);
    setRouteError(null);

    // Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setRouteError('Ruhusa ya mahali haikupewa.');
      setIsLoading(false);
      return;
    }

    // Fetch route from API
    let routeData: {
      distance_km: number;
      duration_minutes: number;
      polyline_coords: [number, number][];
      steps: { instruction: string; distance_m: number }[];
      fare_tzs: number;
    };

    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const response = await axios.post(
        `${API_BASE}/tracking/calculate-route`,
        {
          from_lat: params.pickup_lat,
          from_lng: params.pickup_lng,
          to_lat: params.destination_lat,
          to_lng: params.destination_lng,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      routeData = response.data;
    } catch {
      setRouteError('Imeshindwa kupata njia. Angalia muunganiko wa mtandao.');
      setIsLoading(false);
      return;
    }

    const mappedSteps: RouteStep[] = (routeData.steps ?? []).map((s) => ({
      instruction: s.instruction,
      distance_m: s.distance_m,
      swahili: translateToSwahili(s.instruction),
    }));

    const totalDistM = routeData.distance_km * 1000;
    totalDistanceRef.current = totalDistM;

    const indices = mappedSteps.map((_, i) =>
      Math.round((i / Math.max(mappedSteps.length, 1)) * routeData.polyline_coords.length)
    );

    setSteps(mappedSteps);
    setDistanceRemaining(totalDistM);
    setEtaMinutes(routeData.duration_minutes);
    setPolylineCoords(routeData.polyline_coords);
    setStepPolylineIndices(indices);
    setIsLoading(false);

    // Start watching position
    try {
      const sub = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 5000,
          distanceInterval: 10,
        },
        async (loc) => {
          const { latitude: lat, longitude: lng, heading, speed: spd } = loc.coords;
          const bearing = heading ?? 0;
          const speed = spd ?? 0;

          setDriverLocation({ lat, lng, bearing, speed });

          // POST driver location — fire and forget
          try {
            const token = await AsyncStorage.getItem('@dalasmart:token');
            await axios.post(
              `${API_BASE}/tracking/driver/location`,
              { lat, lng, bearing, speed, trip_id: params.tripId },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          } catch { /* silent */ }

          // Advance step if within 50m of next waypoint
          setCurrentStepIndex((prev) => {
            if (prev < mappedSteps.length - 1 && routeData.polyline_coords.length > 0) {
              const targetIdx = indices[prev + 1] ?? routeData.polyline_coords.length - 1;
              const [tLat, tLng] = routeData.polyline_coords[targetIdx];
              const dist = haversineKm(lat, lng, tLat, tLng) * 1000;
              if (dist < 50) {
                // TODO: install expo-speech for voice navigation
                // Speech.speak(mappedSteps[prev + 1].swahili, { language: 'sw' });
                return prev + 1;
              }
            }
            return prev;
          });

          // Update distance remaining and ETA
          const distToDestKm = haversineKm(lat, lng, params.destination_lat, params.destination_lng);
          const distToDestM = distToDestKm * 1000;
          setDistanceRemaining(distToDestM);
          setEtaMinutes(Math.max(1, Math.round((distToDestKm / 30) * 60)));
          setCanArrive(distToDestM < 100);
          setProgressPercent(() => {
            if (totalDistanceRef.current <= 0) return 0;
            return Math.min(
              100,
              Math.max(0, ((totalDistanceRef.current - distToDestM) / totalDistanceRef.current) * 100)
            );
          });
        }
      );
      locationSub.current = sub;
    } catch { /* permission already checked, ignore */ }
  };

  useEffect(() => {
    startBackgroundTracking();
    fetchRoute();
    return () => {
      locationSub.current?.remove();
      stopBackgroundTracking();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleArrived = async () => {
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      await axios.post(
        `${API_BASE}/trips/${params.tripId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] });
    } catch {
      Alert.alert('Hitilafu', 'Hitilafu ya kukamilisha safari');
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#ffffff" />
        <Text style={styles.loadingText}>Inapakia njia...</Text>
      </View>
    );
  }

  if (routeError) {
    return (
      <View style={[styles.container, styles.centered]}>
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{routeError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={fetchRoute}>
            <Text style={styles.retryText}>Jaribu Tena</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const currentStep = steps[currentStepIndex];
  const nextStep = steps[currentStepIndex + 1];

  const distanceDisplay = distanceRemaining >= 1000
    ? `${(distanceRemaining / 1000).toFixed(1)} km`
    : `${Math.round(distanceRemaining)} m`;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>← Rudi</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mwelekeo wa Safari</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Instruction card */}
        <View style={styles.instructionCard}>
          <Text style={styles.instructionText}>
            {currentStep?.swahili ?? 'Fuata njia'}
          </Text>
          <Text style={styles.nextStepText}>
            Ijayo: {nextStep?.swahili ?? 'Umefika'}
          </Text>
        </View>

        {/* Stats row */}
        <View style={styles.statsRow}>
          <Text style={styles.statText}>📍 {distanceDisplay}</Text>
          <Text style={styles.statText}>⏱ Dakika {etaMinutes}</Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
        </View>

        {/* Coordinate display card */}
        {driverLocation !== null && (
          <View style={styles.coordCard}>
            <Text style={styles.coordTitle}>Mahali Pangu</Text>
            <Text style={styles.coordText}>
              Lat: {driverLocation.lat.toFixed(4)}  Lng: {driverLocation.lng.toFixed(4)}
            </Text>
            <Text style={styles.coordText}>
              Kasi: {(driverLocation.speed * 3.6).toFixed(1)} km/h
            </Text>
          </View>
        )}

        {/* Upcoming steps list */}
        <FlatList
          data={steps.slice(currentStepIndex, currentStepIndex + 3)}
          keyExtractor={(_, index) => String(currentStepIndex + index)}
          scrollEnabled={false}
          renderItem={({ item, index }) => (
            <View style={styles.stepRow}>
              <Text style={styles.stepBullet}>{currentStepIndex + index + 1}.</Text>
              <View style={styles.stepContent}>
                <Text style={styles.stepSwahili}>{item.swahili}</Text>
                <Text style={styles.stepDistance}>{item.distance_m} m</Text>
              </View>
            </View>
          )}
        />
      </ScrollView>

      {/* Nimefika button */}
      <TouchableOpacity
        style={[styles.arriveBtn, canArrive ? styles.arriveBtnActive : styles.arriveBtnDisabled]}
        onPress={handleArrived}
        disabled={!canArrive}
      >
        <Text style={styles.arriveBtnText}>✅ Nimefika</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  centered: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { color: '#ffffff', marginTop: 12, fontSize: 15 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 48,
    paddingHorizontal: 16, paddingBottom: 12, backgroundColor: '#1a1a2e',
  },
  backBtn: { marginRight: 12 },
  backText: { color: '#00d46a', fontSize: 15 },
  headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#ffffff', flex: 1 },

  scrollContent: { padding: 16, paddingBottom: 100 },

  // Instruction card
  instructionCard: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 16, marginBottom: 8,
  },
  instructionText: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 },
  nextStepText: { fontSize: 13, color: '#aaaaaa' },

  // Stats
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 8, paddingHorizontal: 4,
  },
  statText: { fontSize: 14, color: '#ffffff' },

  // Progress bar
  progressTrack: {
    height: 8, backgroundColor: '#333', borderRadius: 4, marginBottom: 12,
  },
  progressFill: { height: 8, backgroundColor: '#00d46a', borderRadius: 4 },

  // Coordinate card
  coordCard: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 12, marginTop: 8, marginBottom: 12,
  },
  coordTitle: { color: '#ffffff', fontSize: 14, fontWeight: 'bold', marginBottom: 6 },
  coordText: { color: '#cccccc', fontSize: 13, marginBottom: 2 },

  // Steps list
  stepRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: '#16213e', borderRadius: 10, padding: 12, marginBottom: 8,
  },
  stepBullet: { color: '#00d46a', fontSize: 14, fontWeight: 'bold', marginRight: 8, marginTop: 2 },
  stepContent: { flex: 1 },
  stepSwahili: { color: '#ffffff', fontSize: 14 },
  stepDistance: { color: '#888888', fontSize: 12, marginTop: 2 },

  // Error card
  errorCard: {
    backgroundColor: '#16213e', borderRadius: 12, padding: 20,
    marginHorizontal: 24, alignItems: 'center',
    borderWidth: 1, borderColor: '#ff3b30',
  },
  errorText: { color: '#ff3b30', fontSize: 15, textAlign: 'center', marginBottom: 16 },
  retryBtn: { backgroundColor: '#ff3b30', borderRadius: 8, paddingVertical: 10, paddingHorizontal: 24 },
  retryText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },

  // Arrive button
  arriveBtn: {
    position: 'absolute', bottom: 24, left: 16, right: 16,
    padding: 18, borderRadius: 12, alignItems: 'center',
  },
  arriveBtnActive: { backgroundColor: '#00d46a' },
  arriveBtnDisabled: { backgroundColor: '#444444' },
  arriveBtnText: { color: '#ffffff', fontSize: 17, fontWeight: 'bold' },
});

export default NavigationScreen;

# Implementation Plan: Passenger Live Tracking Features

## Context

- **API base URL**: `https://simon-daladala-api.vercel.app/api/v1` (from OrdersScreen.tsx)
- **HTTP client**: `axios` (already in package.json ^1.7.7)
- **Auth pattern**: `AsyncStorage.getItem('@skyrex:token')` → `Authorization: Bearer ${token}` header
- **Maps library**: `react-native-maps` 1.14.0 with `MapView`, `Marker`, `Polyline` from `react-native-maps`
- **No new packages**: everything needed is already installed
- **Design system**: `#1a1a2e` bg, `#00d46a` green accent, `#ffffff` text, `#ff9500` orange, `#ff3b30` red; 12px border radius cards

---

## Feature 1: Live Driver Tracking on Map (MainScreen.tsx)

- [ ] 1. **Replace static `nearbyDrivers` state with live-polling state and types.**

  Remove the `const [nearbyDrivers] = useState([...])` hardcoded array. Add a proper TypeScript interface and mutable state:

  ```ts
  interface NearbyDriver {
    driver_id: string;
    name: string;
    vehicle_plate: string;
    lat: number;
    lng: number;
    distance_km: number;
    eta_minutes: number;
    vehicle_type: string; // 'car' | 'bajaji' | 'boda'
  }
  ```

  Add these state variables at the top of `MainScreen`:
  ```ts
  const [nearbyDrivers, setNearbyDrivers] = useState<NearbyDriver[]>([]);
  const [isPolling, setIsPolling] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<NearbyDriver | null>(null);
  const [showDriverCard, setShowDriverCard] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  ```

  File: `apps/passenger-app/screens/MainScreen.tsx`
  Verify: TypeScript compile — `cd apps/passenger-app && npx tsc --noEmit` must show 0 errors.

- [ ] 2. **Add the polling function `fetchNearbyDrivers` and start/stop it via `useEffect`.**

  Add the fetch function inside the component (after `getLocation`):
  ```ts
  const fetchNearbyDrivers = async () => {
    try {
      const token = await AsyncStorage.getItem('@skyrex:token');
      const res = await axios.get(
        `${API}/tracking/nearby-drivers?lat=${region.latitude}&lng=${region.longitude}&radius=3`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data && Array.isArray(res.data)) {
        setNearbyDrivers(res.data);
      }
      setIsPolling(true);
    } catch {
      // On failure: keep last known positions (do not clear state)
      setIsPolling(true); // indicator stays green; polling continues
    }
  };
  ```

  Where `API = 'https://simon-daladala-api.vercel.app/api/v1'` — add this constant at the top of the file (outside the component), same pattern as OrdersScreen.tsx.

  Add a `useEffect` for polling (separate from the existing `useEffect`):
  ```ts
  useEffect(() => {
    // Start first fetch immediately, then every 5s
    fetchNearbyDrivers();
    pollingIntervalRef.current = setInterval(fetchNearbyDrivers, 5000);
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
      setIsPolling(false);
    };
  }, [region.latitude, region.longitude]);
  ```

  Add the pulse animation `useEffect` (loops while `isPolling` is true):
  ```ts
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
  ```

  Also add `import axios from 'axios';` at the top of the file.

  File: `apps/passenger-app/screens/MainScreen.tsx`
  Verify: `npx tsc --noEmit` — 0 errors.

- [ ] 3. **Update the MapView `Marker` rendering for live drivers with tap-to-open card behavior.**

  Replace the existing `{nearbyDrivers.map(...)}` inside `<MapView>` with:
  ```tsx
  {nearbyDrivers.map((d) => (
    <Marker
      key={d.driver_id}
      coordinate={{ latitude: d.lat, longitude: d.lng }}
      onPress={() => { setSelectedDriver(d); setShowDriverCard(true); }}
      title={d.name}
      description={`${d.vehicle_plate} • ${d.distance_km.toFixed(1)} km • ${d.eta_minutes} min`}
    >
      <View style={styles.driverMarker}>
        <Text style={{ fontSize: 20 }}>
          {d.vehicle_type === 'car' ? '🚗' : d.vehicle_type === 'bajaji' ? '🛺' : '🏍️'}
        </Text>
      </View>
    </Marker>
  ))}
  ```

  Add `driverMarker` to styles:
  ```ts
  driverMarker: { alignItems: 'center', justifyContent: 'center' },
  ```

  File: `apps/passenger-app/screens/MainScreen.tsx`
  Verify: `npx tsc --noEmit` — 0 errors.

- [ ] 4. **Add the live indicator dot and Traffic button to the top bar.**

  Inside the existing `<View style={styles.topBar}>`, between the menu button and notification button, add:

  ```tsx
  {/* Traffic button */}
  <TouchableOpacity style={styles.trafficBtn} onPress={() => navigation.navigate('Traffic')}>
    <Text style={{ fontSize: 13, fontWeight: '600', color: '#1c1c1e' }}>🚦 Msongamano</Text>
  </TouchableOpacity>

  {/* Live polling indicator */}
  {isPolling && (
    <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
  )}
  ```

  Add styles:
  ```ts
  trafficBtn: {
    backgroundColor: '#fff', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8,
    elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6,
  },
  liveDot: {
    position: 'absolute', top: 6, right: 6, width: 10, height: 10,
    borderRadius: 5, backgroundColor: '#00d46a',
  },
  ```

  Note: the live dot is positioned absolutely within `topBar`, which already has `position: 'absolute'`. Wrap topBar contents in a `position: 'relative'` inner view if needed, or place the dot absolutely inside `mapArea`.

  File: `apps/passenger-app/screens/MainScreen.tsx`
  Verify: `npx tsc --noEmit` — 0 errors.

- [ ] 5. **Add the driver detail bottom card (Modal) with "Piga Basi" button.**

  Add the Modal just before the closing `</SafeAreaView>`:
  ```tsx
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
          <Text style={styles.driverCardStat}>⏱ {selectedDriver.eta_minutes} dak</Text>
        </View>
        <TouchableOpacity
          style={styles.bookBtn}
          onPress={() => {
            setShowDriverCard(false);
            navigation.navigate('RideRequest');
          }}
        >
          <Text style={styles.bookBtnText}>Piga Basi 🚗</Text>
        </TouchableOpacity>
      </View>
    )}
  </Modal>
  ```

  Add styles:
  ```ts
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
  bookBtn: {
    backgroundColor: '#00d46a', borderRadius: 12, paddingVertical: 14,
    alignItems: 'center',
  },
  bookBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  ```

  File: `apps/passenger-app/screens/MainScreen.tsx`
  Verify: `npx tsc --noEmit` — 0 errors.

---

## Feature 2: Live Trip Tracking (TripActiveScreen.tsx)

- [ ] 6. **Full rewrite of TripActiveScreen.tsx to replace emoji simulation with real MapView + live polling.**

  The existing screen uses emoji placeholders in a `<View>` for the map area and `setTimeout` simulation. Replace the entire file content with a proper implementation. Key decisions:
  - Keep the existing `route.params` signature `{ pickup, destination, vehicle, fare, paymentMethod }` since RideRequestScreen.tsx passes exactly those fields
  - Add `tripId` to params with a fallback (backend assigns the real id; for now accept it as optional and use a mock id for polling)
  - Use `AnimatedRegion` from `react-native-maps` for smooth driver marker movement between polls

  **Complete new file structure:**

  ```tsx
  import React, { useState, useEffect, useRef } from 'react';
  import {
    View, Text, StyleSheet, TouchableOpacity, Alert, SafeAreaView,
  } from 'react-native';
  import MapView, { Marker, AnimatedRegion, PROVIDER_GOOGLE } from 'react-native-maps';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import axios from 'axios';

  const API = 'https://simon-daladala-api.vercel.app/api/v1';

  type TripStatus = 'searching' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';

  interface TripData {
    driver_id: string;
    name: string;
    plate: string;
    driver_lat: number;
    driver_lng: number;
    status: string;
    eta_minutes: number;
    destination_lat: number;
    destination_lng: number;
  }

  export default function TripActiveScreen({ route, navigation }: any) {
    const { pickup, destination, vehicle, fare, paymentMethod, tripId } = route.params;
    const [status, setStatus] = useState<TripStatus>('searching');
    const [tripData, setTripData] = useState<TripData | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const pollingRef = useRef<NodeJS.Timeout | null>(null);
    const mapRef = useRef<MapView>(null);

    // AnimatedRegion for smooth driver marker movement
    const driverCoord = useRef(
      new AnimatedRegion({
        latitude: -6.7924,
        longitude: 39.2083,
        latitudeDelta: 0,
        longitudeDelta: 0,
      })
    ).current;
  ```

  **Polling logic**: In a `useEffect`, start polling every 5 seconds. Stop when status is `completed` or `cancelled`:
  ```ts
  useEffect(() => {
    const poll = async () => {
      if (!tripId) return; // no tripId yet — wait for backend to assign
      try {
        const token = await AsyncStorage.getItem('@skyrex:token');
        const res = await axios.get(`${API}/tracking/trip/${tripId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data: TripData = res.data;
        setTripData(data);

        // Map backend status to local TripStatus
        const s = data.status as TripStatus;
        setStatus(s);

        // Animate driver marker to new position
        driverCoord.timing({
          latitude: data.driver_lat,
          longitude: data.driver_lng,
          latitudeDelta: 0,
          longitudeDelta: 0,
          duration: 1000,
          useNativeDriver: false,
        }).start();
      } catch { /* keep last known state */ }
    };

    poll();
    pollingRef.current = setInterval(poll, 5000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [tripId]);

  // Stop polling on terminal states
  useEffect(() => {
    if (status === 'completed' || status === 'cancelled') {
      if (pollingRef.current) clearInterval(pollingRef.current);
    }
    if (status === 'completed') {
      setTimeout(() => navigation.replace('Rating', {
        driver: tripData ? { name: tripData.name, plate: tripData.plate, rating: 4.8, vehicle } : null,
        fare, pickup, destination,
      }), 1500);
    }
  }, [status]);
  ```

  **Cancel trip** calls `POST /trips/{tripId}/cancel`:
  ```ts
  const cancelTrip = () => {
    Alert.alert('Futa Safari', 'Una uhakika unataka kufuta safari?', [
      { text: 'Hapana' },
      {
        text: 'Ndio, Futa', style: 'destructive',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('@skyrex:token');
            if (tripId) {
              await axios.post(`${API}/trips/${tripId}/cancel`, {}, {
                headers: { Authorization: `Bearer ${token}` },
              });
            }
          } catch {}
          navigation.goBack();
        },
      },
    ]);
  };
  ```

  **MapView section** (replaces the emoji `<View style={styles.mapArea}>`):
  ```tsx
  <MapView
    ref={mapRef}
    provider={PROVIDER_GOOGLE}
    style={styles.map}
    initialRegion={{
      latitude: -6.7924, longitude: 39.2083,
      latitudeDelta: 0.02, longitudeDelta: 0.02,
    }}
    showsUserLocation
  >
    {tripData && (
      <Marker.Animated
        coordinate={driverCoord}
        title={tripData.name}
        description={tripData.plate}
      >
        <Text style={{ fontSize: 24 }}>🚗</Text>
      </Marker.Animated>
    )}
  </MapView>
  ```

  **Status display** (replace old `getStatusUI` with Swahili labels):
  ```ts
  const getStatusLabel = (): { emoji: string; title: string; subtitle: string; color: string } => {
    switch (status) {
      case 'searching':
        return { emoji: '🔍', title: 'Inatafuta dereva...', subtitle: 'Tafadhali subiri', color: '#ff9500' };
      case 'accepted':
        return { emoji: '✅', title: 'Dereva Amepatikana!', subtitle: `${tripData?.name ?? ''} anakuja`, color: '#00d46a' };
      case 'arriving':
        return { emoji: '🚗', title: 'Dereva Anafika', subtitle: `${tripData?.name ?? ''} atafika dakika ${tripData?.eta_minutes ?? '...'} `, color: '#ff9500' };
      case 'in_progress':
        return { emoji: '🛣️', title: 'Inaendelea', subtitle: `ETA: dakika ${tripData?.eta_minutes ?? '...'}`, color: '#00d46a' };
      case 'completed':
        return { emoji: '🎉', title: 'Imefika!', subtitle: 'Asante kwa kutumia SkyRex', color: '#00d46a' };
      case 'cancelled':
        return { emoji: '❌', title: 'Imefutwa', subtitle: 'Safari imefutwa', color: '#ff3b30' };
    }
  };
  ```

  **Styles** — dark navy theme matching design system:
  ```ts
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  map: { height: 260 },
  statusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#0d0d1a',
    margin: 16, padding: 16, borderRadius: 12, borderLeftWidth: 4,
  },
  // ... (driver card, details card — same structure as before but with #1a1a2e bg, #fff text)
  cancelBtn: {
    margin: 16, padding: 14, borderRadius: 12,
    borderWidth: 1, borderColor: '#ff3b30', alignItems: 'center',
  },
  cancelText: { color: '#ff3b30', fontSize: 15, fontWeight: '600' },
  ```

  File: `apps/passenger-app/screens/TripActiveScreen.tsx`
  Verify: `npx tsc --noEmit` — 0 errors.

---

## Feature 3: Traffic Screen (new file)

- [ ] 7. **Create `apps/passenger-app/screens/TrafficScreen.tsx` from scratch.**

  This is a new file. It has no existing dependencies to preserve.

  **Full implementation outline:**

  ```tsx
  import React, { useState, useEffect, useRef } from 'react';
  import {
    View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  } from 'react-native';
  import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
  import * as Location from 'expo-location';
  import AsyncStorage from '@react-native-async-storage/async-storage';
  import axios from 'axios';

  const API = 'https://simon-daladala-api.vercel.app/api/v1';

  interface TrafficSegment {
    segment_id: string;
    road_name: string;
    lat_start: number;
    lng_start: number;
    lat_end: number;
    lng_end: number;
    status: 'clear' | 'slow' | 'jam';
    speed_kmh: number;
  }

  const STATUS_COLORS: Record<string, string> = {
    clear: '#00d46a',
    slow: '#ff9500',
    jam: '#ff3b30',
  };

  const OVERALL_LABELS: Record<string, string> = {
    clear: 'Nzuri',
    slow: 'Wastani',
    jam: 'Mbaya',
  };
  ```

  **State:**
  ```ts
  const [segments, setSegments] = useState<TrafficSegment[]>([]);
  const [overallStatus, setOverallStatus] = useState<string>('clear');
  const [noData, setNoData] = useState(false);
  const [region, setRegion] = useState({
    latitude: -6.7924, longitude: 39.2083,
    latitudeDelta: 0.05, longitudeDelta: 0.05,
  });
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  ```

  **Fetch + poll every 30 seconds:**
  ```ts
  const fetchTraffic = async () => {
    try {
      const token = await AsyncStorage.getItem('@skyrex:token');
      const res = await axios.get(
        `${API}/tracking/traffic?lat=${region.latitude}&lng=${region.longitude}&radius=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data: TrafficSegment[] = res.data;
      if (!data || data.length === 0) { setNoData(true); return; }
      setNoData(false);
      setSegments(data);

      // Compute overall status: if any jam → Mbaya; any slow → Wastani; else Nzuri
      if (data.some(s => s.status === 'jam')) setOverallStatus('jam');
      else if (data.some(s => s.status === 'slow')) setOverallStatus('slow');
      else setOverallStatus('clear');
    } catch { setNoData(true); }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setRegion(r => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
      }
    })();
    fetchTraffic();
    pollingRef.current = setInterval(fetchTraffic, 30000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);
  ```

  **Render:**
  ```tsx
  return (
    <SafeAreaView style={styles.container}>
      {/* Top card */}
      <View style={styles.topCard}>
        <Text style={styles.topTitle}>🗺️ Hali ya Barabara</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[overallStatus] }]}>
          <Text style={styles.statusBadgeText}>{OVERALL_LABELS[overallStatus]}</Text>
        </View>
      </View>

      {/* Map */}
      <MapView provider={PROVIDER_GOOGLE} style={styles.map} region={region}>
        {segments.map(seg => (
          <Polyline
            key={seg.segment_id}
            coordinates={[
              { latitude: seg.lat_start, longitude: seg.lng_start },
              { latitude: seg.lat_end, longitude: seg.lng_end },
            ]}
            strokeColor={STATUS_COLORS[seg.status]}
            strokeWidth={5}
          />
        ))}
      </MapView>

      {/* No data fallback */}
      {noData && (
        <View style={styles.noDataBanner}>
          <Text style={styles.noDataText}>Habari za msongamano hazipatikani sasa</Text>
        </View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendItem}>🟢 Wazi</Text>
        <Text style={styles.legendItem}>🟠 Polepole</Text>
        <Text style={styles.legendItem}>🔴 Msongamano</Text>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.ctaBtnText}>Anza Safari 🚀</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
  ```

  **Styles** (dark navy theme):
  ```ts
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  topCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 16, padding: 16, backgroundColor: '#0d0d1a', borderRadius: 12,
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  statusBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  map: { flex: 1 },
  noDataBanner: {
    position: 'absolute', bottom: 140, left: 16, right: 16,
    backgroundColor: '#0d0d1a', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  noDataText: { color: '#aaa', fontSize: 14 },
  legend: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#0d0d1a', paddingVertical: 12, paddingHorizontal: 16,
  },
  legendItem: { color: '#fff', fontSize: 13, fontWeight: '500' },
  ctaBtn: {
    margin: 16, backgroundColor: '#00d46a', borderRadius: 12,
    paddingVertical: 14, alignItems: 'center',
  },
  ctaBtnText: { color: '#1a1a2e', fontSize: 16, fontWeight: '700' },
  ```

  File: `apps/passenger-app/screens/TrafficScreen.tsx` (new file)
  Verify: `npx tsc --noEmit` — 0 errors.

---

## Feature 4: Backend Endpoints (tracking.ts)

- [ ] 8. **Add `GET /tracking/nearby-drivers` endpoint to tracking.ts.**

  Insert after the existing `/nearby` route (around line 90). This is a separate route path (`/nearby-drivers`) since the existing `/nearby` returns only minimal data without driver name/plate. The new endpoint enriches results:

  ```ts
  /**
   * GET /api/v1/tracking/nearby-drivers?lat=X&lng=Y&radius=3
   * Returns enriched nearby driver list for passenger map display
   */
  router.get('/nearby-drivers', async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = '3' } = req.query;
      if (!lat || !lng) return res.status(400).json({ error: 'lat and lng required' });

      const userLat = parseFloat(lat as string);
      const userLng = parseFloat(lng as string);
      const radiusKm = parseFloat(radius as string);

      // Try DB query: driver_locations joined with drivers and vehicles
      let drivers: any[] = [];
      try {
        const result = await pool.query(
          `SELECT
             d.id AS driver_id,
             u.name,
             v.plate_number AS vehicle_plate,
             d.current_latitude AS lat,
             d.current_longitude AS lng,
             v.vehicle_type,
             (
               6371 * acos(
                 cos(radians($1)) * cos(radians(d.current_latitude)) *
                 cos(radians(d.current_longitude) - radians($2)) +
                 sin(radians($1)) * sin(radians(d.current_latitude))
               )
             ) AS distance_km
           FROM drivers d
           JOIN users u ON u.id = d.user_id
           LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = true
           WHERE d.is_online = true
             AND d.current_latitude IS NOT NULL
             AND d.last_location_update > NOW() - INTERVAL '1 minute'
           HAVING distance_km <= $3
           ORDER BY distance_km
           LIMIT 10`,
          [userLat, userLng, radiusKm]
        );
        drivers = result.rows.map(row => ({
          driver_id: String(row.driver_id),
          name: row.name || 'Dereva',
          vehicle_plate: row.vehicle_plate || 'T 000 XXX',
          lat: parseFloat(row.lat),
          lng: parseFloat(row.lng),
          distance_km: parseFloat(row.distance_km?.toFixed(2) ?? '0'),
          eta_minutes: Math.round(parseFloat(row.distance_km ?? '1') * 3),
          vehicle_type: row.vehicle_type || 'car',
        }));
      } catch {
        // DB failed — fall through to mock data
      }

      // Mock fallback: 4 drivers around Dar es Salaam (-6.8, 39.28)
      if (drivers.length === 0) {
        drivers = [
          { driver_id: 'mock-1', name: 'Juma Hassan', vehicle_plate: 'T 456 DFS', lat: -6.7900, lng: 39.2100, distance_km: 0.8, eta_minutes: 3, vehicle_type: 'car' },
          { driver_id: 'mock-2', name: 'Amina Said', vehicle_plate: 'T 123 ABG', lat: -6.7940, lng: 39.2050, distance_km: 1.2, eta_minutes: 5, vehicle_type: 'bajaji' },
          { driver_id: 'mock-3', name: 'Baraka Mwita', vehicle_plate: 'T 789 KLM', lat: -6.7880, lng: 39.2120, distance_km: 1.5, eta_minutes: 6, vehicle_type: 'boda' },
          { driver_id: 'mock-4', name: 'Salma Omari', vehicle_plate: 'T 321 NOP', lat: -6.7960, lng: 39.2090, distance_km: 2.1, eta_minutes: 8, vehicle_type: 'car' },
        ];
      }

      res.json(drivers);
    } catch (error) {
      console.error('Nearby drivers error:', error);
      res.status(500).json({ error: 'Failed to get nearby drivers' });
    }
  });
  ```

  File: `services/api-gateway/src/routes/tracking.ts`
  Verify: `cd services/api-gateway && npx tsc --noEmit` — 0 errors.

- [ ] 9. **Enhance the existing `GET /tracking/trip/:tripId` endpoint.**

  The existing handler (around line 145) queries trips but returns a sparse shape. Replace its body so it returns the full shape the frontend expects: `{ driver_id, name, plate, driver_lat, driver_lng, status, eta_minutes, destination_lat, destination_lng }`.

  Replace the existing `/trip/:tripId` route handler body with:
  ```ts
  router.get('/trip/:tripId', async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.userId;
      const { tripId } = req.params;

      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      let tripData: any = null;
      try {
        const result = await pool.query(
          `SELECT
             t.id, t.status, t.driver_id,
             t.dropoff_latitude AS destination_lat,
             t.dropoff_longitude AS destination_lng,
             u.name AS driver_name,
             v.plate_number AS plate,
             d.current_latitude AS driver_lat,
             d.current_longitude AS driver_lng
           FROM trips t
           LEFT JOIN drivers d ON d.id = t.driver_id
           LEFT JOIN users u ON u.id = d.user_id
           LEFT JOIN vehicles v ON v.driver_id = d.id AND v.is_active = true
           WHERE t.id = $1`,
          [tripId]
        );
        if (result.rows.length > 0) {
          const row = result.rows[0];
          const driverLat = row.driver_lat ? parseFloat(row.driver_lat) : -6.7924;
          const driverLng = row.driver_lng ? parseFloat(row.driver_lng) : 39.2083;
          // Rough ETA from driver to destination (Haversine simplified)
          const dLat = (parseFloat(row.destination_lat) - driverLat) * 111;
          const dLng = (parseFloat(row.destination_lng) - driverLng) * 111 * Math.cos(driverLat * Math.PI / 180);
          const distKm = Math.sqrt(dLat * dLat + dLng * dLng);
          tripData = {
            driver_id: String(row.driver_id),
            name: row.driver_name || 'Dereva',
            plate: row.plate || 'T 000 XXX',
            driver_lat: driverLat,
            driver_lng: driverLng,
            status: row.status || 'in_progress',
            eta_minutes: Math.round(distKm * 3),
            destination_lat: parseFloat(row.destination_lat),
            destination_lng: parseFloat(row.destination_lng),
          };
        }
      } catch { /* fall through to mock */ }

      // Mock fallback
      if (!tripData) {
        tripData = {
          driver_id: 'mock-1',
          name: 'Juma Hassan',
          plate: 'T 456 DFS',
          driver_lat: -6.7900 + (Math.random() * 0.002 - 0.001),
          driver_lng: 39.2100 + (Math.random() * 0.002 - 0.001),
          status: 'in_progress',
          eta_minutes: Math.floor(Math.random() * 8) + 3,
          destination_lat: -6.8000,
          destination_lng: 39.2200,
        };
      }

      res.json(tripData);
    } catch (error) {
      console.error('Trip tracking error:', error);
      res.status(500).json({ error: 'Failed to get trip tracking' });
    }
  });
  ```

  File: `services/api-gateway/src/routes/tracking.ts`
  Verify: `cd services/api-gateway && npx tsc --noEmit` — 0 errors.

- [ ] 10. **Add `GET /tracking/traffic` endpoint to tracking.ts.**

  Insert after the `/nearby-drivers` route added in item 8:

  ```ts
  /**
   * GET /api/v1/tracking/traffic?lat=X&lng=Y&radius=5
   * Returns road segment traffic data for overlay on map
   */
  router.get('/traffic', async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius = '5' } = req.query;
      const userLat = lat ? parseFloat(lat as string) : -6.7924;
      const userLng = lng ? parseFloat(lng as string) : 39.2083;

      // Try DB query for traffic_segments table
      let segments: any[] = [];
      try {
        const result = await pool.query(
          `SELECT
             id AS segment_id, road_name,
             lat_start, lng_start, lat_end, lng_end,
             status, speed_kmh
           FROM traffic_segments
           WHERE (
             6371 * acos(
               cos(radians($1)) * cos(radians((lat_start + lat_end) / 2)) *
               cos(radians((lng_start + lng_end) / 2) - radians($2)) +
               sin(radians($1)) * sin(radians((lat_start + lat_end) / 2))
             )
           ) <= $3
           ORDER BY road_name`,
          [userLat, userLng, parseFloat(radius as string)]
        );
        segments = result.rows;
      } catch { /* no table yet — fall through to mock */ }

      // Mock fallback: major Dar es Salaam roads with realistic coords
      if (segments.length === 0) {
        segments = [
          // Nyerere Road (Posta ↔ Ubungo)
          { segment_id: 'nyr-1', road_name: 'Nyerere Rd', lat_start: -6.8161, lng_start: 39.2875, lat_end: -6.8062, lng_end: 39.2698, status: 'jam', speed_kmh: 8 },
          { segment_id: 'nyr-2', road_name: 'Nyerere Rd', lat_start: -6.8062, lng_start: 39.2698, lat_end: -6.7934, lng_end: 39.2510, status: 'slow', speed_kmh: 22 },
          // Morogoro Road
          { segment_id: 'mor-1', road_name: 'Morogoro Rd', lat_start: -6.8120, lng_start: 39.2690, lat_end: -6.8050, lng_end: 39.2520, status: 'slow', speed_kmh: 25 },
          { segment_id: 'mor-2', road_name: 'Morogoro Rd', lat_start: -6.8050, lng_start: 39.2520, lat_end: -6.7920, lng_end: 39.2350, status: 'clear', speed_kmh: 55 },
          // Sam Nujoma Road
          { segment_id: 'sam-1', road_name: 'Sam Nujoma Rd', lat_start: -6.8233, lng_start: 39.2947, lat_end: -6.8180, lng_end: 39.2830, status: 'clear', speed_kmh: 48 },
          { segment_id: 'sam-2', road_name: 'Sam Nujoma Rd', lat_start: -6.8180, lng_start: 39.2830, lat_end: -6.8100, lng_end: 39.2700, status: 'jam', speed_kmh: 5 },
          // Bagamoyo Road
          { segment_id: 'bag-1', road_name: 'Bagamoyo Rd', lat_start: -6.7850, lng_start: 39.2600, lat_end: -6.7760, lng_end: 39.2680, status: 'clear', speed_kmh: 60 },
          { segment_id: 'bag-2', road_name: 'Bagamoyo Rd', lat_start: -6.7760, lng_start: 39.2680, lat_end: -6.7700, lng_end: 39.2780, status: 'slow', speed_kmh: 30 },
          // Kilwa Road
          { segment_id: 'kil-1', road_name: 'Kilwa Rd', lat_start: -6.8400, lng_start: 39.2950, lat_end: -6.8300, lng_end: 39.2900, status: 'jam', speed_kmh: 12 },
          { segment_id: 'kil-2', road_name: 'Kilwa Rd', lat_start: -6.8300, lng_start: 39.2900, lat_end: -6.8200, lng_end: 39.2860, status: 'clear', speed_kmh: 52 },
        ];
      }

      res.json(segments);
    } catch (error) {
      console.error('Traffic segments error:', error);
      res.status(500).json({ error: 'Failed to get traffic data' });
    }
  });
  ```

  File: `services/api-gateway/src/routes/tracking.ts`
  Verify: `cd services/api-gateway && npx tsc --noEmit` — 0 errors.

---

## Feature 5: Navigation Wiring (App.tsx)

- [ ] 11. **Register `TrafficScreen` in the navigation stack in App.tsx.**

  Add the import at the top of `App.tsx` alongside the other screen imports:
  ```ts
  import TrafficScreen from './screens/TrafficScreen';
  ```

  Add the Stack.Screen entry inside `<Stack.Navigator>`, in the Passenger section (after the `Profile` screen entry):
  ```tsx
  <Stack.Screen name="Traffic" component={TrafficScreen} />
  ```

  `TripActiveScreen` is already registered as `name="TripActive"` — no change needed there.

  File: `apps/passenger-app/App.tsx`
  Verify: `npx tsc --noEmit` — 0 errors and app boots without import errors.

---

## Verification Summary

After all 11 items are complete, run from the repo root:

```bash
# Passenger app TypeScript check
cd apps/passenger-app && npx tsc --noEmit

# API gateway TypeScript check
cd services/api-gateway && npx tsc --noEmit
```

Both must report **0 errors**.

Manual smoke test (Expo dev server):
1. `cd apps/passenger-app && expo start`
2. Open on device/emulator
3. MainScreen → map loads, driver markers appear after 5s (mock data from backend), tapping a marker shows bottom card with "Piga Basi" button
4. Top bar shows "🚦 Msongamano" button → navigates to TrafficScreen
5. TrafficScreen shows colored Polylines on map, "Anza Safari" button navigates back
6. Book a ride → TripActiveScreen shows real MapView with driver marker
7. Driver marker moves smoothly on each 5-second poll

---

## Implementation Notes

- `Animated.Region` / `Marker.Animated` is the correct API in react-native-maps 1.14.0 for smooth coordinate animation — use `coord.timing({ ...coords, duration: 1000, useNativeDriver: false }).start()`. The `useNativeDriver: false` is required for coordinate changes.
- The polling `useEffect` in MainScreen depends on `[region.latitude, region.longitude]` — this restarts polling if the user moves significantly. This is intentional so drivers near the new position are fetched.
- The `gap` CSS property in React Native 0.74.5 is supported — no need to use `marginRight`/`marginLeft` workarounds.
- TypeScript: `Marker.Animated` requires importing `Marker` from `react-native-maps` — it is a static property of the `Marker` class, not a separate export.

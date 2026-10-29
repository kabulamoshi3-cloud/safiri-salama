import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Linking,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import axios from 'axios';
import * as TrackingSocket from '../services/TrackingSocket';
import i18n from '../i18n';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'https://skyrex-api.vercel.app/api/v1';

type TripStatus = 'searching' | 'accepted' | 'arriving' | 'in_progress' | 'completed' | 'cancelled';

interface DriverLocation {
  lat: number;
  lng: number;
  bearing: number;
  speed_kmh: number;
  eta_minutes: number;
  progress_percent: number;
}

interface Driver {
  name: string;
  plate: string;
  rating: number;
  vehicle: string;
  phone: string;
}

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

export default function TripActiveScreen({ route, navigation }: any) {
  const { pickup, destination, vehicle, fare, paymentMethod } = route.params;
  const tripId: string = route.params?.tripId ?? 'mock-trip-1';

  const [, forceUpdate] = useState(0);
  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const [status, setStatus] = useState<TripStatus>('searching');
  const [driver, setDriver] = useState<Driver>({ name: '', plate: '', rating: 0, vehicle: '', phone: '' });
  const [elapsed, setElapsed] = useState(0);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [region, setRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.02,
    longitudeDelta: 0.02,
  });

  // Polyline state
  const [polylineCoords, setPolylineCoords] = useState<Array<{ latitude: number; longitude: number }>>(
    []
  );

  // Driver marker snapped to polyline
  const [driverPolylineIndex, setDriverPolylineIndex] = useState(0);

  // ETA in minutes (computed from distance remaining)
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  const trackingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const hasTripId = route.params?.tripId !== undefined;

  // Destination coords from params
  const destLat: number | null = route.params?.to_lat ?? null;
  const destLng: number | null = route.params?.to_lng ?? null;

  // Pickup coords from params (may not exist)
  const pickupLat: number | null = route.params?.pickupCoords?.lat ?? null;
  const pickupLng: number | null = route.params?.pickupCoords?.lng ?? null;

  // Fetch route on mount if destination coords available and polyline is empty
  useEffect(() => {
    if (destLat !== null && destLng !== null && polylineCoords.length === 0) {
      const fromLat = pickupLat ?? region.latitude;
      const fromLng = pickupLng ?? region.longitude;
      axios
        .post(`${API_BASE}/tracking/calculate-route`, {
          from_lat: fromLat,
          from_lng: fromLng,
          to_lat: destLat,
          to_lng: destLng,
        })
        .then((res) => {
          const coords: Array<[number, number]> = res.data?.polyline_coords ?? [];
          if (coords.length > 0) {
            setPolylineCoords(
              coords.map(([lat, lng]) => ({ latitude: lat, longitude: lng }))
            );
          }
        })
        .catch(() => {
          // silently ignore, map will still show pickup/destination markers
        });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Simulated flow — only when no real tripId provided
  useEffect(() => {
    if (hasTripId) return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    timers.push(setTimeout(() => {
      setDriver({ name: 'Juma Hassan', plate: 'T 456 DFS', rating: 4.8, vehicle: vehicle, phone: '+255700000000' });
      setStatus('accepted');
    }, 3000));
    timers.push(setTimeout(() => setStatus('arriving'), 8000));
    timers.push(setTimeout(() => setStatus('in_progress'), 14000));
    timers.push(setTimeout(() => setStatus('completed'), 25000));

    return () => timers.forEach(clearTimeout);
  }, [hasTripId]);

  // Live tracking — only when real tripId is provided
  useEffect(() => {
    if (!hasTripId) return;

    const liveStatuses: TripStatus[] = ['accepted', 'arriving', 'in_progress'];
    const stopStatuses: TripStatus[] = ['completed', 'cancelled'];

    if (liveStatuses.includes(status)) {
      if (trackingRef.current) clearInterval(trackingRef.current);

      // Unsub refs must be captured synchronously so the cleanup function can
      // always call them — even if the async token fetch hasn't resolved yet.
      let unsubMove: () => void = () => {};
      let unsubStatus: () => void = () => {};
      let unsubETA: () => void = () => {};
      let cancelled = false; // guards against a resolved promise after cleanup

      AsyncStorage.getItem('@skyrex:token').then((token) => {
        if (cancelled) return; // effect was already cleaned up
        if (token) {
          TrackingSocket.connect(token);
          TrackingSocket.joinTrip(tripId);

          unsubMove = TrackingSocket.onDriverMoved((loc) => {
            setDriverLocation({
              lat: loc.latitude,
              lng: loc.longitude,
              bearing: loc.heading ?? 0,
              speed_kmh: loc.speed ?? 0,
              eta_minutes: loc.eta,
              progress_percent: driverLocation?.progress_percent ?? 0,
            });
          });

          unsubStatus = TrackingSocket.onTripStatus((trip) => {
            if (trip.status) setStatus(trip.status as TripStatus);
          });

          unsubETA = TrackingSocket.onETAChanged(({ newETA }: { newETA: number }) => {
            setEtaMinutes(newETA);
          });
        }
      }).catch(() => {});

      const fetchLocation = async () => {
        try {
          const response = await axios.get<DriverLocation>(
            `${API_BASE}/tracking/trip/${tripId}/driver-location`
          );
          const loc = response.data;
          setDriverLocation(loc);

          // Snap driver marker to polyline
          if (polylineCoords.length > 0) {
            let closestIdx = 0;
            let closestDist = Infinity;
            polylineCoords.forEach((pt, idx) => {
              const d = haversineKm(loc.lat, loc.lng, pt.latitude, pt.longitude);
              if (d < closestDist) {
                closestDist = d;
                closestIdx = idx;
              }
            });
            setDriverPolylineIndex(closestIdx);
          }

          // Update ETA based on distance to destination
          if (destLat !== null && destLng !== null) {
            const distKm = haversineKm(loc.lat, loc.lng, destLat, destLng);
            const eta = Math.max(1, Math.round((distKm / 30) * 60));
            setEtaMinutes(eta);
          }

          setRegion({
            latitude: loc.lat,
            longitude: loc.lng,
            latitudeDelta: 0.02,
            longitudeDelta: 0.02,
          });
        } catch {
          // keep last known location
        }
      };

      fetchLocation();
      trackingRef.current = setInterval(fetchLocation, 5000);

      return () => {
        cancelled = true;
        unsubMove();
        unsubStatus();
        unsubETA();
        TrackingSocket.leaveTrip();
        TrackingSocket.disconnect();
        if (trackingRef.current) clearInterval(trackingRef.current);
      };
    } else if (stopStatuses.includes(status)) {
      if (trackingRef.current) {
        clearInterval(trackingRef.current);
        trackingRef.current = null;
      }
    }

    return () => {
      if (trackingRef.current) clearInterval(trackingRef.current);
    };
  }, [status, hasTripId, tripId, polylineCoords]);

  // Elapsed timer during in_progress
  useEffect(() => {
    if (status === 'in_progress') {
      const interval = setInterval(() => setElapsed((e) => e + 1), 1000);
      return () => clearInterval(interval);
    }
  }, [status]);

  // Navigate to rating when completed
  useEffect(() => {
    if (status === 'completed') {
      setTimeout(() => {
        navigation.replace('Rating', { driver, fare, pickup, destination, tripId, driverId: (driver as any)?.id ?? null });
      }, 1500);
    }
  }, [status]);

  const cancelTrip = () => {
    Alert.alert(i18n.t('cancel_trip'), i18n.t('cancel_confirm'), [
      { text: i18n.t('no') },
      { text: i18n.t('yes_cancel'), style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  const getStatusUI = () => {
    const mins = Math.floor(elapsed / 60);
    const secs = (elapsed % 60).toString().padStart(2, '0');
    switch (status) {
      case 'searching':
        return { emoji: '🔍', title: i18n.t('finding_driver'), subtitle: i18n.t('finding_driver_sub'), color: '#1a73e8' };
      case 'accepted':
        return { emoji: '✅', title: i18n.t('driver_found'), subtitle: i18n.t('driver_on_way_sub').replace('{name}', driver.name), color: '#2e7d32' };
      case 'arriving':
        return { emoji: '🚗', title: i18n.t('driver_arriving'), subtitle: i18n.t('driver_arriving_sub').replace('{name}', driver.name), color: '#f57c00' };
      case 'in_progress':
        return {
          emoji: '🛣️', title: i18n.t('trip_in_progress'),
          subtitle: i18n.t('trip_elapsed').replace('{m}', String(mins)).replace('{s}', secs),
          color: '#1a73e8',
        };
      case 'completed':
        return { emoji: '🎉', title: i18n.t('trip_completed'), subtitle: i18n.t('thank_you_ride'), color: '#2e7d32' };
      case 'cancelled':
        return { emoji: '❌', title: i18n.t('trip_cancelled'), subtitle: '', color: '#ff3b30' };
    }
  };

  const ui = getStatusUI();

  // Compute driver marker coordinate — snapped to polyline if available
  const driverMarkerCoord = driverLocation
    ? polylineCoords.length > 0
      ? { latitude: polylineCoords[driverPolylineIndex].latitude, longitude: polylineCoords[driverPolylineIndex].longitude }
      : { latitude: driverLocation.lat, longitude: driverLocation.lng }
    : null;

  // ETA display: prefer computed etaMinutes, fall back to server value
  const displayEta = etaMinutes ?? driverLocation?.eta_minutes ?? null;

  return (
    <View style={styles.container}>
      {/* Map area */}
      <View style={styles.mapArea}>
        {status === 'searching' ? (
          <ActivityIndicator size="large" color="#00d46a" style={styles.mapLoader} />
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            showsUserLocation
            showsMyLocationButton={false}
          >
            {/* Route polyline */}
            {polylineCoords.length > 0 && (
              <Polyline
                coordinates={polylineCoords}
                strokeColor="#00d46a"
                strokeWidth={4}
              />
            )}

            {/* Pickup marker */}
            <Marker
              coordinate={
                pickupLat !== null && pickupLng !== null
                  ? { latitude: pickupLat, longitude: pickupLng }
                  : { latitude: region.latitude - 0.005, longitude: region.longitude - 0.005 }
              }
              anchor={{ x: 0.5, y: 0.5 }}
            >
              <Text style={{ fontSize: 20 }}>📍</Text>
            </Marker>

            {/* Destination marker */}
            {destLat !== null && destLng !== null && (
              <Marker
                coordinate={{ latitude: destLat, longitude: destLng }}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Text style={{ fontSize: 20 }}>🏁</Text>
              </Marker>
            )}

            {/* Live driver marker — snapped to polyline */}
            {driverMarkerCoord !== null && (
              <Marker
                coordinate={driverMarkerCoord}
                anchor={{ x: 0.5, y: 0.5 }}
              >
                <Text style={{ fontSize: 24 }}>🚕</Text>
              </Marker>
            )}
          </MapView>
        )}

        {/* ETA overlay */}
        {displayEta !== null && (
          <View style={styles.etaOverlay}>
            <Text style={styles.etaText}>
              {i18n.t('eta_minutes').replace('{n}', String(displayEta))}
            </Text>
          </View>
        )}
      </View>

      {/* Status card */}
      <View style={[styles.statusCard, { borderLeftColor: ui.color }]}>
        <Text style={styles.statusEmoji}>{ui.emoji}</Text>
        <View style={styles.statusInfo}>
          <Text style={styles.statusTitle}>{ui.title}</Text>
          <Text style={styles.statusSubtitle}>{ui.subtitle}</Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${driverLocation?.progress_percent ?? 0}%` }]} />
      </View>

      {/* Driver info */}
      {status !== 'searching' && (
        <View style={styles.driverCard}>
          <View style={styles.driverAvatar}>
            <Text style={styles.driverAvatarText}>{driver.name.charAt(0)}</Text>
          </View>
          <View style={styles.driverInfo}>
            <Text style={styles.driverName}>{driver.name}</Text>
            <Text style={styles.driverPlate}>{driver.plate} • ⭐ {driver.rating}</Text>
          </View>
          <TouchableOpacity
            style={styles.callBtn}
            onPress={() => Linking.openURL(`tel:${driver.phone || '+255700000000'}`)}
          >
            <Text style={styles.callText}>📞</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Trip details */}
      <View style={styles.detailsCard}>
        <View style={styles.detailRow}>
          <Text style={styles.detailDot}>🟢</Text>
          <Text style={styles.detailText}>{pickup}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailDot}>🔴</Text>
          <Text style={styles.detailText}>{destination}</Text>
        </View>
        <View style={styles.fareRow}>
          <Text style={styles.fareLabel}>{i18n.t('fare_label')} Sh {fare?.toLocaleString()}</Text>
          <Text style={styles.farePayment}>
            {paymentMethod === 'cash' ? i18n.t('cash_payment') : i18n.t('mobile_payment')}
          </Text>
        </View>
      </View>

      {/* Cancel button (only before in_progress) */}
      {(status === 'searching' || status === 'accepted') && (
        <TouchableOpacity style={styles.cancelBtn} onPress={cancelTrip}>
          <Text style={styles.cancelText}>{i18n.t('cancel_trip')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },

  // Map
  mapArea: { height: 220, backgroundColor: '#16213e', justifyContent: 'center', alignItems: 'center', position: 'relative' },
  map: { ...StyleSheet.absoluteFillObject },
  mapLoader: { flex: 1 },

  // ETA overlay
  etaOverlay: {
    position: 'absolute', top: 8, right: 8,
    backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 16, paddingVertical: 6, paddingHorizontal: 12,
  },
  etaText: { color: '#fff', fontSize: 12 },

  // Status card
  statusCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e',
    margin: 16, padding: 16, borderRadius: 12, borderLeftWidth: 4, elevation: 2,
  },
  statusEmoji: { fontSize: 28, marginRight: 12 },
  statusInfo: { flex: 1 },
  statusTitle: { fontSize: 16, fontWeight: '600', color: '#ffffff' },
  statusSubtitle: { fontSize: 13, color: '#aaaaaa', marginTop: 2 },

  // Progress bar
  progressTrack: {
    backgroundColor: '#333', height: 6, borderRadius: 3, marginHorizontal: 16, marginBottom: 12,
  },
  progressFill: { backgroundColor: '#00d46a', height: 6, borderRadius: 3 },

  // Driver card
  driverCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#16213e',
    marginHorizontal: 16, marginBottom: 12, padding: 14, borderRadius: 12, elevation: 1,
  },
  driverAvatar: {
    width: 44, height: 44, borderRadius: 22, backgroundColor: '#00d46a',
    justifyContent: 'center', alignItems: 'center',
  },
  driverAvatarText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  driverInfo: { flex: 1, marginLeft: 12 },
  driverName: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
  driverPlate: { fontSize: 12, color: '#aaaaaa', marginTop: 2 },
  callBtn: { padding: 10 },
  callText: { fontSize: 22 },

  // Trip details
  detailsCard: { backgroundColor: '#16213e', marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 12 },
  detailRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  detailDot: { fontSize: 10, marginRight: 10 },
  detailText: { fontSize: 14, color: '#ffffff', flex: 1 },
  fareRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#2a2a4e' },
  fareLabel: { fontSize: 15, fontWeight: '600', color: '#00d46a' },
  farePayment: { fontSize: 13, color: '#aaaaaa' },

  // Cancel
  cancelBtn: { marginHorizontal: 16, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#ff3b30', alignItems: 'center' },
  cancelText: { color: '#ff3b30', fontSize: 15, fontWeight: '600' },
});

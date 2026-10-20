import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar,
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

export default function TrafficScreen({ navigation }: any) {
  const [segments, setSegments] = useState<TrafficSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [overallStatus, setOverallStatus] = useState<string>('clear');
  const [region, setRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const regionRef = useRef(region);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchTraffic = async () => {
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const { latitude, longitude } = regionRef.current;
      const res = await axios.get(
        `${API}/tracking/traffic?lat=${latitude}&lng=${longitude}&radius=5`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data: TrafficSegment[] = res.data;
      if (data && data.length > 0) {
        setSegments(data);
        setLastUpdated(new Date());
        // Compute overall status
        if (data.some((s) => s.status === 'jam')) {
          setOverallStatus('jam');
        } else if (data.some((s) => s.status === 'slow')) {
          setOverallStatus('slow');
        } else {
          setOverallStatus('clear');
        }
      }
    } catch {
      // Keep last known segments on failure
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const newRegion = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
            latitudeDelta: 0.06,
            longitudeDelta: 0.06,
          };
          setRegion(newRegion);
          regionRef.current = newRegion;
        } catch {
          // Use default Dar es Salaam region
        }
      }
    })();

    fetchTraffic();
    pollingRef.current = setInterval(fetchTraffic, 30000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top card */}
      <View style={styles.topCard}>
        <Text style={styles.topTitle}>🗺️ Hali ya Barabara</Text>
        <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[overallStatus] }]}>
          <Text style={styles.statusBadgeText}>{OVERALL_LABELS[overallStatus]}</Text>
        </View>
      </View>

      {/* Map */}
      <View style={styles.mapContainer}>
        {loading && segments.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#00d46a" />
          </View>
        ) : (
          <MapView
            provider={PROVIDER_GOOGLE}
            style={styles.map}
            region={region}
            showsUserLocation
          >
            {segments.map((seg) => (
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
        )}

        {/* No data banner */}
        {!loading && segments.length === 0 && (
          <View style={styles.noDataBanner}>
            <Text style={styles.noDataText}>Habari za msongamano hazipatikani sasa</Text>
          </View>
        )}
      </View>

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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1a1a2e' },
  topCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    margin: 16, padding: 16, backgroundColor: '#0d0d1a', borderRadius: 12,
  },
  topTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  statusBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noDataBanner: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
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
});

import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ActivityIndicator, StatusBar,
} from 'react-native';
import MapView, { Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import i18n from '../i18n';

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

interface Prediction {
  segment_id: string;
  road_name: string;
  predicted_speed_kmh: number;
  status: 'clear' | 'slow' | 'jam';
  color: string;
  confidence: number;
  model_type: string;
  observations_used: number;
}

const STATUS_COLORS: Record<string, string> = {
  clear: '#00d46a',
  slow: '#ff9500',
  jam: '#ff3b30',
};

export default function TrafficScreen({ navigation }: any) {

  const [segments, setSegments] = useState<TrafficSegment[]>([]);
  const [loading, setLoading] = useState(true);
  const [overallStatus, setOverallStatus] = useState<string>('clear');
  const [, forceUpdate] = useState(0);
  const [region, setRegion] = useState({
    latitude: -6.7924,
    longitude: 39.2083,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  });
  const regionRef = useRef(region);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Departure-time selector + ML prediction state
  const [departureOffset, setDepartureOffset] = useState<0 | 30 | 60>(0);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [confidenceKey, setConfidenceKey] = useState<string>('');
  const [bestTime, setBestTime] = useState<{ best_time: string; savings_minutes: number } | null>(null);
  const [usingCache, setUsingCache] = useState(false);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate(n => n + 1));
  }, []);

  const fetchTraffic = async () => {
    setUsingCache(false);
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const res = await axios.get(`${API}/tracking/traffic/segments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: TrafficSegment[] = res.data.segments || res.data;
      if (data && data.length > 0) {
        setSegments(data);
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

  const fetchPredict = async (segmentIds: string[]) => {
    if (!segmentIds.length) return;
    const departure_time = new Date(Date.now() + departureOffset * 60000).toISOString();
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      const res = await axios.post(
        `${API}/tracking/traffic/predict`,
        { segment_ids: segmentIds, departure_time },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const preds: Prediction[] = res.data.predictions || res.data;
      if (preds && preds.length > 0) {
        setPredictions(preds);
        const avgConf = preds.reduce((sum, p) => sum + (p.confidence || 0), 0) / preds.length;
        if (avgConf >= 0.7) setConfidenceKey('high_confidence');
        else if (avgConf >= 0.4) setConfidenceKey('medium_confidence');
        else setConfidenceKey('baseline_prediction');
      }
      setUsingCache(false);

      // Best-time recommendation (only meaningful after a successful predict)
      try {
        const fromTime = new Date().toISOString();
        const btRes = await axios.get(
          `${API}/tracking/traffic/best-time?segment_ids=${segmentIds.join(',')}&from_time=${encodeURIComponent(fromTime)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const bt = btRes.data;
        if (bt && bt.savings_minutes && bt.savings_minutes > 5) {
          setBestTime({ best_time: bt.best_time, savings_minutes: bt.savings_minutes });
        } else {
          setBestTime(null);
        }
      } catch {
        setBestTime(null);
      }
    } catch {
      // Predict failed: keep last successful predictions, show cached-data banner
      setUsingCache(true);
    }
  };

  // Re-predict whenever the segment list loads or the departure offset changes
  useEffect(() => {
    if (segments.length > 0) {
      fetchPredict(segments.map((s) => s.segment_id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [segments, departureOffset]);

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

  const predictionFor = (id: string) => predictions.find((p) => p.segment_id === id);

  const formatBestTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return iso;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top card */}
      <View style={styles.topCard}>
        <Text style={styles.topTitle}>🗺️ {i18n.t('road_conditions')}</Text>
        <View style={styles.statusBadgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[overallStatus] }]}>
            <Text style={styles.statusBadgeText}>
              {overallStatus === 'clear' ? i18n.t('traffic_good') : overallStatus === 'slow' ? i18n.t('traffic_fair') : i18n.t('traffic_jam')}
            </Text>
          </View>
          {confidenceKey ? (
            <Text style={styles.confidenceText}>{i18n.t(confidenceKey)}</Text>
          ) : null}
        </View>
      </View>

      {/* Departure-time selector */}
      <View style={styles.departureRow}>
        <TouchableOpacity
          style={[styles.departureBtn, departureOffset === 0 && styles.departureBtnActive]}
          onPress={() => setDepartureOffset(0)}
        >
          <Text style={[styles.departureBtnText, departureOffset === 0 && styles.departureBtnTextActive]}>
            {i18n.t('depart_now')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.departureBtn, departureOffset === 30 && styles.departureBtnActive]}
          onPress={() => setDepartureOffset(30)}
        >
          <Text style={[styles.departureBtnText, departureOffset === 30 && styles.departureBtnTextActive]}>
            {i18n.t('depart_30min')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.departureBtn, departureOffset === 60 && styles.departureBtnActive]}
          onPress={() => setDepartureOffset(60)}
        >
          <Text style={[styles.departureBtnText, departureOffset === 60 && styles.departureBtnTextActive]}>
            {i18n.t('depart_1hr')}
          </Text>
        </TouchableOpacity>
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
            {segments.map((seg) => {
              const pred = predictionFor(seg.segment_id);
              const color = (pred && pred.color) || STATUS_COLORS[seg.status];
              return (
                <Polyline
                  key={seg.segment_id}
                  coordinates={[
                    { latitude: seg.lat_start, longitude: seg.lng_start },
                    { latitude: seg.lat_end, longitude: seg.lng_end },
                  ]}
                  strokeColor={color}
                  strokeWidth={5}
                />
              );
            })}
          </MapView>
        )}

        {/* No data banner */}
        {!loading && segments.length === 0 && (
          <View style={styles.noDataBanner}>
            <Text style={styles.noDataText}>{i18n.t('no_traffic_data')}</Text>
          </View>
        )}

        {/* Cached-data / offline banner */}
        {usingCache && (
          <View style={styles.cacheBanner}>
            <Text style={styles.cacheText}>{i18n.t('traffic_unavailable')}</Text>
          </View>
        )}

        {/* Best-time recommendation card */}
        {bestTime && bestTime.savings_minutes > 5 && (
          <View style={styles.bestTimeCard}>
            <Text style={styles.bestTimeText}>
              {i18n.t('best_time')} {formatBestTime(bestTime.best_time)} — {i18n.t('save_minutes').replace('{n}', String(Math.round(bestTime.savings_minutes)))} 🕒
            </Text>
          </View>
        )}
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendItem}>{i18n.t('legend_clear')}</Text>
        <Text style={styles.legendItem}>{i18n.t('legend_slow')}</Text>
        <Text style={styles.legendItem}>{i18n.t('legend_congested')}</Text>
      </View>

      {/* CTA */}
      <TouchableOpacity style={styles.ctaBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.ctaBtnText}>{i18n.t('start_journey')} 🚀</Text>
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
  statusBadgeRow: { flexDirection: 'row', alignItems: 'center' },
  statusBadge: { borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  statusBadgeText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  confidenceText: { color: '#aaa', fontSize: 12, marginLeft: 10, fontWeight: '600' },
  departureRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginHorizontal: 16, marginBottom: 12,
  },
  departureBtn: {
    flex: 1, marginHorizontal: 4, paddingVertical: 10, borderRadius: 10,
    backgroundColor: '#0d0d1a', alignItems: 'center', borderWidth: 1, borderColor: '#2a2a44',
  },
  departureBtnActive: { backgroundColor: '#00d46a', borderColor: '#00d46a' },
  departureBtnText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  departureBtnTextActive: { color: '#1a1a2e' },
  mapContainer: { flex: 1 },
  map: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  noDataBanner: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: '#0d0d1a', borderRadius: 10, padding: 14, alignItems: 'center',
  },
  noDataText: { color: '#aaa', fontSize: 14 },
  cacheBanner: {
    position: 'absolute', top: 16, left: 16, right: 16,
    backgroundColor: '#3a2a00', borderRadius: 10, padding: 10, alignItems: 'center',
  },
  cacheText: { color: '#ff9500', fontSize: 13, fontWeight: '600' },
  bestTimeCard: {
    position: 'absolute', bottom: 16, left: 16, right: 16,
    backgroundColor: '#00d46a', borderRadius: 12, padding: 14, alignItems: 'center',
  },
  bestTimeText: { color: '#1a1a2e', fontSize: 15, fontWeight: '700' },
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

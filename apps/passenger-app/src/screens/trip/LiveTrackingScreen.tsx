import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { TripAPI } from '../../services/api/TripAPI';
import type { GeoPoint, VehiclePosition } from '../../types/shared';

type LiveTrackingRouteProp = RouteProp<{ LiveTracking: { tripId: string; vehicleId: string } }, 'LiveTracking'>;

interface TripTracking {
  tripId: string;
  vehicleId: string;
  vehicleLocation: GeoPoint; // REAL driver location (updated every 5s)
  passengerLocation: GeoPoint; // REAL passenger pickup location
  destination: GeoPoint; // REAL destination location
  vehicleSpeed: number; // REAL vehicle speed
  eta: number; // Estimated time to arrival
  status: string;
  driverName: string;
  driverRating: number;
  vehiclePlate: string;
  occupancy: number;
  crowdingLevel: string;
}

const LiveTrackingScreen: React.FC = () => {
  const route = useRoute<LiveTrackingRouteProp>();
  const { tripId, vehicleId } = route.params;
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [tripData, setTripData] = useState<TripTracking | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<GeoPoint[]>([]); // Journey history (all driver positions)
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [updateCount, setUpdateCount] = useState(0); // Track number of updates

  useEffect(() => {
    loadTripTracking();
    
    // Set up auto-refresh every 5 seconds for REAL-TIME updates
    if (autoRefresh) {
      const interval = setInterval(() => {
        loadTripTracking();
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, tripId]);

  const loadTripTracking = async () => {
    try {
      // Fetch REAL tracking data from backend
      const trip = await TripAPI.getActiveTripTracking(tripId);
      setTripData(trip);
      setError(null);
      
      // Build REAL route path - shows all positions driver has traveled
      if (trip.vehicleLocation) {
        setRoutePath(prev => {
          // Check if this is a new location (not the same as last)
          if (prev.length === 0 || 
              prev[prev.length - 1].lat !== trip.vehicleLocation.lat ||
              prev[prev.length - 1].lon !== trip.vehicleLocation.lon) {
            return [...prev, trip.vehicleLocation];
          }
          return prev;
        });
        setUpdateCount(prev => prev + 1);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load trip tracking');
      console.error('Tracking error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const formatETA = (minutes: number) => {
    if (minutes < 1) return 'Arriving now';
    if (minutes === 1) return '1 minute';
    return `${minutes} minutes`;
  };

  const formatSpeed = (speed: number) => {
    return `${Math.round(speed)} km/h`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Loading live tracking...
        </Text>
      </View>
    );
  }

  if (error || !tripData) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Icon name="alert-circle" size={48} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error || 'Unable to load tracking'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={loadTripTracking}
        >
          <Text style={[styles.retryText, { color: theme.colors.white }]}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const mapRegion = {
    latitude: tripData.vehicleLocation.lat,
    longitude: tripData.vehicleLocation.lon,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Map View */}
      <MapView
        style={styles.map}
        region={mapRegion}
        zoomEnabled={true}
        scrollEnabled={true}
      >
        {/* Vehicle Marker */}
        <Marker
          coordinate={{
            latitude: tripData.vehicleLocation.lat,
            longitude: tripData.vehicleLocation.lon,
          }}
          title={tripData.driverName}
          description={`${tripData.vehiclePlate} - ${tripData.status}`}
        >
          <View style={[styles.vehicleMarker, { backgroundColor: theme.colors.primary }]}>
            <Icon name="car" size={24} color={theme.colors.white} />
          </View>
        </Marker>

        {/* Passenger Location Marker */}
        <Marker
          coordinate={{
            latitude: tripData.passengerLocation.lat,
            longitude: tripData.passengerLocation.lon,
          }}
          title="Your Location"
          pinColor={theme.colors.success}
        >
          <View style={[styles.passengerMarker, { backgroundColor: theme.colors.success }]}>
            <Icon name="map-marker" size={24} color={theme.colors.white} />
          </View>
        </Marker>

        {/* Destination Marker */}
        <Marker
          coordinate={{
            latitude: tripData.destination.lat,
            longitude: tripData.destination.lon,
          }}
          title="Destination"
          pinColor={theme.colors.error}
        >
          <View style={[styles.destinationMarker, { backgroundColor: theme.colors.error }]}>
            <Icon name="flag" size={24} color={theme.colors.white} />
          </View>
        </Marker>

        {/* Route Path */}
        {routePath.length > 1 && (
          <Polyline
            coordinates={routePath.map(point => ({
              latitude: point.lat,
              longitude: point.lon,
            }))}
            strokeColor={theme.colors.primary}
            strokeWidth={3}
          />
        )}
      </MapView>

      {/* Bottom Info Sheet */}
      <ScrollView
        style={[styles.infoSheet, { backgroundColor: theme.colors.surface }]}
        scrollEnabled={false}
      >
        {/* Driver Info */}
        <View style={styles.section}>
          <View style={styles.driverHeader}>
            <View style={styles.driverInfo}>
              <Text style={[styles.driverName, { color: theme.colors.text }]}>
                {tripData.driverName}
              </Text>
              <View style={styles.ratingContainer}>
                <Icon name="star" size={16} color={theme.colors.warning} />
                <Text style={[styles.ratingText, { color: theme.colors.text }]}>
                  {tripData.driverRating.toFixed(1)}
                </Text>
              </View>
            </View>
            <View style={styles.vehicleInfo}>
              <Text style={[styles.vehiclePlate, { color: theme.colors.text }]}>
                {tripData.vehiclePlate}
              </Text>
              <Text style={[styles.vehicleStatus, { color: theme.colors.textSecondary }]}>
                {tripData.occupancy} passengers
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Status */}
        <View style={styles.section}>
          <View style={styles.statusGrid}>
            {/* ETA */}
            <View style={styles.statusCard}>
              <Icon name="clock-outline" size={24} color={theme.colors.primary} />
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                ETA
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {formatETA(tripData.eta)}
              </Text>
            </View>

            {/* Speed */}
            <View style={styles.statusCard}>
              <Icon name="speedometer" size={24} color={theme.colors.primary} />
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                Speed
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {formatSpeed(tripData.vehicleSpeed)}
              </Text>
            </View>

            {/* Crowding */}
            <View style={styles.statusCard}>
              <Icon name="account-multiple" size={24} color={theme.colors.primary} />
              <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
                Crowd
              </Text>
              <Text style={[styles.statusValue, { color: theme.colors.text }]}>
                {tripData.crowdingLevel}
              </Text>
            </View>
          </View>
        </View>

        {/* Trip Status Badge */}
        <View style={styles.section}>
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor:
                  tripData.status === 'arrived'
                    ? theme.colors.success
                    : tripData.status === 'on-trip'
                      ? theme.colors.primary
                      : theme.colors.warning,
              },
            ]}
          >
            <Icon
              name={
                tripData.status === 'arrived'
                  ? 'check-circle'
                  : tripData.status === 'on-trip'
                    ? 'navigation'
                    : 'clock'
              }
              size={20}
              color={theme.colors.white}
            />
            <Text style={[styles.statusBadgeText, { color: theme.colors.white }]}>
              {tripData.status === 'arrived'
                ? 'Vehicle Arrived'
                : tripData.status === 'on-trip'
                  ? 'En Route'
                  : 'Arriving Soon'}
            </Text>
          </View>
        </View>

        {/* Auto-Refresh Toggle */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[
              styles.refreshToggle,
              {
                backgroundColor: autoRefresh
                  ? theme.colors.primary + '20'
                  : theme.colors.disabled,
              },
            ]}
            onPress={() => setAutoRefresh(!autoRefresh)}
          >
            <Icon
              name={autoRefresh ? 'sync' : 'sync-off'}
              size={20}
              color={autoRefresh ? theme.colors.primary : theme.colors.textSecondary}
            />
            <Text
              style={[
                styles.refreshToggleText,
                {
                  color: autoRefresh
                    ? theme.colors.primary
                    : theme.colors.textSecondary,
                },
              ]}
            >
              {autoRefresh ? 'Live Tracking On' : 'Live Tracking Off'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  map: {
    flex: 1,
    minHeight: 300,
  },
  vehicleMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  passengerMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  destinationMarker: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoSheet: {
    maxHeight: 300,
    padding: 16,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  section: {
    marginBottom: 16,
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  driverInfo: {
    flex: 1,
  },
  driverName: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '600',
  },
  vehicleInfo: {
    alignItems: 'flex-end',
  },
  vehiclePlate: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  vehicleStatus: {
    fontSize: 12,
  },
  statusGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statusCard: {
    flex: 1,
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  statusLabel: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 2,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  loadingText: {
    fontSize: 14,
    marginTop: 12,
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  retryText: {
    fontSize: 14,
    fontWeight: '600',
  },
  refreshToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 8,
  },
  refreshToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default LiveTrackingScreen;





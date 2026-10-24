import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../../navigation/MainNavigator';
import { APIClient } from '../../services/api/client';

type TripDetailsScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'TripDetails'>;
type TripDetailsScreenRouteProp = RouteProp<HomeStackParamList, 'TripDetails'>;

interface Props {
  navigation: TripDetailsScreenNavigationProp;
  route: TripDetailsScreenRouteProp;
}

interface TripDetail {
  id: string;
  reference?: string;
  created_at?: string;
  started_at?: string;
  completed_at?: string;
  pickup_address?: string;
  destination_address?: string;
  distance_km?: number;
  duration_min?: number;
  fare?: number;
  payment_method?: string;
  passenger_first_name?: string;
  passenger_rating?: number;
  status?: string;
}

const TripDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { tripId } = route.params;

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTrip = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await APIClient.get<TripDetail>(`/trips/${tripId}`);
      setTrip(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load trip details');
    } finally {
      setIsLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    fetchTrip();
  }, [fetchTrip]);

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      case 'in-progress':
      case 'in_progress':
        return theme.colors.primary;
      default:
        return theme.colors.warning;
    }
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderStars = (count?: number) => {
    if (!count) return <Text style={[styles.infoValue, { color: theme.colors.textSecondary }]}>—</Text>;
    return (
      <View style={styles.starsRow}>
        {[1, 2, 3, 4, 5].map((i) => (
          <Icon
            key={i}
            name={i <= count ? 'star' : 'star-outline'}
            size={18}
            color={i <= count ? '#F59E0B' : theme.colors.textSecondary}
          />
        ))}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error || !trip) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Icon name="alert-circle-outline" size={64} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {error || 'Trip not found'}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={fetchTrip}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const statusColor = getStatusColor(trip.status);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Status Badge */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.statusRow}>
          <Text style={[styles.referenceText, { color: theme.colors.textSecondary }]}>
            Ref: {trip.reference || trip.id.slice(0, 8).toUpperCase()}
          </Text>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {(trip.status || 'unknown').replace(/_/g, ' ').toUpperCase()}
            </Text>
          </View>
        </View>
        <Text style={[styles.dateText, { color: theme.colors.textSecondary }]}>
          {formatDateTime(trip.created_at || trip.started_at)}
        </Text>
      </View>

      {/* Route Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Route</Text>

        <View style={styles.routeRow}>
          <Icon name="circle" size={12} color={theme.colors.primary} />
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: theme.colors.textSecondary }]}>Pickup</Text>
            <Text style={[styles.routeAddress, { color: theme.colors.text }]}>
              {trip.pickup_address || '—'}
            </Text>
          </View>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routeRow}>
          <Icon name="map-marker" size={16} color={theme.colors.error} />
          <View style={styles.routeTextContainer}>
            <Text style={[styles.routeLabel, { color: theme.colors.textSecondary }]}>Destination</Text>
            <Text style={[styles.routeAddress, { color: theme.colors.text }]}>
              {trip.destination_address || '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Trip Stats */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Trip Details</Text>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Icon name="map-marker-distance" size={20} color={theme.colors.primary} />
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Distance</Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {trip.distance_km != null ? `${trip.distance_km} km` : '—'}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Icon name="clock-outline" size={20} color={theme.colors.primary} />
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Duration</Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {trip.duration_min != null ? `${trip.duration_min} min` : '—'}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.colors.border }]} />
          <View style={styles.statItem}>
            <Icon name="cash" size={20} color={theme.colors.primary} />
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>Fare</Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              {trip.fare != null ? `TSh ${trip.fare.toLocaleString()}` : '—'}
            </Text>
          </View>
        </View>
      </View>

      {/* Passenger & Payment */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Passenger & Payment</Text>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Passenger</Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            {trip.passenger_first_name || '—'}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Payment</Text>
          <Text style={[styles.infoValue, { color: theme.colors.text }]}>
            {trip.payment_method
              ? trip.payment_method.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c: string) => c.toUpperCase())
              : '—'}
          </Text>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>Rating Given</Text>
          {renderStars(trip.passenger_rating)}
        </View>
      </View>

      {/* Report Issue Button */}
      <TouchableOpacity
        style={[styles.reportButton, { borderColor: theme.colors.error }]}
        onPress={() => Linking.openURL('mailto:support@safiriharaka.co.tz?subject=Trip%20Issue%20' + encodeURIComponent(trip.reference || trip.id))}
      >
        <Icon name="flag-outline" size={18} color={theme.colors.error} />
        <Text style={[styles.reportButtonText, { color: theme.colors.error }]}>
          Report an Issue
        </Text>
      </TouchableOpacity>

      <View style={styles.bottomSpacer} />
    </ScrollView>
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
  card: {
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  referenceText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  dateText: {
    fontSize: 13,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  routeTextContainer: {
    flex: 1,
  },
  routeLabel: {
    fontSize: 11,
    marginBottom: 2,
  },
  routeAddress: {
    fontSize: 14,
    fontWeight: '600',
  },
  routeLine: {
    width: 2,
    height: 20,
    marginLeft: 5,
    marginVertical: 6,
    backgroundColor: '#DDD',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 48,
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 14,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 2,
  },
  reportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  reportButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  retryButton: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '600',
  },
  bottomSpacer: {
    height: 32,
  },
});

export default TripDetailsScreen;

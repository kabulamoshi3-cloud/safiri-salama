import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useDriverStatus } from '../../contexts/DriverStatusContext';
import { DriverAPI, TripRequest } from '../../services/api/DriverAPI';
import { HomeStackParamList } from '../../navigation/MainNavigator';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'HomeMain'>;

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { status, setStatus, isTracking } = useDriverStatus();

  const [tripRequests, setTripRequests] = useState<TripRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [todayEarnings, setTodayEarnings] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [earnings, trips] = await Promise.all([
        DriverAPI.getEarnings(),
        DriverAPI.getTripRequests(),
      ]);

      setTodayEarnings(earnings.today);
      setTripRequests(trips);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const handleStatusToggle = async () => {
    const newStatus = status === 'offline' ? 'available' : 'offline';
    try {
      await setStatus(newStatus);
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to change status');
    }
  };

  const handleAcceptTrip = async (tripId: string) => {
    setIsLoading(true);
    try {
      const activeTrip = await DriverAPI.acceptTrip(tripId);
      navigation.navigate('ActiveTrip', {
        tripId: activeTrip.id,
        pickup_lat: activeTrip.pickup?.lat ?? 0,
        pickup_lng: activeTrip.pickup?.lng ?? 0,
        destination_lat: activeTrip.destination?.lat ?? 0,
        destination_lng: activeTrip.destination?.lng ?? 0,
        passenger_name: activeTrip.passengerName ?? '',
        fare: activeTrip.fare ?? 0,
      });
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to accept trip');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeclineTrip = async (tripId: string) => {
    try {
      await DriverAPI.declineTrip(tripId, 'Declined by driver');
      setTripRequests(tripRequests.filter((t) => t.id !== tripId));
    } catch (error) {
      Alert.alert(t('common.error'), 'Failed to decline trip');
    }
  };

  const statusColor =
    status === 'offline'
      ? theme.colors.error
      : status === 'available'
        ? theme.colors.success
        : theme.colors.warning;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
    >
      <View style={[styles.statusCard, { backgroundColor: statusColor + '20' }]}>
        <View style={styles.statusContent}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
          <View>
            <Text style={[styles.statusLabel, { color: theme.colors.textSecondary }]}>
              Current Status
            </Text>
            <Text style={[styles.statusValue, { color: statusColor }]}>
              {status.toUpperCase()}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.statusButton,
            {
              backgroundColor: statusColor,
              opacity: isLoading ? 0.6 : 1,
            },
          ]}
          onPress={handleStatusToggle}
          disabled={isLoading}
        >
          <Icon
            name={status === 'offline' ? 'power' : 'power-off'}
            size={20}
            color={theme.colors.white}
          />
          <Text style={[styles.statusButtonText, { color: theme.colors.white }]}>
            {status === 'offline' ? t('status.goOnline') : t('status.goOffline')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            {t('home.todayEarnings')}
          </Text>
          <Text style={[styles.statValue, { color: theme.colors.primary }]}>
            TSh {todayEarnings.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.statCard, { backgroundColor: theme.colors.surface }]}>
          <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
            {t('home.rating')}
          </Text>
          <View style={styles.ratingContainer}>
            <Icon name="star" size={20} color={theme.colors.warning} />
            <Text style={[styles.statValue, { color: theme.colors.text }]}>4.8</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('home.newTripRequest')}
        </Text>

        {tripRequests.length === 0 && !isLoading && (
          <View style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}>
            <Icon name="inbox-outline" size={48} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No trip requests
            </Text>
          </View>
        )}

        {tripRequests.map((trip) => (
          <View
            key={trip.id}
            style={[styles.tripCard, { backgroundColor: theme.colors.surface }]}
          >
            <View style={styles.tripInfo}>
              <Text style={[styles.tripPassenger, { color: theme.colors.text }]}>
                {trip.passengerName}
              </Text>
              <Text style={[styles.tripDistance, { color: theme.colors.textSecondary }]}>
                {trip.estimatedDistance}km • {trip.estimatedDuration} min
              </Text>
              <Text style={[styles.tripFare, { color: theme.colors.primary }]}>
                TSh {trip.estimatedFare.toLocaleString()}
              </Text>
            </View>

            <View style={styles.tripActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.error }]}
                onPress={() => handleDeclineTrip(trip.id)}
              >
                <Icon name="close" size={20} color={theme.colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.colors.success }]}
                onPress={() => handleAcceptTrip(trip.id)}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.white} />
                ) : (
                  <Icon name="check" size={20} color={theme.colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  statusCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  statusLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  statusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  statusButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  statLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  tripCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  tripInfo: {
    flex: 1,
  },
  tripPassenger: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tripDistance: {
    fontSize: 14,
    marginBottom: 4,
  },
  tripFare: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tripActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { DriverAPI } from '../../services/api/DriverAPI';
import type { ActiveTrip } from '../../services/api/DriverAPI';

const TripsScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const [trips, setTrips] = useState<ActiveTrip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      const history = await DriverAPI.getTripHistory();
      setTrips(history);
    } catch (error) {
      console.error('Failed to load trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return theme.colors.success;
      case 'cancelled':
        return theme.colors.error;
      default:
        return theme.colors.warning;
    }
  };

  const renderTripItem = ({ item }: { item: ActiveTrip }) => (
    <TouchableOpacity
      style={[styles.tripCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.tripHeader}>
        <View>
          <Text style={[styles.tripPassenger, { color: theme.colors.text }]}>
            {item.passengerName}
          </Text>
          <Text style={[styles.tripTime, { color: theme.colors.textSecondary }]}>
            {item.startTime ? formatTime(item.startTime) : 'Pending'}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(item.status) },
            ]}
          >
            {item.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.tripRoute}>
        <View style={styles.routePoint}>
          <Icon name="circle" size={12} color={theme.colors.primary} />
          <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
            Pickup
          </Text>
        </View>

        <View style={styles.routeLine} />

        <View style={styles.routePoint}>
          <Icon name="map-marker" size={16} color={theme.colors.error} />
          <Text style={[styles.routeText, { color: theme.colors.text }]} numberOfLines={1}>
            Destination
          </Text>
        </View>
      </View>

      <View style={styles.tripFooter}>
        <Text style={[styles.tripFare, { color: theme.colors.primary }]}>
          TSh {item.fare.toLocaleString()}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('tabs.trips')}
        </Text>
      </View>

      <FlatList
        data={trips}
        renderItem={renderTripItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="map-marker-off" size={64} color={theme.colors.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
              No trips yet
            </Text>
          </View>
        }
      />
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
  header: {
    padding: 16,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  list: {
    padding: 16,
  },
  tripCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  tripPassenger: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  tripTime: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  tripRoute: {
    marginBottom: 12,
  },
  routePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeLine: {
    width: 2,
    height: 24,
    marginLeft: 5,
    marginVertical: 4,
    backgroundColor: '#DDD',
  },
  routeText: {
    fontSize: 14,
    flex: 1,
  },
  tripFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tripFare: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});

export default TripsScreen;

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocation } from '../../contexts/LocationContext';
import { useAuth } from '../../contexts/AuthContext';
import { HomeStackParamList } from '../../navigation/MainNavigator';
import { TripAPI } from '../../services/api/TripAPI';
import { WalletAPI } from '../../services/api/WalletAPI';
import type { SavedPlace } from '../../types/shared';

type HomeScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'HomeMain'>;

interface HomeScreenState {
  savedPlaces: SavedPlace[];
  walletBalance: number;
  activeTrip: any | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
}

const HomeScreen: React.FC = () => {
  const navigation = useNavigation<HomeScreenNavigationProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { currentLocation } = useLocation();
  const { user } = useAuth();

  const [state, setState] = useState<HomeScreenState>({
    savedPlaces: [],
    walletBalance: 0,
    activeTrip: null,
    loading: true,
    refreshing: false,
    error: null,
  });

  // Load data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      loadHomeData();
    }, [])
  );

  const loadHomeData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      // Load wallet balance
      const walletRes = await WalletAPI.getBalance();
      
      // Load active trip
      const activeTrip = await TripAPI.getActiveTrip();
      
      // Load saved places from context or local storage
      const savedPlaces: SavedPlace[] = [
        { id: '1', name: t('profile.home'), type: 'home', coordinates: null },
        { id: '2', name: t('profile.work'), type: 'work', coordinates: null },
      ];

      setState(prev => ({
        ...prev,
        walletBalance: walletRes.balance,
        activeTrip,
        savedPlaces,
        loading: false,
      }));
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        error: error.message || 'Failed to load home data',
        loading: false,
      }));
      console.error('Home data load error:', error);
    }
  };

  const onRefresh = async () => {
    setState(prev => ({ ...prev, refreshing: true }));
    await loadHomeData();
    setState(prev => ({ ...prev, refreshing: false }));
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case 'topup':
        navigation.navigate('TopUp');
        break;
      case 'qrpay':
        navigation.navigate('QRPayment');
        break;
      case 'emergency':
        // Will handle emergency with alert in future
        break;
      default:
        break;
    }
  };

  const handlePlacePress = (place: SavedPlace) => {
    navigation.navigate('TripPlanner', { destination: place.coordinates });
  };

  const quickActions = [
    {
      id: 'topup',
      icon: 'wallet-plus',
      label: t('home.topUp'),
      color: theme.colors.success,
    },
    {
      id: 'qrpay',
      icon: 'qrcode-scan',
      label: t('home.qrPay'),
      color: theme.colors.primary,
    },
    {
      id: 'emergency',
      icon: 'alert-circle',
      label: t('home.emergency'),
      color: theme.colors.error,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={state.refreshing} onRefresh={onRefresh} />}
    >
      {/* Header with Greeting */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.greeting, { color: theme.colors.text }]}>
            {t('auth.welcome')}, {user?.firstName || 'Passenger'}
          </Text>
          <Text style={[styles.subGreeting, { color: theme.colors.textSecondary }]}>
            {currentLocation ? `📍 ${currentLocation.address}` : 'Detecting location...'}
          </Text>
        </View>
        <View style={[styles.walletBadge, { backgroundColor: theme.colors.primary }]}>
          <Icon name="wallet" size={20} color={theme.colors.white} />
          <Text style={[styles.walletAmount, { color: theme.colors.white }]}>
            KES {state.walletBalance.toFixed(2)}
          </Text>
        </View>
      </View>

      {/* Active Trip Banner */}
      {state.activeTrip && (
        <TouchableOpacity
          style={[styles.activeTripBanner, { backgroundColor: theme.colors.primary + '20' }]}
          onPress={() =>
            navigation.navigate('LiveTracking', {
              tripId: state.activeTrip.id,
              vehicleId: state.activeTrip.vehicleId,
            })
          }
        >
          <View style={styles.activeTripContent}>
            <Icon name="car-connected" size={24} color={theme.colors.primary} />
            <View style={styles.activeTripText}>
              <Text style={[styles.activeTripTitle, { color: theme.colors.text }]}>
                Trip in Progress
              </Text>
              <Text style={[styles.activeTripSubtitle, { color: theme.colors.textSecondary }]}>
                Tap to view live tracking
              </Text>
            </View>
          </View>
          <Icon name="chevron-right" size={24} color={theme.colors.primary} />
        </TouchableOpacity>
      )}

      {/* Search Card */}
      <TouchableOpacity
        style={[styles.searchCard, { backgroundColor: theme.colors.surface }]}
        onPress={() => navigation.navigate('TripPlanner')}
      >
        <Icon name="map-search" size={24} color={theme.colors.primary} />
        <Text style={[styles.searchText, { color: theme.colors.textSecondary }]}>
          {t('home.whereToGo')}
        </Text>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          {t('home.quickActions')}
        </Text>
        <View style={styles.quickActionsGrid}>
          {quickActions.map(action => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => handleQuickAction(action.id)}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                <Icon name={action.icon} size={32} color={action.color} />
              </View>
              <Text style={[styles.actionLabel, { color: theme.colors.text }]}>
                {action.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Saved Places */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
            {t('home.savedPlaces')}
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SavedPlaces')}>
            <Text style={[styles.seeAll, { color: theme.colors.primary }]}>See all</Text>
          </TouchableOpacity>
        </View>

        {state.savedPlaces.length > 0 ? (
          state.savedPlaces.map(place => (
            <TouchableOpacity
              key={place.id}
              style={[styles.placeCard, { backgroundColor: theme.colors.surface }]}
              onPress={() => handlePlacePress(place)}
            >
              <Icon
                name={place.type === 'home' ? 'home' : 'briefcase'}
                size={24}
                color={theme.colors.primary}
              />
              <View style={styles.placeInfo}>
                <Text style={[styles.placeName, { color: theme.colors.text }]}>
                  {place.name}
                </Text>
                <Text style={[styles.placeAddress, { color: theme.colors.textSecondary }]}>
                  {place.coordinates ? `Set` : 'Add address'}
                </Text>
              </View>
              <Icon name="chevron-right" size={24} color={theme.colors.textSecondary} />
            </TouchableOpacity>
          ))
        ) : (
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No saved places yet
          </Text>
        )}
      </View>

      {/* Error Message */}
      {state.error && (
        <View style={[styles.errorBanner, { backgroundColor: theme.colors.error + '20' }]}>
          <Icon name="alert-circle" size={20} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {state.error}
          </Text>
        </View>
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subGreeting: {
    fontSize: 14,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  walletAmount: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  activeTripBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    borderLeftWidth: 4,
  },
  activeTripContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeTripText: {
    flex: 1,
  },
  activeTripTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  activeTripSubtitle: {
    fontSize: 12,
  },
  searchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    gap: 12,
  },
  searchText: {
    fontSize: 16,
    flex: 1,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },
  quickActionsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  actionCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  placeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    gap: 12,
  },
  placeInfo: {
    flex: 1,
  },
  placeName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  placeAddress: {
    fontSize: 14,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 14,
  },
});

export default HomeScreen;





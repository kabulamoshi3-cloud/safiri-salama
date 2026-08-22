import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { useLocation } from '../../contexts/LocationContext';
import { TripAPI, TripRequest } from '../../services/api/TripAPI';
import type { TripOption, GeoPoint } from '../../types/shared';

const TripPlannerScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { currentLocation } = useLocation();

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [tripOptions, setTripOptions] = useState<TripOption[]>([]);

  const handleFindRoutes = async () => {
    if (!currentLocation) {
      alert('Location not available');
      return;
    }

    if (!destination) {
      alert('Please enter a destination');
      return;
    }

    setIsLoading(true);
    try {
      // In real app, geocode the destination text to coordinates
      const destinationCoords: GeoPoint = { lat: -6.8206, lon: 39.2731 };

      const request: TripRequest = {
        origin: currentLocation,
        destination: destinationCoords,
      };

      const options = await TripAPI.planTrip(request);
      setTripOptions(options);
    } catch (error) {
      console.error('Failed to plan trip:', error);
      alert('Failed to find routes');
    } finally {
      setIsLoading(false);
    }
  };

  const renderTripOption = (option: TripOption, index: number) => (
    <TouchableOpacity
      key={index}
      style={[styles.optionCard, { backgroundColor: theme.colors.surface }]}
    >
      <View style={styles.optionHeader}>
        <View style={styles.optionBadge}>
          <Text style={[styles.optionBadgeText, { color: theme.colors.primary }]}>
            {t('trip.fastest')}
          </Text>
        </View>
        <Text style={[styles.optionCost, { color: theme.colors.text }]}>
          TSh {option.totalCost?.toLocaleString()}
        </Text>
      </View>

      <View style={styles.optionDetails}>
        <View style={styles.optionDetail}>
          <Icon name="clock-outline" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.optionDetailText, { color: theme.colors.text }]}>
            {option.totalDuration} min
          </Text>
        </View>

        <View style={styles.optionDetail}>
          <Icon name="walk" size={20} color={theme.colors.textSecondary} />
          <Text style={[styles.optionDetailText, { color: theme.colors.text }]}>
            {option.walkingDistance || 0}m {t('trip.walking')}
          </Text>
        </View>
      </View>

      <View style={styles.segments}>
        {option.segments?.map((segment, idx) => (
          <View key={idx} style={styles.segment}>
            <Icon
              name={segment.mode === 'walking' ? 'walk' : 'bus'}
              size={16}
              color={theme.colors.primary}
            />
            <Text style={[styles.segmentText, { color: theme.colors.textSecondary }]}>
              {segment.mode} • {segment.duration} min
            </Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.selectButton, { backgroundColor: theme.colors.primary }]}
      >
        <Text style={[styles.selectButtonText, { color: theme.colors.white }]}>
          {t('trip.selectRoute')}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.form}>
        <View style={[styles.inputCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.inputRow}>
            <Icon name="circle" size={12} color={theme.colors.primary} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder={t('home.currentLocation')}
              placeholderTextColor={theme.colors.textSecondary}
              value={origin}
              onChangeText={setOrigin}
              editable={false}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.inputRow}>
            <Icon name="map-marker" size={16} color={theme.colors.error} />
            <TextInput
              style={[styles.input, { color: theme.colors.text }]}
              placeholder={t('trip.to')}
              placeholderTextColor={theme.colors.textSecondary}
              value={destination}
              onChangeText={setDestination}
            />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.searchButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleFindRoutes}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={theme.colors.white} />
          ) : (
            <>
              <Icon name="magnify" size={20} color={theme.colors.white} />
              <Text style={[styles.searchButtonText, { color: theme.colors.white }]}>
                {t('trip.findRoutes')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {tripOptions.length > 0 && (
        <View style={styles.results}>
          <Text style={[styles.resultsTitle, { color: theme.colors.text }]}>
            {t('trip.tripOptions')}
          </Text>
          {tripOptions.map((option, index) => renderTripOption(option, index))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  form: {
    padding: 16,
  },
  inputCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 12,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  results: {
    padding: 16,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  optionCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  optionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  optionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    backgroundColor: '#FFF3E0',
  },
  optionBadgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  optionCost: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  optionDetails: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 12,
  },
  optionDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  optionDetailText: {
    fontSize: 14,
  },
  segments: {
    marginBottom: 16,
  },
  segment: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  segmentText: {
    fontSize: 14,
  },
  selectButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  selectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default TripPlannerScreen;





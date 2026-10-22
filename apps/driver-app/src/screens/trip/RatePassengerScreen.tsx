import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../../navigation/MainNavigator';
import { useTheme } from '../../contexts/ThemeContext';

type RatePassengerNavProp = StackNavigationProp<HomeStackParamList, 'RatePassenger'>;
type RatePassengerRouteProp = RouteProp<HomeStackParamList, 'RatePassenger'>;

interface Props {
  navigation: RatePassengerNavProp;
  route: RatePassengerRouteProp;
}

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const RatePassengerScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { tripId, passengerId, passengerName, fare } = route.params;
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const submitRating = async () => {
    try {
      const token = await AsyncStorage.getItem('@dalasmart:token');
      await axios.post(
        `${API_BASE}/ratings`,
        { trip_id: tripId, rating, review: comment || null },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] });
    } catch {
      Alert.alert(t('common.error'), t('rating.error'));
    }
  };

  const getRatingLabel = (r: number) => {
    if (r === 5) return t('rating.excellent');
    if (r === 4) return t('rating.good');
    if (r === 3) return t('rating.okay');
    if (r === 2) return t('rating.poor');
    return t('rating.terrible');
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
        <Text style={styles.checkmark}>✅</Text>
        <Text style={styles.title}>{t('rating.tripCompleted')}</Text>
        <Text style={styles.fare}>TSh {fare?.toLocaleString()}</Text>
      </View>

      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>{t('rating.ratePassenger')}</Text>

        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
            <Text style={styles.avatarText}>
              {(passengerName ?? 'A').charAt(0).toUpperCase()}
            </Text>
          </View>
          <Text style={[styles.passengerName, { color: theme.colors.text }]}>
            {passengerName ?? t('trip.passenger')}
          </Text>
        </View>

        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <Text style={[styles.star, star <= rating && styles.starActive]}>★</Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={[styles.ratingLabel, { color: theme.colors.textSecondary }]}>
          {getRatingLabel(rating)}
        </Text>

        <TextInput
          style={[styles.commentInput, { borderColor: theme.colors.border, color: theme.colors.text }]}
          placeholder={t('rating.comment')}
          placeholderTextColor={theme.colors.textSecondary}
          value={comment}
          onChangeText={setComment}
          multiline
        />

        <TouchableOpacity
          style={[styles.submitBtn, { backgroundColor: theme.colors.primary }]}
          onPress={submitRating}
        >
          <Text style={styles.submitText}>{t('rating.submit')}</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.reset({ index: 0, routes: [{ name: 'HomeMain' }] })}>
          <Text style={[styles.skipText, { color: theme.colors.textSecondary }]}>
            {t('rating.skip')}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container:    { flex: 1 },
  header:       { padding: 30, alignItems: 'center' },
  checkmark:    { fontSize: 40, marginBottom: 8 },
  title:        { fontSize: 22, fontWeight: 'bold', color: '#fff' },
  fare:         { fontSize: 24, fontWeight: 'bold', color: '#fff', marginTop: 8 },
  card:         { margin: 16, borderRadius: 14, padding: 20 },
  cardTitle:    { fontSize: 17, fontWeight: '600', marginBottom: 16 },
  avatarRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  avatar:       { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText:   { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  passengerName:{ fontSize: 16 },
  starsRow:     { flexDirection: 'row', justifyContent: 'center', marginBottom: 6 },
  star:         { fontSize: 40, color: '#ddd', marginHorizontal: 4 },
  starActive:   { color: '#ffc107' },
  ratingLabel:  { textAlign: 'center', fontSize: 14, marginBottom: 16 },
  commentInput: { borderWidth: 1, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 60, textAlignVertical: 'top', marginBottom: 16 },
  submitBtn:    { padding: 16, borderRadius: 10, alignItems: 'center', marginBottom: 12 },
  submitText:   { color: '#fff', fontSize: 16, fontWeight: '600' },
  skipText:     { textAlign: 'center', fontSize: 14, paddingVertical: 8 },
});

export default RatePassengerScreen;

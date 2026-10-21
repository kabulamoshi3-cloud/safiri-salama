import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { HomeStackParamList } from '../../navigation/MainNavigator';

interface Trip {
  id: string;
  passengerName: string;
  pickup: string;
  destination: string;
  fare: number;
  distance: number;
  estimatedTime: number;
  status: 'in_progress' | 'completed';
}

type ActiveTripScreenNavigationProp = StackNavigationProp<HomeStackParamList, 'ActiveTrip'>;
type ActiveTripScreenRouteProp = RouteProp<HomeStackParamList, 'ActiveTrip'>;

interface Props {
  navigation: ActiveTripScreenNavigationProp;
  route: ActiveTripScreenRouteProp;
}

const ActiveTripScreen: React.FC<Props> = ({ navigation, route }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  
  const [trip, setTrip] = useState<Trip>({
    id: 'TRIP001',
    passengerName: 'John Doe',
    pickup: 'Kariakoo Market',
    destination: 'University of Dar es Salaam',
    fare: 12500,
    distance: 8.5,
    estimatedTime: 25,
    status: 'in_progress',
  });

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('');
  const [transactionId, setTransactionId] = useState('');

  const handleCompleteTrip = () => {
    setShowPaymentModal(true);
  };

  const handlePaymentConfirm = (method: string) => {
    setSelectedPaymentMethod(method);
    
    if (method === 'cash') {
      // Cash payment - no transaction ID needed
      confirmPayment(method, '');
    } else {
      // Mobile money - show transaction ID input
      // Modal already shows input field
    }
  };

  const confirmPayment = (method: string, txnId: string) => {
    Alert.alert(
      t('paymentConfirmed') || 'Payment Confirmed',
      `${t('paymentReceived') || 'Payment received'}: TZS ${trip.fare.toLocaleString()}\n${
        t('method') || 'Method'
      }: ${method.toUpperCase()}${txnId ? `\nID: ${txnId}` : ''}`,
      [
        {
          text: t('ok') || 'OK',
          onPress: () => {
            setTrip({ ...trip, status: 'completed' });
            setShowPaymentModal(false);
            // TODO: Send to backend API
          },
        },
      ]
    );
  };

  const handleStartTrip = () => {
    navigation.navigate('Navigation', {
      tripId: route.params.tripId,
      pickup_lat: route.params.pickup_lat ?? 0,
      pickup_lng: route.params.pickup_lng ?? 0,
      destination_lat: route.params.destination_lat ?? 0,
      destination_lng: route.params.destination_lng ?? 0,
      passenger_name: route.params.passenger_name ?? trip.passengerName,
      fare: route.params.fare ?? trip.fare,
    });
  };

  const handleArrived = () => {
    Alert.alert(
      t('arrived') || 'Arrived',
      t('completeTrip') || 'Complete the trip to collect payment'
    );
  };

  if (trip.status === 'completed') {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.completedContainer}>
          <Text style={[styles.completedTitle, { color: theme.colors.primary }]}>
            ✅ {t('tripCompleted') || 'Trip Completed'}
          </Text>
          <Text style={[styles.completedText, { color: theme.colors.text }]}>
            {t('paymentReceived') || 'Payment Received'}: TZS {trip.fare.toLocaleString()}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Trip Info Card */}
      <View style={[styles.card, { backgroundColor: theme.colors.card }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>
          🚗 {t('activeTrip') || 'Active Trip'}
        </Text>
        
        <View style={styles.infoRow}>
          <Text style={[styles.label, { color: theme.colors.textSecondary }]}>
            {t('passenger') || 'Passenger'}:
          </Text>
          <Text style={[styles.value, { color: theme.colors.text }]}>
            {trip.passengerName}
          </Text>
        </View>

        <View style={styles.separator} />

        <View style={styles.locationContainer}>
          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>📍</Text>
            <View style={styles.locationText}>
              <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>
                {t('pickup') || 'Pickup'}
              </Text>
              <Text style={[styles.locationValue, { color: theme.colors.text }]}>
                {trip.pickup}
              </Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <Text style={styles.locationIcon}>🏁</Text>
            <View style={styles.locationText}>
              <Text style={[styles.locationLabel, { color: theme.colors.textSecondary }]}>
                {t('destination') || 'Destination'}
              </Text>
              <Text style={[styles.locationValue, { color: theme.colors.text }]}>
                {trip.destination}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.separator} />

        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('distance') || 'Distance'}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {trip.distance} km
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('estimatedTime') || 'Est. Time'}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.text }]}>
              {trip.estimatedTime} min
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {t('fare') || 'Fare'}
            </Text>
            <Text style={[styles.statValue, { color: theme.colors.primary }]}>
              TZS {trip.fare.toLocaleString()}
            </Text>
          </View>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.button, styles.primaryButton, { backgroundColor: theme.colors.primary }]}
          onPress={handleStartTrip}
        >
          <Text style={styles.buttonText}>🧭 {t('startTrip') || 'Anza Safari / Nenda'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.secondaryButton, { borderColor: theme.colors.primary }]}
          onPress={handleArrived}
        >
          <Text style={[styles.buttonTextSecondary, { color: theme.colors.primary }]}>
            📍 {t('arrivedAtDestination') || 'Arrived at Destination'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.successButton, { backgroundColor: '#10B981' }]}
          onPress={handleCompleteTrip}
        >
          <Text style={styles.buttonText}>✅ {t('completeTrip') || 'Complete Trip'}</Text>
        </TouchableOpacity>
      </View>

      {/* Payment Modal */}
      <Modal
        visible={showPaymentModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>
              💰 {t('collectPayment') || 'Collect Payment'}
            </Text>

            <View style={styles.fareDisplay}>
              <Text style={[styles.fareLabel, { color: theme.colors.textSecondary }]}>
                {t('totalFare') || 'Total Fare'}:
              </Text>
              <Text style={[styles.fareAmount, { color: theme.colors.primary }]}>
                TZS {trip.fare.toLocaleString()}
              </Text>
            </View>

            <Text style={[styles.paymentMethodTitle, { color: theme.colors.text }]}>
              {t('selectPaymentMethod') || 'Select Payment Method'}:
            </Text>

            {/* Cash Payment */}
            <TouchableOpacity
              style={[
                styles.paymentButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.primary },
              ]}
              onPress={() => handlePaymentConfirm('cash')}
            >
              <Text style={styles.paymentIcon}>💵</Text>
              <View style={styles.paymentTextContainer}>
                <Text style={[styles.paymentMethodText, { color: theme.colors.text }]}>
                  {t('cash') || 'Cash'}
                </Text>
                <Text style={[styles.paymentMethodDesc, { color: theme.colors.textSecondary }]}>
                  {t('cashPayment') || 'Traditional cash payment'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* M-Pesa */}
            <TouchableOpacity
              style={[
                styles.paymentButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.primary },
                selectedPaymentMethod === 'mpesa' && styles.paymentButtonSelected,
              ]}
              onPress={() => setSelectedPaymentMethod('mpesa')}
            >
              <Text style={styles.paymentIcon}>📱</Text>
              <View style={styles.paymentTextContainer}>
                <Text style={[styles.paymentMethodText, { color: theme.colors.text }]}>
                  M-Pesa
                </Text>
                <Text style={[styles.paymentMethodDesc, { color: theme.colors.textSecondary }]}>
                  {t('mobileMoneyPayment') || 'Mobile money payment'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Tigo Pesa */}
            <TouchableOpacity
              style={[
                styles.paymentButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.primary },
                selectedPaymentMethod === 'tigo' && styles.paymentButtonSelected,
              ]}
              onPress={() => setSelectedPaymentMethod('tigo')}
            >
              <Text style={styles.paymentIcon}>📱</Text>
              <View style={styles.paymentTextContainer}>
                <Text style={[styles.paymentMethodText, { color: theme.colors.text }]}>
                  Tigo Pesa
                </Text>
                <Text style={[styles.paymentMethodDesc, { color: theme.colors.textSecondary }]}>
                  {t('mobileMoneyPayment') || 'Mobile money payment'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Airtel Money */}
            <TouchableOpacity
              style={[
                styles.paymentButton,
                { backgroundColor: theme.colors.background, borderColor: theme.colors.primary },
                selectedPaymentMethod === 'airtel' && styles.paymentButtonSelected,
              ]}
              onPress={() => setSelectedPaymentMethod('airtel')}
            >
              <Text style={styles.paymentIcon}>📱</Text>
              <View style={styles.paymentTextContainer}>
                <Text style={[styles.paymentMethodText, { color: theme.colors.text }]}>
                  Airtel Money
                </Text>
                <Text style={[styles.paymentMethodDesc, { color: theme.colors.textSecondary }]}>
                  {t('mobileMoneyPayment') || 'Mobile money payment'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Transaction ID Input for Mobile Money */}
            {selectedPaymentMethod && selectedPaymentMethod !== 'cash' && (
              <View style={styles.transactionIdContainer}>
                <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
                  {t('transactionId') || 'Transaction ID'} ({t('optional') || 'Optional'}):
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    { backgroundColor: theme.colors.background, color: theme.colors.text },
                  ]}
                  placeholder={t('enterTransactionId') || 'Enter transaction ID'}
                  placeholderTextColor={theme.colors.textSecondary}
                  value={transactionId}
                  onChangeText={setTransactionId}
                />
                <TouchableOpacity
                  style={[styles.confirmButton, { backgroundColor: theme.colors.primary }]}
                  onPress={() => confirmPayment(selectedPaymentMethod, transactionId)}
                >
                  <Text style={styles.buttonText}>
                    ✅ {t('confirmPayment') || 'Confirm Payment'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: '#EF4444' }]}
              onPress={() => {
                setShowPaymentModal(false);
                setSelectedPaymentMethod('');
                setTransactionId('');
              }}
            >
              <Text style={[styles.cancelButtonText, { color: '#EF4444' }]}>
                {t('cancel') || 'Cancel'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
  separator: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  locationContainer: {
    gap: 12,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  locationIcon: {
    fontSize: 20,
    marginTop: 2,
  },
  locationText: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  locationValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  actionsContainer: {
    gap: 12,
  },
  button: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  secondaryButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  successButton: {
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  completedTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  completedText: {
    fontSize: 18,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '90%',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 24,
    textAlign: 'center',
  },
  fareDisplay: {
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
  },
  fareLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  paymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    marginBottom: 12,
  },
  paymentButtonSelected: {
    borderWidth: 3,
  },
  paymentIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  paymentTextContainer: {
    flex: 1,
  },
  paymentMethodText: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 12,
  },
  transactionIdContainer: {
    marginTop: 16,
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12,
  },
  confirmButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    backgroundColor: 'transparent',
    marginTop: 8,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ActiveTripScreen;

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  Alert, ScrollView,
} from 'react-native';

const API = 'https://simon-daladala-api.vercel.app/api/v1';

export default function HomeScreen() {
  const [pickup, setPickup] = useState('');
  const [destination, setDestination] = useState('');

  const requestRide = () => {
    if (!pickup || !destination) {
      Alert.alert('Enter locations', 'Please enter both pickup and destination');
      return;
    }
    Alert.alert(
      'Ride Requested',
      `Looking for drivers...\n\nFrom: ${pickup}\nTo: ${destination}`,
      [{ text: 'OK' }]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.greeting}>Habari! Where to?</Text>

        <TextInput
          style={styles.input}
          placeholder="Pickup location"
          value={pickup}
          onChangeText={setPickup}
        />
        <TextInput
          style={styles.input}
          placeholder="Destination"
          value={destination}
          onChangeText={setDestination}
        />

        <TouchableOpacity style={styles.button} onPress={requestRide}>
          <Text style={styles.buttonText}>Request Ride</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Options</Text>
        <View style={styles.options}>
          {['Car', 'Bajaji', 'Boda-Boda'].map((type) => (
            <TouchableOpacity key={type} style={styles.option}>
              <Text style={styles.optionEmoji}>
                {type === 'Car' ? '🚗' : type === 'Bajaji' ? '🛺' : '🏍️'}
              </Text>
              <Text style={styles.optionText}>{type}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Recent Trips</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No recent trips</Text>
          <Text style={styles.emptySubtext}>Your trip history will appear here</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  card: { backgroundColor: '#fff', margin: 16, padding: 20, borderRadius: 12, elevation: 2 },
  greeting: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 16 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 8,
    padding: 14, fontSize: 16, marginBottom: 12, backgroundColor: '#fafafa',
  },
  button: {
    backgroundColor: '#1a73e8', borderRadius: 8, padding: 16,
    alignItems: 'center', marginTop: 4,
  },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  section: { marginHorizontal: 16, marginTop: 20 },
  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginBottom: 12 },
  options: { flexDirection: 'row', justifyContent: 'space-between' },
  option: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, flex: 1,
    marginHorizontal: 4, alignItems: 'center', elevation: 1,
  },
  optionEmoji: { fontSize: 28, marginBottom: 6 },
  optionText: { fontSize: 12, color: '#666' },
  emptyState: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 16, color: '#999' },
  emptySubtext: { fontSize: 12, color: '#ccc', marginTop: 4 },
});

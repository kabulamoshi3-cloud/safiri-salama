/**
 * SavedPlacesScreen
 *
 * Findings: No dedicated GET/POST/DELETE /api/v1/passengers/places endpoint exists.
 * passenger_profiles.saved_places JSONB is in the DB schema but there is no REST
 * route for it. As a pragmatic fallback, saved places are persisted in AsyncStorage
 * under '@safiriharaka:saved_places'. A future backend endpoint (PATCH /auth/profile
 * or GET|POST|DELETE /passengers/places) should replace this.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@safiriharaka:saved_places';

interface SavedPlace {
  id: string;
  label: string;
  address: string;
}

const PLACE_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  Home:    'home-outline',
  Work:    'briefcase-outline',
  School:  'school-outline',
  Gym:     'fitness-outline',
};

export default function SavedPlacesScreen() {
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [label, setLabel] = useState('');
  const [address, setAddress] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setPlaces(raw ? JSON.parse(raw) : []);
    } catch {
      setPlaces([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (updated: SavedPlace[]) => {
    setPlaces(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const addPlace = async () => {
    const trimLabel = label.trim();
    const trimAddress = address.trim();
    if (!trimLabel || !trimAddress) {
      Alert.alert('Missing info', 'Please fill in both label and address.');
      return;
    }
    setSaving(true);
    const newPlace: SavedPlace = {
      id: Date.now().toString(),
      label: trimLabel,
      address: trimAddress,
    };
    await persist([...places, newPlace]);
    setLabel('');
    setAddress('');
    setShowForm(false);
    setSaving(false);
  };

  const deletePlace = (id: string) => {
    Alert.alert('Delete place', 'Remove this saved place?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => persist(places.filter((p: SavedPlace) => p.id !== id)),
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007aff" />
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        {places.length === 0 && !showForm && (
          <View style={styles.emptyState}>
            <Ionicons name="location-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No saved places</Text>
            <Text style={styles.emptySubtext}>Add home, work, or any favourite spot</Text>
          </View>
        )}

        {places.map((place: SavedPlace) => (
          <View key={place.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}>
                <Ionicons
                  name={PLACE_ICONS[place.label] ?? 'location-outline'}
                  size={22}
                  color="#007aff"
                />
              </View>
              <View style={styles.placeInfo}>
                <Text style={styles.placeLabel}>{place.label}</Text>
                <Text style={styles.placeAddress} numberOfLines={2}>{place.address}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => deletePlace(place.id)} style={styles.deleteBtn}>
              <Ionicons name="trash-outline" size={20} color="#ff3b30" />
            </TouchableOpacity>
          </View>
        ))}

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Add Saved Place</Text>
            <Text style={styles.inputLabel}>Label</Text>
            <TextInput
              style={styles.input}
              value={label}
              onChangeText={setLabel}
              placeholder="e.g. Home, Work, School"
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Address</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              value={address}
              onChangeText={setAddress}
              placeholder="Full address or landmark"
              multiline
              numberOfLines={2}
            />
            <View style={styles.formActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setShowForm(false);
                  setLabel('');
                  setAddress('');
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={addPlace}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!showForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowForm(true)}>
            <Ionicons name="add-circle-outline" size={24} color="#007aff" />
            <Text style={styles.addButtonText}>Add place</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f8f8' },
  content: { padding: 16, paddingBottom: 32 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8, textAlign: 'center' },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  placeInfo: { flex: 1 },
  placeLabel: { fontSize: 16, fontWeight: '600', color: '#1c1c1e' },
  placeAddress: { fontSize: 13, color: '#999', marginTop: 2 },
  deleteBtn: { padding: 8 },

  formCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  formTitle: { fontSize: 18, fontWeight: '700', color: '#1c1c1e', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#666', marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1c1c1e',
    backgroundColor: '#fafafa',
    marginBottom: 14,
  },
  inputMultiline: { minHeight: 64, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 12, marginTop: 4 },
  cancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#666' },
  saveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: '#007aff',
    minWidth: 80,
    alignItems: 'center',
  },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#007aff',
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addButtonText: { fontSize: 16, fontWeight: '600', color: '#007aff', marginLeft: 8 },
});

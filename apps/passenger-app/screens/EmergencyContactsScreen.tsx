/**
 * EmergencyContactsScreen
 *
 * Findings: passenger_profiles.emergency_contacts JSONB exists in the DB schema
 * but there is no REST endpoint (GET/PATCH /passengers/emergency-contacts) yet.
 * As a pragmatic fallback, contacts are persisted in AsyncStorage under
 * '@dalasmart:emergency_contacts' (up to 3). A future PATCH /auth/profile or
 * dedicated endpoint should sync this with the backend.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, SafeAreaView,
  TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@dalasmart:emergency_contacts';
const MAX_CONTACTS = 3;

interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
}

export default function EmergencyContactsScreen() {
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      setContacts(raw ? JSON.parse(raw) : []);
    } catch {
      setContacts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const persist = async (updated: EmergencyContact[]) => {
    setContacts(updated);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  };

  const openAdd = () => {
    setEditId(null);
    setName('');
    setPhone('');
    setShowForm(true);
  };

  const openEdit = (contact: EmergencyContact) => {
    setEditId(contact.id);
    setName(contact.name);
    setPhone(contact.phone);
    setShowForm(true);
  };

  const saveContact = async () => {
    const trimName = name.trim();
    const trimPhone = phone.trim();
    if (!trimName || !trimPhone) {
      Alert.alert('Missing info', 'Please fill in both name and phone number.');
      return;
    }
    setSaving(true);
    if (editId) {
      await persist(contacts.map((c: EmergencyContact) => (c.id === editId ? { id: editId, name: trimName, phone: trimPhone } : c)));
    } else {
      if (contacts.length >= MAX_CONTACTS) {
        setSaving(false);
        Alert.alert('Limit reached', `You can add up to ${MAX_CONTACTS} emergency contacts.`);
        return;
      }
      const newContact: EmergencyContact = { id: Date.now().toString(), name: trimName, phone: trimPhone };
      await persist([...contacts, newContact]);
    }
    setShowForm(false);
    setEditId(null);
    setName('');
    setPhone('');
    setSaving(false);
  };

  const deleteContact = (id: string) => {
    Alert.alert('Remove contact', 'Remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => persist(contacts.filter((c: EmergencyContact) => c.id !== id)),
      },
    ]);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditId(null);
    setName('');
    setPhone('');
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
        <Text style={styles.infoText}>
          Add up to {MAX_CONTACTS} contacts who will be notified in an emergency.
        </Text>

        {contacts.length === 0 && !showForm && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={64} color="#ccc" />
            <Text style={styles.emptyText}>No emergency contacts</Text>
            <Text style={styles.emptySubtext}>Add a trusted person who can be reached during a trip</Text>
          </View>
        )}

        {contacts.map((contact: EmergencyContact) => (
          <View key={contact.id} style={styles.card}>
            <View style={styles.cardLeft}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{contact.name.charAt(0).toUpperCase()}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactPhone}>{contact.phone}</Text>
              </View>
            </View>
            <View style={styles.cardActions}>
              <TouchableOpacity onPress={() => openEdit(contact)} style={styles.actionBtn}>
                <Ionicons name="create-outline" size={20} color="#007aff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => deleteContact(contact.id)} style={styles.actionBtn}>
                <Ionicons name="trash-outline" size={20} color="#ff3b30" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {showForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editId ? 'Edit Contact' : 'Add Contact'}</Text>
            <Text style={styles.inputLabel}>Name</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Full name"
              autoCapitalize="words"
            />
            <Text style={styles.inputLabel}>Phone number</Text>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={setPhone}
              placeholder="+255 ..."
              keyboardType="phone-pad"
            />
            <View style={styles.formActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={cancelForm}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={saveContact}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{editId ? 'Update' : 'Add'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!showForm && contacts.length < MAX_CONTACTS && (
          <TouchableOpacity style={styles.addButton} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={24} color="#007aff" />
            <Text style={styles.addButtonText}>Add emergency contact</Text>
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

  infoText: {
    fontSize: 14,
    color: '#666',
    backgroundColor: '#fff9e6',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    lineHeight: 20,
  },

  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#999', marginTop: 16 },
  emptySubtext: { fontSize: 14, color: '#ccc', marginTop: 8, textAlign: 'center', paddingHorizontal: 16 },

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
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ff9500',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { fontSize: 18, fontWeight: '700', color: '#fff' },
  contactInfo: { flex: 1 },
  contactName: { fontSize: 16, fontWeight: '600', color: '#1c1c1e' },
  contactPhone: { fontSize: 14, color: '#999', marginTop: 2 },
  cardActions: { flexDirection: 'row' },
  actionBtn: { padding: 8 },

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

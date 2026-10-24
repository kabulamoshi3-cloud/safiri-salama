import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { APIClient } from '../../services/api/client';

interface VehicleProfile {
  vehicleId?: string;
  plate?: string;
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  capacity?: number;
  insurance_expiry?: string;
  inspection_status?: string;
  registration_expiry?: string;
  verification_status?: string;
}

interface DriverProfile {
  vehicle?: VehicleProfile;
  vehicleId?: string;
  plate?: string;
  type?: string;
  make?: string;
  model?: string;
  year?: number;
  color?: string;
  capacity?: number;
  insurance_expiry?: string;
  inspection_status?: string;
  registration_expiry?: string;
  verification_status?: string;
}

const VEHICLE_TYPES = ['Car', 'Bajaji', 'Boda'];

const VehicleInfoScreen: React.FC = () => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const [profile, setProfile] = useState<VehicleProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);

  // Edit form state
  const [plate, setPlate] = useState('');
  const [vehicleType, setVehicleType] = useState('Car');
  const [make, setMake] = useState('');
  const [model, setModel] = useState('');
  const [year, setYear] = useState('');
  const [color, setColor] = useState('');

  const fetchProfile = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await APIClient.get<DriverProfile>('/drivers/profile');
      // Profile may nest vehicle inside a `vehicle` key or at root
      const v: VehicleProfile = data.vehicle ?? data;
      setProfile(v);
      setPlate(v.plate ?? '');
      setVehicleType(v.type ?? 'Car');
      setMake(v.make ?? '');
      setModel(v.model ?? '');
      setYear(v.year != null ? String(v.year) : '');
      setColor(v.color ?? '');
    } catch (err: any) {
      setError(err?.message || 'Failed to load vehicle info');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const payload = {
        plate,
        type: vehicleType,
        make,
        model,
        year: year ? parseInt(year, 10) : undefined,
        color,
      };
      if (profile?.vehicleId) {
        await APIClient.put(`/drivers/vehicle/${profile.vehicleId}`, payload);
      } else {
        await APIClient.post('/drivers/vehicle', payload);
      }
      setEditMode(false);
      await fetchProfile();
      Alert.alert('Success', 'Vehicle information updated.');
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to save vehicle info.');
    } finally {
      setIsSaving(false);
    }
  };

  const daysUntil = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const ms = new Date(dateStr).getTime() - Date.now();
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getVerificationColor = (status?: string) => {
    switch (status) {
      case 'approved': return theme.colors.success;
      case 'requires_update': return theme.colors.error;
      default: return theme.colors.warning;
    }
  };

  const getVerificationLabel = (status?: string) => {
    switch (status) {
      case 'approved': return 'Approved';
      case 'requires_update': return 'Requires Update';
      default: return 'Pending';
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <Icon name="alert-circle-outline" size={64} color={theme.colors.error} />
        <Text style={[styles.errorText, { color: theme.colors.error }]}>{error}</Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
          onPress={fetchProfile}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const insuranceDays = daysUntil(profile?.insurance_expiry);
  const regDays = daysUntil(profile?.registration_expiry);
  const verificationColor = getVerificationColor(profile?.verification_status);

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>

      {/* Verification Status */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Verification Status</Text>
          <View style={[styles.badge, { backgroundColor: verificationColor + '20' }]}>
            <Text style={[styles.badgeText, { color: verificationColor }]}>
              {getVerificationLabel(profile?.verification_status)}
            </Text>
          </View>
        </View>
      </View>

      {/* Vehicle Info */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Vehicle Information</Text>

        {([
          ['Plate Number', profile?.plate],
          ['Type', profile?.type],
          ['Make', profile?.make],
          ['Model', profile?.model],
          ['Year', profile?.year != null ? String(profile.year) : undefined],
          ['Color', profile?.color],
          ['Capacity', profile?.capacity != null ? `${profile.capacity} passengers` : undefined],
        ] as [string, string | undefined][]).map(([label, value]) => (
          <View key={label}>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.colors.textSecondary }]}>{label}</Text>
              <Text style={[styles.infoValue, { color: theme.colors.text }]}>{value || '—'}</Text>
            </View>
            <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />
          </View>
        ))}
      </View>

      {/* Document Status */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Document Status</Text>

        {/* Insurance */}
        <View style={styles.docRow}>
          <Icon name="shield-check" size={20} color={
            insuranceDays != null && insuranceDays < 30 ? theme.colors.error : theme.colors.success
          } />
          <View style={styles.docText}>
            <Text style={[styles.docLabel, { color: theme.colors.text }]}>Insurance</Text>
            <Text style={[styles.docDate, {
              color: insuranceDays != null && insuranceDays < 30 ? theme.colors.error : theme.colors.textSecondary,
            }]}>
              Expires: {formatDate(profile?.insurance_expiry)}
              {insuranceDays != null && insuranceDays < 30
                ? `  ⚠ ${insuranceDays} days left`
                : ''}
            </Text>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

        {/* Inspection */}
        <View style={styles.docRow}>
          <Icon name="clipboard-check" size={20} color={
            profile?.inspection_status === 'passed' ? theme.colors.success : theme.colors.warning
          } />
          <View style={styles.docText}>
            <Text style={[styles.docLabel, { color: theme.colors.text }]}>Inspection</Text>
            <Text style={[styles.docDate, { color: theme.colors.textSecondary }]}>
              Status: {profile?.inspection_status
                ? profile.inspection_status.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
                : '—'}
            </Text>
          </View>
        </View>

        <View style={[styles.separator, { backgroundColor: theme.colors.border }]} />

        {/* Registration */}
        <View style={styles.docRow}>
          <Icon name="file-document" size={20} color={
            regDays != null && regDays < 30 ? theme.colors.error : theme.colors.success
          } />
          <View style={styles.docText}>
            <Text style={[styles.docLabel, { color: theme.colors.text }]}>Registration</Text>
            <Text style={[styles.docDate, {
              color: regDays != null && regDays < 30 ? theme.colors.error : theme.colors.textSecondary,
            }]}>
              Expires: {formatDate(profile?.registration_expiry)}
              {regDays != null && regDays < 30
                ? `  ⚠ ${regDays} days left`
                : ''}
            </Text>
          </View>
        </View>
      </View>

      {/* Edit Section */}
      <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.row}>
          <Text style={[styles.cardTitle, { color: theme.colors.text }]}>Edit Vehicle Details</Text>
          {!editMode && (
            <TouchableOpacity onPress={() => setEditMode(true)}>
              <Icon name="pencil" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        {editMode ? (
          <>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Plate Number</Text>
              <TextInput
                style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                value={plate}
                onChangeText={setPlate}
                placeholder="e.g. T 123 ABC"
                placeholderTextColor={theme.colors.textSecondary}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>Vehicle Type</Text>
              <View style={styles.typeRow}>
                {VEHICLE_TYPES.map((vt) => (
                  <TouchableOpacity
                    key={vt}
                    style={[
                      styles.typeChip,
                      { borderColor: vehicleType === vt ? theme.colors.primary : theme.colors.border },
                      vehicleType === vt && { backgroundColor: theme.colors.primary + '20' },
                    ]}
                    onPress={() => setVehicleType(vt)}
                  >
                    <Text style={[
                      styles.typeChipText,
                      { color: vehicleType === vt ? theme.colors.primary : theme.colors.text },
                    ]}>
                      {vt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {[
              ['Make', make, setMake, 'e.g. Toyota'],
              ['Model', model, setModel, 'e.g. Corolla'],
              ['Year', year, setYear, 'e.g. 2018'],
              ['Color', color, setColor, 'e.g. White'],
            ].map(([label, value, setter, placeholder]) => (
              <View key={label as string} style={styles.field}>
                <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>{label as string}</Text>
                <TextInput
                  style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.background }]}
                  value={value as string}
                  onChangeText={setter as (v: string) => void}
                  placeholder={placeholder as string}
                  placeholderTextColor={theme.colors.textSecondary}
                  keyboardType={label === 'Year' ? 'number-pad' : 'default'}
                />
              </View>
            ))}

            <View style={styles.editActions}>
              <TouchableOpacity
                style={[styles.cancelEditButton, { borderColor: theme.colors.border }]}
                onPress={() => {
                  setEditMode(false);
                  // Reset fields to profile values
                  if (profile) {
                    setPlate(profile.plate ?? '');
                    setVehicleType(profile.type ?? 'Car');
                    setMake(profile.make ?? '');
                    setModel(profile.model ?? '');
                    setYear(profile.year != null ? String(profile.year) : '');
                    setColor(profile.color ?? '');
                  }
                }}
              >
                <Text style={[styles.cancelEditText, { color: theme.colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleSave}
                disabled={isSaving}
              >
                {isSaving
                  ? <ActivityIndicator size="small" color="#FFF" />
                  : <Text style={styles.saveButtonText}>Save Changes</Text>
                }
              </TouchableOpacity>
            </View>
          </>
        ) : (
          <Text style={[styles.editHint, { color: theme.colors.textSecondary }]}>
            Tap the edit icon to update your vehicle details.
          </Text>
        )}
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
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
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '600' },
  separator: { height: 1 },
  docRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 10 },
  docText: { flex: 1 },
  docLabel: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  docDate: { fontSize: 12 },
  field: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  typeChipText: { fontSize: 13, fontWeight: '600' },
  editActions: { flexDirection: 'row', gap: 12, marginTop: 4 },
  cancelEditButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelEditText: { fontSize: 14, fontWeight: '600' },
  saveButton: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  editHint: { fontSize: 13 },
  errorText: { fontSize: 16, marginTop: 12, textAlign: 'center', paddingHorizontal: 24 },
  retryButton: { marginTop: 16, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  retryButtonText: { color: '#FFF', fontSize: 15, fontWeight: '600' },
  bottomSpacer: { height: 32 },
});

export default VehicleInfoScreen;

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import * as ImagePicker from 'expo-image-picker';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { APIClient } from '../../services/api/client';
import { ProfileStackParamList } from '../../navigation/MainNavigator';

type DocumentUploadNavProp = StackNavigationProp<ProfileStackParamList, 'DocumentUpload'>;

type DocumentType =
  | 'drivers_license'
  | 'vehicle_registration'
  | 'vehicle_insurance'
  | 'national_id'
  | 'selfie';

interface DocStatus {
  documentType: DocumentType;
  status: 'not_uploaded' | 'pending' | 'approved' | 'rejected';
  image_url?: string;
  rejection_reason?: string;
}

interface CloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  uploadUrl: string;
}

const DOC_TYPES: { type: DocumentType; label: string; icon: string }[] = [
  { type: 'drivers_license', label: "Driver's License", icon: 'card-account-details' },
  { type: 'vehicle_registration', label: 'Vehicle Registration', icon: 'file-document' },
  { type: 'vehicle_insurance', label: 'Vehicle Insurance', icon: 'shield-check' },
  { type: 'national_id', label: 'National ID', icon: 'badge-account' },
  { type: 'selfie', label: 'Selfie', icon: 'camera-account' },
];

function statusColor(status: DocStatus['status'], primary: string) {
  switch (status) {
    case 'approved': return '#34c759';
    case 'rejected': return '#ff3b30';
    case 'pending': return '#ff9500';
    default: return primary;
  }
}

function statusLabel(status: DocStatus['status']) {
  switch (status) {
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'pending': return 'Under Review';
    default: return 'Not Uploaded';
  }
}

export default function DocumentUploadScreen() {
  const navigation = useNavigation<DocumentUploadNavProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [docStatuses, setDocStatuses] = useState<Partial<Record<DocumentType, DocStatus>>>({});
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [cloudConfig, setCloudConfig] = useState<CloudinaryConfig | null>(null);
  const [loadingInit, setLoadingInit] = useState(true);

  const loadData = useCallback(async () => {
    setLoadingInit(true);
    try {
      const [config, docs] = await Promise.all([
        APIClient.get<CloudinaryConfig>('/upload/config'),
        APIClient.get<{ documents: DocStatus[] }>('/upload/documents'),
      ]);
      setCloudConfig(config);
      const map: Partial<Record<DocumentType, DocStatus>> = {};
      for (const doc of docs.documents) {
        map[doc.documentType] = doc;
      }
      setDocStatuses(map);
    } catch {
      Alert.alert(t('common.error'), 'Failed to load documents');
    } finally {
      setLoadingInit(false);
    }
  }, [t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleUpload(docType: DocumentType) {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Permission to access photo library is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;
    if (!cloudConfig) {
      Alert.alert(t('common.error'), 'Upload configuration not available');
      return;
    }

    setUploadingType(docType);
    try {
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: 'image/jpeg',
        name: `${docType}.jpg`,
      } as unknown as Blob);
      formData.append('upload_preset', cloudConfig.uploadPreset);

      const uploadRes = await fetch(cloudConfig.uploadUrl, {
        method: 'POST',
        body: formData,
      });
      if (!uploadRes.ok) throw new Error('Cloudinary upload failed');
      const uploadData = await uploadRes.json();
      const imageUrl: string = uploadData.secure_url;

      await APIClient.post('/upload/document', { documentType: docType, imageUrl });

      setDocStatuses((prev) => ({
        ...prev,
        [docType]: { documentType: docType, status: 'pending', image_url: imageUrl },
      }));
      Alert.alert('Success', 'Document uploaded successfully');
    } catch {
      Alert.alert(t('common.error'), 'Upload failed. Please try again.');
    } finally {
      setUploadingType(null);
    }
  }

  if (loadingInit) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.text }]}>
          {t('required_documents') || 'Required Documents'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          Upload all required documents to get verified
        </Text>
      </View>

      <View style={styles.list}>
        {DOC_TYPES.map(({ type, label, icon }) => {
          const doc = docStatuses[type];
          const status = doc?.status ?? 'not_uploaded';
          const color = statusColor(status, theme.colors.primary);
          const isUploading = uploadingType === type;

          return (
            <View
              key={type}
              style={[
                styles.card,
                {
                  backgroundColor: theme.colors.surface,
                  borderLeftColor: color,
                },
              ]}
            >
              <View style={[styles.cardIconWrap, { backgroundColor: color + '20' }]}>
                <Icon name={icon} size={28} color={color} />
              </View>

              <View style={styles.cardContent}>
                <Text style={[styles.cardLabel, { color: theme.colors.text }]}>{label}</Text>
                <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
                  <Text style={[styles.statusText, { color }]}>
                    {statusLabel(status)}
                  </Text>
                </View>
                {doc?.rejection_reason && (
                  <Text style={[styles.rejectionReason, { color: '#ff3b30' }]}>
                    {doc.rejection_reason}
                  </Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.uploadBtn, { backgroundColor: color }]}
                onPress={() => handleUpload(type)}
                disabled={isUploading}
                accessibilityLabel={`Upload ${label}`}
              >
                {isUploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Icon
                    name={status === 'not_uploaded' ? 'upload' : 'refresh'}
                    size={18}
                    color="#fff"
                  />
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>

      <TouchableOpacity
        style={[styles.statusBtn, { borderColor: theme.colors.primary }]}
        onPress={() => navigation.navigate('VerificationStatus')}
        accessibilityLabel="View verification status"
      >
        <Icon name="shield-check" size={18} color={theme.colors.primary} />
        <Text style={[styles.statusBtnText, { color: theme.colors.primary }]}>
          View Verification Status
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { padding: 24, paddingBottom: 8 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 14 },
  list: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardContent: { flex: 1 },
  cardLabel: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  statusBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  rejectionReason: { fontSize: 11, marginTop: 4 },
  uploadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 16,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  statusBtnText: { fontSize: 15, fontWeight: '600' },
});

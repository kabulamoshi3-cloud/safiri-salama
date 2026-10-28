import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { APIClient } from '../../services/api/client';
import { ProfileStackParamList } from '../../navigation/MainNavigator';

type VerificationStatusNavProp = StackNavigationProp<ProfileStackParamList, 'VerificationStatus'>;

type DocStatus = 'not_uploaded' | 'pending' | 'approved' | 'rejected';

interface DocumentRecord {
  id: string;
  documentType: string;
  status: DocStatus;
  image_url?: string;
  rejection_reason?: string;
  created_at?: string;
  reviewed_at?: string;
}

const DOC_LABEL: Record<string, string> = {
  drivers_license: "Driver's License",
  vehicle_registration: 'Vehicle Registration',
  vehicle_insurance: 'Vehicle Insurance',
  national_id: 'National ID',
  selfie: 'Selfie',
};

function statusIcon(status: DocStatus) {
  switch (status) {
    case 'approved': return 'check-circle';
    case 'rejected': return 'close-circle';
    case 'pending': return 'clock-outline';
    default: return 'circle-outline';
  }
}

function statusColor(status: DocStatus, primaryColor: string) {
  switch (status) {
    case 'approved': return '#34c759';
    case 'rejected': return '#ff3b30';
    case 'pending': return '#ff9500';
    default: return primaryColor;
  }
}

const TIMELINE_STEPS = ['Uploaded', 'Under Review', 'Decision'];

function timelineStepIndex(status: DocStatus): number {
  switch (status) {
    case 'not_uploaded': return -1;
    case 'pending': return 1;
    case 'approved':
    case 'rejected': return 2;
    default: return -1;
  }
}

export default function VerificationStatusScreen() {
  const navigation = useNavigation<VerificationStatusNavProp>();
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await APIClient.get<{ documents: DocumentRecord[] }>('/upload/documents');
      setDocuments(res.documents ?? []);
    } catch {
      Alert.alert(t('common.error'), 'Failed to load verification status');
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const overallApproved = documents.length > 0 && documents.every((d) => d.status === 'approved');
  const hasRejected = documents.some((d) => d.status === 'rejected');

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Overall status banner */}
      <View
        style={[
          styles.overallBanner,
          {
            backgroundColor: overallApproved
              ? '#34c75920'
              : hasRejected
              ? '#ff3b3020'
              : theme.colors.primary + '20',
          },
        ]}
      >
        <Icon
          name={
            overallApproved
              ? 'shield-check'
              : hasRejected
              ? 'shield-alert'
              : 'shield-sync'
          }
          size={36}
          color={
            overallApproved ? '#34c759' : hasRejected ? '#ff3b30' : theme.colors.primary
          }
        />
        <View style={{ marginLeft: 16, flex: 1 }}>
          <Text style={[styles.overallTitle, { color: theme.colors.text }]}>
            {overallApproved
              ? 'Fully Verified'
              : hasRejected
              ? 'Action Required'
              : 'Verification In Progress'}
          </Text>
          <Text style={[styles.overallSubtitle, { color: theme.colors.textSecondary }]}>
            {overallApproved
              ? 'All documents have been approved'
              : hasRejected
              ? 'Some documents were rejected — please re-upload'
              : 'Your documents are being reviewed'}
          </Text>
        </View>
      </View>

      {documents.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Icon name="file-document-outline" size={48} color={theme.colors.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            No documents uploaded yet
          </Text>
          <TouchableOpacity
            style={[styles.uploadNowBtn, { backgroundColor: theme.colors.primary }]}
            onPress={() => navigation.navigate('DocumentUpload')}
            accessibilityLabel="Upload documents now"
          >
            <Text style={styles.uploadNowBtnText}>Upload Documents</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.list}>
          {documents.map((doc) => {
            const color = statusColor(doc.status, theme.colors.primary);
            const stepIdx = timelineStepIndex(doc.status);

            return (
              <View
                key={doc.id}
                style={[styles.card, { backgroundColor: theme.colors.surface }]}
              >
                {/* Doc header */}
                <View style={styles.cardHeader}>
                  <Text style={[styles.docLabel, { color: theme.colors.text }]}>
                    {DOC_LABEL[doc.documentType] ?? doc.documentType}
                  </Text>
                  <View style={[styles.statusPill, { backgroundColor: color + '20' }]}>
                    <Icon name={statusIcon(doc.status)} size={12} color={color} />
                    <Text style={[styles.statusText, { color }]}>
                      {doc.status === 'not_uploaded'
                        ? 'Not Uploaded'
                        : doc.status === 'pending'
                        ? 'Under Review'
                        : doc.status === 'approved'
                        ? 'Approved'
                        : 'Rejected'}
                    </Text>
                  </View>
                </View>

                {/* Timeline */}
                <View style={styles.timeline}>
                  {TIMELINE_STEPS.map((step, i) => {
                    const done = stepIdx >= i;
                    const stepColor = done ? color : theme.colors.border;
                    return (
                      <View key={step} style={styles.timelineStep}>
                        <View style={[styles.timelineDot, { backgroundColor: stepColor }]} />
                        {i < TIMELINE_STEPS.length - 1 && (
                          <View
                            style={[
                              styles.timelineLine,
                              { backgroundColor: stepIdx > i ? color : theme.colors.border },
                            ]}
                          />
                        )}
                        <Text
                          style={[
                            styles.timelineLabel,
                            { color: done ? theme.colors.text : theme.colors.textSecondary },
                          ]}
                        >
                          {step}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {/* Rejection reason + re-upload */}
                {doc.status === 'rejected' && (
                  <View
                    style={[styles.rejectionBox, { backgroundColor: '#ff3b3010', borderColor: '#ff3b30' }]}
                  >
                    <Text style={[styles.rejectionTitle, { color: '#ff3b30' }]}>
                      Reason for rejection:
                    </Text>
                    <Text style={[styles.rejectionReason, { color: theme.colors.text }]}>
                      {doc.rejection_reason ?? 'No reason provided'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.reUploadBtn, { backgroundColor: '#ff3b30' }]}
                      onPress={() => navigation.navigate('DocumentUpload')}
                      accessibilityLabel={`Re-upload ${DOC_LABEL[doc.documentType] ?? doc.documentType}`}
                    >
                      <Icon name="upload" size={14} color="#fff" />
                      <Text style={styles.reUploadText}>Re-upload</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  overallBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    borderRadius: 12,
    padding: 16,
  },
  overallTitle: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  overallSubtitle: { fontSize: 13 },
  emptyWrap: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyText: { fontSize: 15, marginTop: 12, marginBottom: 20 },
  uploadNowBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  uploadNowBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  list: { paddingHorizontal: 16 },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  docLabel: { fontSize: 15, fontWeight: '600' },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '600' },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  timelineStep: { alignItems: 'center', flex: 1, position: 'relative' },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginBottom: 4 },
  timelineLine: {
    position: 'absolute',
    top: 5,
    left: '50%',
    right: '-50%',
    height: 2,
  },
  timelineLabel: { fontSize: 10, textAlign: 'center' },
  rejectionBox: {
    marginTop: 12,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  rejectionTitle: { fontSize: 12, fontWeight: '700', marginBottom: 4 },
  rejectionReason: { fontSize: 13, marginBottom: 10 },
  reUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reUploadText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});

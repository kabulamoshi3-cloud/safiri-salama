import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './Modal';
import StatusBadge from './StatusBadge';
import {
  Driver,
  DriverDocument,
  getDriverDocuments,
  reviewDocument,
  approveDriver,
  rejectDriver,
  banDriver,
} from '../services/api';

interface Props {
  driver: Driver;
  onClose: () => void;
  onActionDone: () => void;
}

type Tab = 'details' | 'documents';

function btnStyle(variant: 'blue' | 'green' | 'red' | 'dark' | 'orange') {
  const map: Record<string, { bg: string; color: string }> = {
    blue:   { bg: 'var(--color-blue-bg)',   color: 'var(--color-blue)' },
    green:  { bg: 'var(--color-green-bg)',  color: 'var(--color-green)' },
    red:    { bg: 'var(--color-red-bg)',    color: 'var(--color-red)' },
    dark:   { bg: 'var(--color-gray-bg)',   color: 'var(--color-text-primary)' },
    orange: { bg: 'var(--color-orange-bg)', color: 'var(--color-orange)' },
  };
  const { bg, color } = map[variant];
  return {
    padding: '6px 14px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: bg,
    color,
  } as React.CSSProperties;
}

export default function DriverVerificationModal({ driver, onClose, onActionDone }: Props) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('details');
  const [documents, setDocuments] = useState<DriverDocument[]>([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [docActionLoading, setDocActionLoading] = useState<string | null>(null);

  useEffect(() => {
    if (activeTab === 'documents') {
      setDocsLoading(true);
      setDocsError('');
      getDriverDocuments(driver.id)
        .then((res) => setDocuments(res.documents))
        .catch(() => setDocsError(t('error')))
        .finally(() => setDocsLoading(false));
    }
  }, [activeTab, driver.id, t]);

  async function handleDriverAction(action: 'approve' | 'reject' | 'ban') {
    setActionLoading(true);
    try {
      if (action === 'approve') await approveDriver(driver.id);
      else if (action === 'reject') await rejectDriver(driver.id);
      else await banDriver(driver.id);
      onActionDone();
      onClose();
    } catch {
      alert(t('error'));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDocReview(docId: string, status: 'approved' | 'rejected') {
    const reason =
      status === 'rejected'
        ? window.prompt('Enter rejection reason (optional):') ?? ''
        : undefined;
    setDocActionLoading(docId);
    try {
      await reviewDocument(docId, status, reason || undefined);
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, status, rejection_reason: reason } : d))
      );
    } catch {
      alert(t('error'));
    } finally {
      setDocActionLoading(null);
    }
  }

  const detailRows: [string, string][] = [
    [t('detail_name'), driver.name],
    [t('detail_phone'), driver.phone],
    [t('detail_email'), driver.email ?? '—'],
    [t('detail_license_num'), driver.license_number],
    [t('detail_license_expiry'), driver.license_expiry ? new Date(driver.license_expiry).toLocaleDateString() : '—'],
    [t('detail_verification'), driver.verification_status],
    [t('detail_account_status'), driver.user_status],
    [t('detail_driver_status'), driver.status],
    [t('detail_vehicle_plate'), driver.plate_number ?? '—'],
    [t('detail_vehicle'), `${driver.make ?? ''} ${driver.model ?? ''}`.trim() || '—'],
    [t('detail_vehicle_type'), driver.vehicle_type ?? '—'],
    [t('detail_total_trips'), String(driver.total_trips)],
    [t('detail_rating'), driver.rating ? `★ ${Number(driver.rating).toFixed(1)}` : '—'],
    [t('detail_joined'), driver.created_at ? new Date(driver.created_at).toLocaleDateString() : '—'],
  ];

  return (
    <Modal title={t('driver_details')} onClose={onClose}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', borderBottom: '1px solid var(--color-border)', paddingBottom: '12px' }}>
        {(['details', 'documents'] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '6px 16px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === tab ? 'var(--color-accent)' : 'var(--color-gray-bg)',
              color: activeTab === tab ? '#fff' : 'var(--color-text-primary)',
              fontWeight: activeTab === tab ? 600 : 400,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {tab === 'details' ? 'Details' : 'Documents'}
          </button>
        ))}
      </div>

      {/* Details Tab */}
      {activeTab === 'details' && (
        <div>
          <table style={{ width: '100%', fontSize: '13px', marginBottom: '20px' }}>
            <tbody>
              {detailRows.map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid var(--color-border)' }}>
                  <td style={{ padding: '8px 0', color: 'var(--color-text-secondary)', width: '40%' }}>
                    {label}
                  </td>
                  <td style={{ padding: '8px 0', fontWeight: 500 }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {driver.verification_status === 'pending' && (
              <>
                <button
                  disabled={actionLoading}
                  onClick={() => handleDriverAction('approve')}
                  style={btnStyle('green')}
                >
                  {t('approve')}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => handleDriverAction('reject')}
                  style={btnStyle('red')}
                >
                  {t('reject')}
                </button>
              </>
            )}
            {driver.user_status !== 'banned' && (
              <button
                disabled={actionLoading}
                onClick={() => handleDriverAction('ban')}
                style={btnStyle('dark')}
              >
                {t('ban')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div>
          {docsLoading ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              {t('loading')}
            </div>
          ) : docsError ? (
            <div style={{ color: 'var(--color-red)', padding: '16px' }}>{docsError}</div>
          ) : documents.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
              No documents uploaded yet
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  style={{
                    border: '1px solid var(--color-border)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                    background: 'var(--color-card-bg)',
                  }}
                >
                  {doc.image_url ? (
                    <img
                      src={doc.image_url}
                      alt={doc.documentType}
                      style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                    />
                  ) : (
                    <div
                      style={{
                        width: '100%',
                        height: '140px',
                        background: 'var(--color-gray-bg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--color-text-muted)',
                        fontSize: '12px',
                      }}
                    >
                      No image
                    </div>
                  )}
                  <div style={{ padding: '10px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '4px', textTransform: 'capitalize' }}>
                      {doc.documentType.replace(/_/g, ' ')}
                    </div>
                    <div style={{ marginBottom: '8px' }}>
                      <StatusBadge status={doc.status} label={doc.status} />
                    </div>
                    {doc.rejection_reason && (
                      <div style={{ fontSize: '11px', color: 'var(--color-red)', marginBottom: '8px' }}>
                        {doc.rejection_reason}
                      </div>
                    )}
                    {doc.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          disabled={docActionLoading === doc.id}
                          onClick={() => handleDocReview(doc.id, 'approved')}
                          style={{ ...btnStyle('green'), flex: 1 }}
                        >
                          Approve
                        </button>
                        <button
                          disabled={docActionLoading === doc.id}
                          onClick={() => handleDocReview(doc.id, 'rejected')}
                          style={{ ...btnStyle('red'), flex: 1 }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  getDrivers,
  approveDriver,
  rejectDriver,
  banDriver,
  Driver,
} from '../services/api';
import Table, { Column } from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import DriverVerificationModal from '../components/DriverVerificationModal';

const FILTER_KEYS = ['', 'pending', 'approved', 'rejected'];

export default function Drivers() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const approvalFilter = searchParams.get('approval_status') ?? '';

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Driver | null>(null);
  const [inlineActionLoading, setInlineActionLoading] = useState(false);

  function load() {
    setLoading(true);
    setError('');
    getDrivers(approvalFilter || undefined)
      .then((d) => setDrivers(d.drivers))
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [approvalFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInlineAction(action: 'approve' | 'reject' | 'ban', driver: Driver) {
    setInlineActionLoading(true);
    try {
      if (action === 'approve') await approveDriver(driver.id);
      else if (action === 'reject') await rejectDriver(driver.id);
      else await banDriver(driver.id);
      load();
    } catch {
      alert(t('error'));
    } finally {
      setInlineActionLoading(false);
    }
  }

  const columns: Column<Driver>[] = [
    { key: 'name', label: t('th_name') },
    { key: 'phone', label: t('th_phone') },
    { key: 'plate_number', label: t('th_vehicle_plate'), render: (r) => r.plate_number ?? '—' },
    {
      key: 'user_status',
      label: t('th_status'),
      render: (r) => <StatusBadge status={r.user_status} label={r.user_status} />,
    },
    {
      key: 'verification_status',
      label: t('th_approval_status'),
      render: (r) => <StatusBadge status={r.verification_status} label={r.verification_status} />,
    },
    { key: 'total_trips', label: t('th_total_trips') },
    {
      key: 'rating',
      label: t('th_rating'),
      render: (r) => r.rating ? `★ ${Number(r.rating).toFixed(1)}` : '—',
    },
    {
      key: 'actions',
      label: t('th_actions'),
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setSelected(r)}
            style={btnStyle('blue')}
          >
            {t('view')}
          </button>
          {r.verification_status === 'pending' && (
            <>
              <button
                disabled={inlineActionLoading}
                onClick={() => handleInlineAction('approve', r)}
                style={btnStyle('green')}
              >
                {t('approve')}
              </button>
              <button
                disabled={inlineActionLoading}
                onClick={() => handleInlineAction('reject', r)}
                style={btnStyle('red')}
              >
                {t('reject')}
              </button>
            </>
          )}
          {r.user_status !== 'banned' && (
            <button
              disabled={inlineActionLoading}
              onClick={() => handleInlineAction('ban', r)}
              style={btnStyle('dark')}
            >
              {t('ban')}
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '20px', fontSize: '20px' }}>{t('drivers_title')}</h1>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {FILTER_KEYS.map((k) => (
          <button
            key={k}
            onClick={() => setSearchParams(k ? { approval_status: k } : {})}
            style={{
              padding: '6px 16px',
              border: '1px solid var(--color-border)',
              borderRadius: '999px',
              background: approvalFilter === k ? 'var(--color-accent)' : 'var(--color-card-bg)',
              color: approvalFilter === k ? '#fff' : 'var(--color-text-primary)',
              fontWeight: approvalFilter === k ? 600 : 400,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {k ? t(`filter_${k}`) : t('filter_all')}
          </button>
        ))}
      </div>

      <div
        style={{
          background: 'var(--color-card-bg)',
          borderRadius: '10px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
            {t('loading')}
          </div>
        ) : error ? (
          <div style={{ padding: '24px', color: 'var(--color-red)' }}>{error}</div>
        ) : (
          <Table<Driver>
            columns={columns}
            rows={drivers}
            keyField="id"
          />
        )}
      </div>

      {/* Driver detail + documents modal */}
      {selected && (
        <DriverVerificationModal
          driver={selected}
          onClose={() => setSelected(null)}
          onActionDone={load}
        />
      )}
    </div>
  );
}

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
    padding: '4px 10px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: bg,
    color,
  } as React.CSSProperties;
}

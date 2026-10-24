import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getPassengers, banPassenger, Passenger } from '../../services/api';
import Table, { Column } from '../../components/Table';
import StatusBadge from '../../components/StatusBadge';
import Modal from '../../components/Modal';

export default function Users() {
  const { t } = useTranslation();
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Passenger | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setLoading(true);
    setError('');
    getPassengers()
      .then((d) => setPassengers(d.passengers))
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleBan(p: Passenger) {
    setActionLoading(true);
    try {
      await banPassenger(p.id);
      setSelected(null);
      load();
    } catch {
      alert(t('error'));
    } finally {
      setActionLoading(false);
    }
  }

  const columns: Column<Passenger>[] = [
    { key: 'name', label: t('th_name') },
    { key: 'phone', label: t('th_phone') },
    {
      key: 'created_at',
      label: t('th_join_date'),
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
    { key: 'total_trips', label: t('th_total_trips') },
    { key: 'active_trips', label: t('th_active_trips') },
    {
      key: 'user_status',
      label: t('th_status'),
      render: (r) => <StatusBadge status={r.user_status} label={r.user_status} />,
    },
    {
      key: 'actions',
      label: t('th_actions'),
      render: (r) => (
        <div style={{ display: 'flex', gap: '6px' }}>
          <button onClick={() => setSelected(r)} style={btnStyle('blue')}>
            {t('view')}
          </button>
          {r.user_status !== 'banned' ? (
            <button onClick={() => handleBan(r)} style={btnStyle('red')}>
              {t('ban')}
            </button>
          ) : (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--color-text-muted)',
                padding: '4px 8px',
              }}
            >
              {t('status_banned')}
            </span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '20px', fontSize: '20px' }}>{t('passengers_title')}</h1>

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
          <Table<Passenger>
            columns={columns}
            rows={passengers}
            keyField="id"
          />
        )}
      </div>

      {selected && (
        <Modal title={t('passenger_details')} onClose={() => setSelected(null)}>
          <PassengerDetail
            passenger={selected}
            onBan={() => handleBan(selected)}
            loading={actionLoading}
            t={t}
          />
        </Modal>
      )}
    </div>
  );
}

function btnStyle(variant: 'blue' | 'red') {
  const map = {
    blue: { bg: 'var(--color-blue-bg)', color: 'var(--color-blue)' },
    red:  { bg: 'var(--color-red-bg)',  color: 'var(--color-red)' },
  };
  return {
    padding: '4px 10px',
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    background: map[variant].bg,
    color: map[variant].color,
  } as React.CSSProperties;
}

function PassengerDetail({
  passenger,
  onBan,
  loading,
  t,
}: {
  passenger: Passenger;
  onBan: () => void;
  loading: boolean;
  t: (k: string) => string;
}) {
  const rows = [
    [t('detail_name'), passenger.name],
    [t('detail_phone'), passenger.phone],
    [t('detail_email'), passenger.email ?? '—'],
    [t('detail_status'), passenger.user_status],
    [t('detail_total_trips'), passenger.total_trips],
    [t('detail_active_trips'), passenger.active_trips],
    [t('detail_rating'), passenger.rating ? `★ ${Number(passenger.rating).toFixed(1)}` : '—'],
    [t('detail_joined'), passenger.created_at ? new Date(passenger.created_at).toLocaleDateString() : '—'],
  ];

  return (
    <div>
      <table style={{ width: '100%', fontSize: '13px', marginBottom: '20px' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '8px 0', color: 'var(--color-text-secondary)', width: '40%' }}>
                {label}
              </td>
              <td style={{ padding: '8px 0', fontWeight: 500 }}>{value}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {passenger.user_status !== 'banned' && (
        <button
          disabled={loading}
          onClick={onBan}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            background: 'var(--color-red-bg)',
            color: 'var(--color-red)',
          }}
        >
          {t('ban')}
        </button>
      )}
    </div>
  );
}

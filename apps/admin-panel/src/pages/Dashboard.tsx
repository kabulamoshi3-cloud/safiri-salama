import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getStats, getTrips, AdminStats, Trip } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Table, { Column } from '../components/Table';

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--color-card-bg)',
        borderRadius: '10px',
        padding: '20px 24px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        borderLeft: accent ? '4px solid var(--color-accent)' : '4px solid var(--color-border)',
        flex: '1 1 180px',
        minWidth: '160px',
      }}
    >
      <div
        style={{
          fontSize: '12px',
          color: 'var(--color-text-secondary)',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          marginBottom: '8px',
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: '28px',
          fontWeight: 700,
          color: accent ? 'var(--color-accent)' : 'var(--color-text-primary)',
        }}
      >
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { t } = useTranslation();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getStats(), getTrips({ limit: 10 })])
      .then(([s, tripsData]) => {
        setStats(s);
        setTrips(tripsData.trips);
      })
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }, [t]);

  const columns: Column<Trip>[] = [
    {
      key: 'id',
      label: t('th_trip_id'),
      render: (row) => (
        <span style={{ fontFamily: 'monospace', fontSize: '12px' }}>
          {row.id.slice(0, 8)}
        </span>
      ),
    },
    { key: 'passenger_name', label: t('th_passenger') },
    { key: 'driver_name',    label: t('th_driver') },
    { key: 'pickup_address', label: t('th_pickup') },
    {
      key: 'status',
      label: t('th_status'),
      render: (row) => <StatusBadge status={row.status} label={row.status} />,
    },
    {
      key: 'fare',
      label: t('th_fare'),
      render: (row) =>
        row.fare
          ? `TZS ${Number(row.fare).toLocaleString()}`
          : row.estimated_fare
          ? `~TZS ${Number(row.estimated_fare).toLocaleString()}`
          : '—',
    },
    {
      key: 'created_at',
      label: t('th_date'),
      render: (row) => new Date(row.created_at).toLocaleDateString(),
    },
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
        {t('loading')}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '24px', color: 'var(--color-red)' }}>{error}</div>
    );
  }

  return (
    <div>
      <h1 style={{ marginBottom: '24px', fontSize: '20px' }}>
        {t('nav_dashboard')}
      </h1>

      {/* Stat cards */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          marginBottom: '32px',
        }}
      >
        <StatCard
          label={t('trips_today')}
          value={stats?.trips_today ?? '0'}
        />
        <StatCard
          label={t('active_trips')}
          value={stats?.active_trips ?? '0'}
          accent
        />
        <StatCard
          label={t('online_drivers')}
          value={stats?.online_drivers ?? '0'}
        />
        <StatCard
          label={t('revenue_today')}
          value={
            stats?.revenue_today
              ? `TZS ${Number(stats.revenue_today).toLocaleString()}`
              : 'TZS 0'
          }
          accent
        />
      </div>

      {/* Recent trips */}
      <div
        style={{
          background: 'var(--color-card-bg)',
          borderRadius: '10px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '16px 20px',
            borderBottom: '1px solid var(--color-border)',
          }}
        >
          <h2 style={{ fontSize: '15px' }}>{t('recent_trips')}</h2>
          <Link
            to="/drivers?approval_status=pending"
            style={{
              fontSize: '13px',
              color: 'var(--color-accent)',
              fontWeight: 600,
            }}
          >
            {t('view_pending_approvals')} →
          </Link>
        </div>
        <Table<Trip>
          columns={columns}
          rows={trips}
          keyField="id"
        />
      </div>
    </div>
  );
}

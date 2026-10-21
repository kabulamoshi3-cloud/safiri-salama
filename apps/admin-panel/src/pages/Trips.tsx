import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getTrips, cancelTrip, Trip } from '../services/api';
import Table, { Column } from '../components/Table';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const TERMINAL_STATUSES = ['completed', 'cancelled'];

export default function Trips() {
  const { t } = useTranslation();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Trip | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [fromFilter, setFromFilter] = useState('');
  const [toFilter, setToFilter] = useState('');

  function load() {
    setLoading(true);
    setError('');
    getTrips({
      status: statusFilter || undefined,
      from: fromFilter || undefined,
      to: toFilter || undefined,
    })
      .then((d) => setTrips(d.trips))
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, [statusFilter, fromFilter, toFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCancel(trip: Trip) {
    setActionLoading(true);
    try {
      await cancelTrip(trip.id);
      setSelected(null);
      load();
    } catch {
      alert(t('error'));
    } finally {
      setActionLoading(false);
    }
  }

  const columns: Column<Trip>[] = [
    {
      key: 'id',
      label: t('th_trip_id'),
      render: (r) => (
        <button
          onClick={() => setSelected(r)}
          style={{
            background: 'none',
            border: 'none',
            fontFamily: 'monospace',
            fontSize: '12px',
            color: 'var(--color-blue)',
            cursor: 'pointer',
            padding: 0,
            textDecoration: 'underline',
          }}
        >
          {r.id.slice(0, 8)}
        </button>
      ),
    },
    { key: 'passenger_name', label: t('th_passenger') },
    { key: 'driver_name',    label: t('th_driver'), render: (r) => r.driver_name ?? '—' },
    { key: 'pickup_address', label: t('th_pickup') },
    { key: 'dropoff_address', label: t('th_destination') },
    {
      key: 'status',
      label: t('th_status'),
      render: (r) => <StatusBadge status={r.status} label={r.status} />,
    },
    {
      key: 'fare',
      label: t('th_fare'),
      render: (r) =>
        Number(r.fare) > 0
          ? `TZS ${Number(r.fare).toLocaleString()}`
          : r.estimated_fare
          ? `~TZS ${Number(r.estimated_fare).toLocaleString()}`
          : '—',
    },
    {
      key: 'created_at',
      label: t('th_date'),
      render: (r) => new Date(r.created_at).toLocaleDateString(),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '20px', fontSize: '20px' }}>{t('trips_title')}</h1>

      {/* Filters */}
      <div
        style={{
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          marginBottom: '20px',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label style={labelStyle}>{t('filter_status')}</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={selectStyle}
          >
            <option value="">{t('filter_all')}</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>{t('filter_from')}</label>
          <input
            type="date"
            value={fromFilter}
            onChange={(e) => setFromFilter(e.target.value)}
            style={inputStyle}
          />
        </div>
        <div>
          <label style={labelStyle}>{t('filter_to')}</label>
          <input
            type="date"
            value={toFilter}
            onChange={(e) => setToFilter(e.target.value)}
            style={inputStyle}
          />
        </div>
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
          <Table<Trip>
            columns={columns}
            rows={trips}
            keyField="id"
          />
        )}
      </div>

      {selected && (
        <Modal title={t('trip_details')} onClose={() => setSelected(null)}>
          <TripDetail
            trip={selected}
            onCancel={() => handleCancel(selected)}
            loading={actionLoading}
            t={t}
          />
        </Modal>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '12px',
  fontWeight: 600,
  color: 'var(--color-text-secondary)',
  marginBottom: '4px',
  textTransform: 'uppercase',
  letterSpacing: '0.4px',
};

const inputStyle: React.CSSProperties = {
  padding: '7px 10px',
  border: '1px solid var(--color-border)',
  borderRadius: '6px',
  fontSize: '13px',
  background: 'var(--color-card-bg)',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  minWidth: '140px',
};

function TripDetail({
  trip,
  onCancel,
  loading,
  t,
}: {
  trip: Trip;
  onCancel: () => void;
  loading: boolean;
  t: (k: string) => string;
}) {
  const terminal = TERMINAL_STATUSES.includes(trip.status);
  const fare = Number(trip.fare) > 0 ? trip.fare : trip.estimated_fare;

  const rows = [
    ['Trip ID', trip.id],
    ['Status', trip.status],
    ['Passenger', trip.passenger_name],
    ['Passenger Phone', trip.passenger_phone],
    ['Driver', trip.driver_name ?? '—'],
    ['Driver Phone', trip.driver_phone ?? '—'],
    ['Pickup', trip.pickup_address],
    ['Destination', trip.dropoff_address],
    ['Vehicle Type', trip.vehicle_type],
    ['Fare', fare ? `TZS ${Number(fare).toLocaleString()}` : '—'],
    ['Distance', trip.estimated_distance ? `${trip.estimated_distance} km` : '—'],
    ['Payment', trip.payment_method],
    ['Created', new Date(trip.created_at).toLocaleString()],
    ['Completed', trip.completed_at ? new Date(trip.completed_at).toLocaleString() : '—'],
    ['Cancelled', trip.cancelled_at ? new Date(trip.cancelled_at).toLocaleString() : '—'],
  ];

  return (
    <div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px',
        }}
      >
        <StatusBadge status={trip.status} label={trip.status} />
      </div>

      <table style={{ width: '100%', fontSize: '13px', marginBottom: '20px' }}>
        <tbody>
          {rows.map(([label, value]) => (
            <tr key={label} style={{ borderBottom: '1px solid var(--color-border)' }}>
              <td style={{ padding: '8px 0', color: 'var(--color-text-secondary)', width: '40%' }}>
                {label}
              </td>
              <td
                style={{
                  padding: '8px 0',
                  fontWeight: 500,
                  wordBreak: 'break-all',
                  fontFamily: label === 'Trip ID' ? 'monospace' : undefined,
                  fontSize: label === 'Trip ID' ? '11px' : undefined,
                }}
              >
                {value}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        disabled={terminal || loading}
        onClick={onCancel}
        title={terminal ? 'Trip is already in a terminal state' : undefined}
        style={{
          padding: '8px 16px',
          border: 'none',
          borderRadius: '4px',
          fontSize: '13px',
          fontWeight: 600,
          cursor: terminal || loading ? 'not-allowed' : 'pointer',
          background: terminal ? 'var(--color-gray-bg)' : 'var(--color-red-bg)',
          color: terminal ? 'var(--color-text-muted)' : 'var(--color-red)',
          opacity: terminal ? 0.6 : 1,
        }}
      >
        {t('force_cancel')}
      </button>
    </div>
  );
}

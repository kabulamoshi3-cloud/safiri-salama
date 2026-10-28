import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getAnalytics, AnalyticsData } from '../services/api';

const PERIOD_OPTIONS = [
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const MOCK_ANALYTICS: AnalyticsData = {
  trips_over_time: Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { day: `${d.getDate()}/${d.getMonth() + 1}`, trips: 40 + Math.floor(Math.random() * 60) };
  }),
  revenue_trends: Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    return { day: `${d.getDate()}/${d.getMonth() + 1}`, revenue: 80000 + Math.floor(Math.random() * 120000) };
  }),
  driver_performance: [
    { name: 'Juma A.', trips: 87, rating: 4.9 },
    { name: 'Fatuma S.', trips: 73, rating: 4.7 },
    { name: 'Amina H.', trips: 65, rating: 4.8 },
    { name: 'Hassan M.', trips: 59, rating: 4.5 },
    { name: 'Said K.', trips: 51, rating: 4.6 },
  ],
  peak_hours: Array.from({ length: 12 }, (_, i) => {
    const hour = i * 2;
    return { hour: `${String(hour).padStart(2, '0')}:00`, demand: 10 + Math.floor(Math.random() * 90) };
  }),
};

export default function Analytics() {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('30d');
  const [data, setData] = useState<AnalyticsData>(MOCK_ANALYTICS);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    getAnalytics(period)
      .then((res) => setData(res))
      .catch(() => setData(MOCK_ANALYTICS))
      .finally(() => setLoading(false));
  }, [period]);

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
            {t('analytics_title') || 'Analytics'}
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            {t('analytics_subtitle') || 'Business intelligence and insights'}
          </p>
        </div>

        {/* Period selector */}
        <div style={{ display: 'flex', gap: '6px' }}>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setPeriod(opt.value)}
              style={{
                padding: '6px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: '999px',
                background: period === opt.value ? 'var(--color-accent)' : 'var(--color-card-bg)',
                color: period === opt.value ? '#fff' : 'var(--color-text-primary)',
                fontWeight: period === opt.value ? 600 : 400,
                cursor: 'pointer',
                fontSize: '12px',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ padding: '12px 0', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          {t('loading')}…
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {/* Chart 1: Trips Over Time — LineChart */}
        <div
          style={{
            background: 'var(--color-card-bg)',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Trips Over Time</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Daily trip volume trend
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.trips_over_time} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="trips"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: '#3b82f6' }}
                activeDot={{ r: 5 }}
                name="Trips"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 2: Revenue Trends — LineChart */}
        <div
          style={{
            background: 'var(--color-card-bg)',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Revenue Trends</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Daily revenue in TZS
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.revenue_trends} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => [`TZS ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Line
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 3, fill: '#10b981' }}
                activeDot={{ r: 5 }}
                name="Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 3: Driver Performance — BarChart */}
        <div
          style={{
            background: 'var(--color-card-bg)',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Driver Performance</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Top drivers by completed trips
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.driver_performance} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="trips" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Chart 4: Peak Hours — BarChart */}
        <div
          style={{
            background: 'var(--color-card-bg)',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>Peak Hours</h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
            Demand patterns by hour of day
          </p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.peak_hours} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="hour" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="demand" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Demand" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

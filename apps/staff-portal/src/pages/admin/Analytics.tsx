import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Analytics() {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          {t('analytics_title') || 'Analytics'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {t('analytics_subtitle') || 'Business intelligence and insights'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {/* Chart Placeholders */}
        {[
          { title: 'Trips Over Time', desc: 'Daily, weekly, and monthly trends' },
          { title: 'Revenue Trends', desc: 'Revenue growth and forecasts' },
          { title: 'Driver Performance', desc: 'Top drivers and completion rates' },
          { title: 'Peak Hours Heatmap', desc: 'Demand patterns by hour and day' },
        ].map((chart, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              borderRadius: '8px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              minHeight: '300px',
            }}
          >
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>{chart.title}</h3>
            <p style={{ fontSize: '14px', color: '#999', marginBottom: '20px' }}>{chart.desc}</p>
            <div
              style={{
                height: '200px',
                background: '#f5f5f5',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#999',
              }}
            >
              Chart Placeholder
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

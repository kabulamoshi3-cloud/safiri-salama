import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Finance() {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          {t('finance_title') || 'Finance'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {t('finance_subtitle') || 'Revenue, payouts, and financial reports'}
        </p>
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[
          { label: 'Total Revenue', value: 'Sh 4,500,000', color: '#34c759' },
          { label: 'Platform Fees', value: 'Sh 450,000', color: '#007aff' },
          { label: 'Driver Payouts', value: 'Sh 3,600,000', color: '#ff9500' },
          { label: 'Pending Settlements', value: 'Sh 150,000', color: '#ff3b30' },
        ].map((stat, i) => (
          <div
            key={i}
            style={{
              background: 'white',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
          >
            <div style={{ fontSize: '13px', color: '#666', marginBottom: '8px' }}>{stat.label}</div>
            <div style={{ fontSize: '24px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Recent Transactions */}
      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Recent Transactions</h2>
        <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>
          Transaction history will appear here
        </div>
      </div>
    </div>
  );
}

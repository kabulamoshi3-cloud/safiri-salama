import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Pricing() {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          {t('pricing_title') || 'Pricing & Fare Management'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {t('pricing_subtitle') || 'Configure dynamic pricing and fare rules'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {/* Base Rates */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Base Fare Rates</h2>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Base Fare (Sh)</label>
            <input type="number" placeholder="2000" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Per KM Rate (Sh)</label>
            <input type="number" placeholder="500" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '14px', fontWeight: 500 }}>Per Minute Rate (Sh)</label>
            <input type="number" placeholder="50" style={{ width: '100%', padding: '8px', border: '1px solid #ddd', borderRadius: '4px' }} />
          </div>
        </div>

        {/* Vehicle Multipliers */}
        <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Vehicle Type Multipliers</h2>
          <div style={{ marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>🚗 Car</span>
              <span style={{ fontWeight: 600 }}>1.5x</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <span>🛺 Bajaji</span>
              <span style={{ fontWeight: 600 }}>1.0x</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
              <span>🏍️ Boda-Boda</span>
              <span style={{ fontWeight: 600 }}>0.8x</span>
            </div>
          </div>
        </div>
      </div>

      {/* Surge Pricing */}
      <div style={{ marginTop: '16px', background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Surge Pricing Rules</h2>
        <p style={{ color: '#999', textAlign: 'center', padding: '20px' }}>Configure surge pricing based on demand, time, and location</p>
      </div>
    </div>
  );
}

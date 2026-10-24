import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Promotions() {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          {t('promotions_title') || 'Promotions'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {t('promotions_subtitle') || 'Manage promo codes and campaigns'}
        </p>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <button
          style={{
            background: '#007aff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          + Create New Promo
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Promo Code</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Discount</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Valid From</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Valid To</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Usage Count</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                No promotions yet. Create your first promo code.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Fleet() {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          {t('fleet_title') || 'Fleet Management'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {t('fleet_subtitle') || 'Manage vehicles and fleet operations'}
        </p>
      </div>

      <div
        style={{
          background: 'white',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Plate Number</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Vehicle Type</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Assigned Driver</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Mileage</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Last Maintenance</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                No fleet data available. This section is ready for implementation.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

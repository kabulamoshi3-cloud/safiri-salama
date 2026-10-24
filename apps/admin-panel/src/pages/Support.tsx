import React from 'react';
import { useTranslation } from 'react-i18next';

export default function Support() {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          {t('support_title') || 'Support Tickets'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {t('support_subtitle') || 'Customer support and help desk'}
        </p>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Ticket ID</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>User</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Subject</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Priority</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Created</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Assigned To</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                No support tickets. All clear!
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

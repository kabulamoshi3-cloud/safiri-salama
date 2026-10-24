import React from 'react';
import { useTranslation } from 'react-i18next';

export default function StaffRoles() {
  const { t } = useTranslation();

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          {t('staff_title') || 'Staff & Roles'}
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          {t('staff_subtitle') || 'Manage admin users and permissions'}
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
          + Add Staff Member
        </button>
      </div>

      <div style={{ background: 'white', borderRadius: '8px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Name</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Email</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Role</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Permissions</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Last Login</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Status</th>
              <th style={{ padding: '12px', textAlign: 'left', fontWeight: 600 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#999' }}>
                No staff members yet. Add your first admin user.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

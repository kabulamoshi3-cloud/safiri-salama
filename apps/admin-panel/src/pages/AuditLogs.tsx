import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getAuditLogs, AuditLog } from '../services/api';

const PAGE_SIZE = 50;

export default function AuditLogs() {
  const { t } = useTranslation();

  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [adminFilter, setAdminFilter] = useState('');

  function load(p = 0) {
    setLoading(true);
    setError('');
    getAuditLogs({
      from: from || undefined,
      to: to || undefined,
      admin_id: adminFilter || undefined,
      page: p,
      limit: PAGE_SIZE,
    })
      .then((res) => {
        setLogs(res.logs);
        setTotal(res.total);
      })
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    setPage(0);
    load(0);
  }, [from, to, adminFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(next: number) {
    setPage(next);
    load(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '4px' }}>
          Audit Logs
        </h1>
        <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
          Admin action history and compliance trail
        </p>
      </div>

      {/* Filters */}
      <div
        style={{
          background: 'var(--color-card-bg)',
          borderRadius: '8px',
          padding: '16px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          marginBottom: '16px',
          display: 'flex',
          gap: '12px',
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            From
          </label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '13px',
              background: 'var(--color-card-bg)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            To
          </label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            style={{
              padding: '6px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '13px',
              background: 'var(--color-card-bg)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
            Admin
          </label>
          <input
            type="text"
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            placeholder="Filter by admin name or ID"
            style={{
              padding: '6px 10px',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontSize: '13px',
              width: '200px',
              background: 'var(--color-card-bg)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>
        <button
          onClick={() => { setFrom(''); setTo(''); setAdminFilter(''); }}
          style={{
            padding: '6px 14px',
            border: '1px solid var(--color-border)',
            borderRadius: '6px',
            background: 'var(--color-gray-bg)',
            color: 'var(--color-text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          Clear
        </button>
      </div>

      {/* Table */}
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
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr
                  style={{
                    borderBottom: '2px solid var(--color-border)',
                    background: 'var(--color-gray-bg)',
                  }}
                >
                  {['Timestamp', 'Admin', 'Action', 'Affected Account', 'Reason'].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'left',
                        fontWeight: 600,
                        color: 'var(--color-text-secondary)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}
                    >
                      No audit logs found
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr
                      key={log.id}
                      style={{ borderBottom: '1px solid var(--color-border)' }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-gray-bg)')}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '')}
                    >
                      <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                        {new Date(log.created_at).toLocaleString()}
                      </td>
                      <td style={{ padding: '10px 12px' }}>{log.admin_name}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            background: 'var(--color-blue-bg)',
                            color: 'var(--color-blue)',
                            fontSize: '12px',
                            fontWeight: 600,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px' }}>{log.affected_account}</td>
                      <td style={{ padding: '10px 12px', color: 'var(--color-text-secondary)' }}>
                        {log.reason ?? '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '16px',
            fontSize: '13px',
            color: 'var(--color-text-secondary)',
          }}
        >
          <span>
            Page {page + 1} of {totalPages} — {total} total records
          </span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              disabled={page === 0}
              onClick={() => handlePageChange(page - 1)}
              style={{
                padding: '6px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-card-bg)',
                cursor: page === 0 ? 'not-allowed' : 'pointer',
                opacity: page === 0 ? 0.5 : 1,
                fontSize: '13px',
              }}
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages - 1}
              onClick={() => handlePageChange(page + 1)}
              style={{
                padding: '6px 14px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                background: 'var(--color-card-bg)',
                cursor: page >= totalPages - 1 ? 'not-allowed' : 'pointer',
                opacity: page >= totalPages - 1 ? 0.5 : 1,
                fontSize: '13px',
              }}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

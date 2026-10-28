import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  getStats,
  getFinanceTransactions,
  AdminStats,
  FinanceTransaction,
} from '../services/api';

type TabKey = 'transactions' | 'payouts';

const PAGE_SIZE = 20;

export default function Finance() {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabKey>('transactions');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Computed totals from transactions list
  const totalRevenue = transactions.reduce((s, tx) => s + parseFloat(tx.amount || '0'), 0);
  const platformFees = transactions.reduce((s, tx) => s + parseFloat(tx.platform_fee || '0'), 0);
  const driverPayouts = transactions.reduce((s, tx) => s + parseFloat(tx.driver_payout || '0'), 0);
  const revenueTodayNum = stats ? parseFloat(stats.revenue_today || '0') : 0;

  function loadTransactions(p = 0) {
    setLoading(true);
    setError('');
    getFinanceTransactions({ page: p, limit: PAGE_SIZE })
      .then((res) => {
        setTransactions(res.transactions);
        setTotal(res.total);
      })
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    getStats().then(setStats).catch(() => null);
    loadTransactions(0);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handlePageChange(next: number) {
    setPage(next);
    loadTransactions(next);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const summaryCards = [
    { label: "Today's Revenue", value: `TZS ${revenueTodayNum.toLocaleString()}`, color: '#34c759' },
    { label: 'Platform Fees', value: `TZS ${platformFees.toLocaleString()}`, color: '#007aff' },
    { label: 'Driver Payouts', value: `TZS ${driverPayouts.toLocaleString()}`, color: '#ff9500' },
    { label: 'Total Transactions', value: `TZS ${totalRevenue.toLocaleString()}`, color: '#5856d6' },
  ];

  function statusColor(status: string) {
    if (status === 'completed') return { bg: 'var(--color-green-bg)', color: 'var(--color-green)' };
    if (status === 'pending') return { bg: 'var(--color-orange-bg)', color: 'var(--color-orange)' };
    if (status === 'failed') return { bg: 'var(--color-red-bg)', color: 'var(--color-red)' };
    return { bg: 'var(--color-gray-bg)', color: 'var(--color-text-secondary)' };
  }

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
        {summaryCards.map((card) => (
          <div
            key={card.label}
            style={{
              background: 'var(--color-card-bg)',
              padding: '20px',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              {card.label}
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: card.color }}>{card.value}</div>
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
        {(['transactions', 'payouts'] as TabKey[]).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            style={{
              padding: '6px 18px',
              border: '1px solid var(--color-border)',
              borderRadius: '999px',
              background: tab === k ? 'var(--color-accent)' : 'var(--color-card-bg)',
              color: tab === k ? '#fff' : 'var(--color-text-primary)',
              fontWeight: tab === k ? 600 : 400,
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {k === 'transactions' ? 'Transactions' : 'Payouts'}
          </button>
        ))}
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
                <tr style={{ borderBottom: '2px solid var(--color-border)', background: 'var(--color-gray-bg)' }}>
                  {(tab === 'transactions'
                    ? ['Date', 'Passenger', 'Driver', 'Amount', 'Platform Fee', 'Payment Method', 'Status']
                    : ['Date', 'Driver', 'Amount', 'Status']
                  ).map((h) => (
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
                {transactions.length === 0 ? (
                  <tr>
                    <td
                      colSpan={tab === 'transactions' ? 7 : 4}
                      style={{ padding: '32px', textAlign: 'center', color: 'var(--color-text-muted)' }}
                    >
                      No transactions found
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const sc = statusColor(tx.status);
                    return (
                      <tr
                        key={tx.id}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-gray-bg)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '')}
                      >
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                          {new Date(tx.created_at).toLocaleDateString()}
                        </td>
                        {tab === 'transactions' ? (
                          <>
                            <td style={{ padding: '10px 12px' }}>{tx.passenger_name ?? '—'}</td>
                            <td style={{ padding: '10px 12px' }}>{tx.driver_name ?? '—'}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                              TZS {parseFloat(tx.amount).toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 12px' }}>
                              TZS {parseFloat(tx.platform_fee ?? '0').toLocaleString()}
                            </td>
                            <td style={{ padding: '10px 12px', textTransform: 'capitalize' }}>
                              {tx.payment_method}
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={{ padding: '10px 12px' }}>{tx.driver_name ?? '—'}</td>
                            <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                              TZS {parseFloat(tx.driver_payout ?? tx.amount).toLocaleString()}
                            </td>
                          </>
                        )}
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: sc.bg,
                              color: sc.color,
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          >
                            {tx.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
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
            Page {page + 1} of {totalPages} — {total} total
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

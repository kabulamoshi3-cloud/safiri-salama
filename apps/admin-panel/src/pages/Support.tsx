import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getSupportTickets, updateSupportTicket, SupportTicket } from '../services/api';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

export default function Support() {
  const { t } = useTranslation();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<SupportTicket | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  function load() {
    setLoading(true);
    setError('');
    getSupportTickets()
      .then((res) => setTickets(res.tickets))
      .catch(() => setError(t('error')))
      .finally(() => setLoading(false));
  }

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleStatusChange(ticket: SupportTicket, newStatus: SupportTicket['status']) {
    setActionLoading(true);
    try {
      await updateSupportTicket(ticket.id, newStatus);
      setTickets((prev) =>
        prev.map((tk) => (tk.id === ticket.id ? { ...tk, status: newStatus } : tk))
      );
      if (selected?.id === ticket.id) {
        setSelected((prev) => prev ? { ...prev, status: newStatus } : null);
      }
    } catch {
      alert(t('error'));
    } finally {
      setActionLoading(false);
    }
  }

  function priorityColor(priority: SupportTicket['priority']) {
    switch (priority) {
      case 'urgent': return { bg: 'var(--color-red-bg)', color: 'var(--color-red)' };
      case 'high': return { bg: 'var(--color-orange-bg)', color: 'var(--color-orange)' };
      case 'medium': return { bg: 'var(--color-blue-bg)', color: 'var(--color-blue)' };
      default: return { bg: 'var(--color-gray-bg)', color: 'var(--color-text-secondary)' };
    }
  }

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
                  {['Ticket ID', 'User', 'Subject', 'Status', 'Priority', 'Created', 'Assigned To', 'Actions'].map((h) => (
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
                {tickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '40px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      No support tickets. All clear!
                    </td>
                  </tr>
                ) : (
                  tickets.map((ticket) => {
                    const pc = priorityColor(ticket.priority);
                    return (
                      <tr
                        key={ticket.id}
                        style={{ borderBottom: '1px solid var(--color-border)' }}
                        onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = 'var(--color-gray-bg)')}
                        onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = '')}
                      >
                        <td style={{ padding: '10px 12px', fontFamily: 'monospace', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                          #{ticket.id.slice(0, 8)}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{ticket.user_name ?? '—'}</td>
                        <td style={{ padding: '10px 12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ticket.subject}
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <StatusBadge status={ticket.status} label={ticket.status.replace(/_/g, ' ')} />
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span
                            style={{
                              display: 'inline-block',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              background: pc.bg,
                              color: pc.color,
                              fontSize: '11px',
                              fontWeight: 600,
                              textTransform: 'capitalize',
                            }}
                          >
                            {ticket.priority}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', whiteSpace: 'nowrap', color: 'var(--color-text-secondary)' }}>
                          {new Date(ticket.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 12px' }}>{ticket.assigned_to ?? '—'}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <button
                            onClick={() => setSelected(ticket)}
                            style={{
                              padding: '4px 10px',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              background: 'var(--color-blue-bg)',
                              color: 'var(--color-blue)',
                            }}
                          >
                            View
                          </button>
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

      {/* Ticket detail modal */}
      {selected && (
        <Modal title={`Ticket #${selected.id.slice(0, 8)}`} onClose={() => setSelected(null)}>
          <div>
            <table style={{ width: '100%', fontSize: '13px', marginBottom: '20px' }}>
              <tbody>
                {[
                  ['User', selected.user_name ?? '—'],
                  ['Subject', selected.subject],
                  ['Status', selected.status.replace(/_/g, ' ')],
                  ['Priority', selected.priority],
                  ['Assigned To', selected.assigned_to ?? '—'],
                  ['Created', new Date(selected.created_at).toLocaleString()],
                ].map(([label, value]) => (
                  <tr key={label} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <td style={{ padding: '8px 0', color: 'var(--color-text-secondary)', width: '35%' }}>
                      {label}
                    </td>
                    <td style={{ padding: '8px 0', fontWeight: 500 }}>{value}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {selected.message && (
              <div
                style={{
                  background: 'var(--color-gray-bg)',
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '13px',
                  marginBottom: '20px',
                  color: 'var(--color-text-primary)',
                }}
              >
                {selected.message}
              </div>
            )}

            {/* Status actions */}
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                Update status:
              </p>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {(['open', 'in_progress', 'resolved', 'closed'] as SupportTicket['status'][])
                  .filter((s) => s !== selected.status)
                  .map((s) => (
                    <button
                      key={s}
                      disabled={actionLoading}
                      onClick={() => handleStatusChange(selected, s)}
                      style={{
                        padding: '6px 14px',
                        border: '1px solid var(--color-border)',
                        borderRadius: '6px',
                        background: 'var(--color-card-bg)',
                        color: 'var(--color-text-primary)',
                        fontSize: '12px',
                        fontWeight: 500,
                        cursor: actionLoading ? 'not-allowed' : 'pointer',
                        textTransform: 'capitalize',
                      }}
                    >
                      Mark {s.replace(/_/g, ' ')}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

import React from 'react';

interface StatusBadgeProps {
  status: string;
  label?: string;
}

function getColors(status: string): { bg: string; color: string } {
  const s = status.toLowerCase();
  if (
    s === 'active' ||
    s === 'approved' ||
    s === 'online' ||
    s === 'available' ||
    s === 'completed'
  ) {
    return { bg: 'var(--color-green-bg)', color: 'var(--color-green)' };
  }
  if (s === 'pending' || s === 'in_progress' || s === 'accepted') {
    return { bg: 'var(--color-orange-bg)', color: 'var(--color-orange)' };
  }
  if (s === 'banned' || s === 'cancelled' || s === 'rejected') {
    return { bg: 'var(--color-red-bg)', color: 'var(--color-red)' };
  }
  return { bg: 'var(--color-gray-bg)', color: 'var(--color-gray)' };
}

export default function StatusBadge({ status, label }: StatusBadgeProps) {
  const { bg, color } = getColors(status);
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 10px',
        borderRadius: '999px',
        fontSize: '12px',
        fontWeight: 600,
        background: bg,
        color,
        whiteSpace: 'nowrap',
      }}
    >
      {label ?? status}
    </span>
  );
}

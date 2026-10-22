/**
 * AlertBadge — coloured status pill used by Fleet and Drivers pages
 */

import React from 'react';

interface AlertBadgeProps {
  status: string;
}

const AlertBadge: React.FC<AlertBadgeProps> = ({ status }) => {
  const classes: Record<string, string> = {
    active:      'bg-green-100 text-green-700',
    online:      'bg-green-100 text-green-700',
    'on-trip':   'bg-blue-100  text-blue-700',
    maintenance: 'bg-yellow-100 text-yellow-700',
    offline:     'bg-red-100   text-red-700',
  };

  const cls = classes[status] ?? 'bg-gray-100 text-gray-600';

  return (
    <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold capitalize ${cls}`}>
      {status}
    </span>
  );
};

export default AlertBadge;

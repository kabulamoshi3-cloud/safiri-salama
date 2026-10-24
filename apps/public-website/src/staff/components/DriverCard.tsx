/**
 * DriverCard — compact white card for a single driver (for future use)
 */

import React from 'react';
import AlertBadge from './AlertBadge';

interface DriverCardProps {
  name: string;
  status: string;
  rating: number;
  trips: number;
}

const DriverCard: React.FC<DriverCardProps> = ({ name, status, rating, trips }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-900 text-sm">{name}</span>
        <AlertBadge status={status} />
      </div>
      <span className="text-xs text-gray-500">⭐ {rating.toFixed(1)}</span>
      <span className="text-xs text-gray-600">{trips} trips</span>
    </div>
  );
};

export default DriverCard;

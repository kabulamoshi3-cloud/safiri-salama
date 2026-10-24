/**
 * VehicleCard — compact white card for a single vehicle (for future use)
 */

import React from 'react';
import AlertBadge from './AlertBadge';

interface VehicleCardProps {
  plate: string;
  type: string;
  status: string;
  driver: string;
}

const VehicleCard: React.FC<VehicleCardProps> = ({ plate, type, status, driver }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="font-bold text-gray-900 text-sm">{plate}</span>
        <AlertBadge status={status} />
      </div>
      <span className="text-xs text-gray-500 capitalize">{type}</span>
      <span className="text-xs text-gray-600">{driver}</span>
    </div>
  );
};

export default VehicleCard;

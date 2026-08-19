/**
 * TripCard Component — shows an active or recent trip summary
 */

import React from 'react';
import { MapPin, Clock, DollarSign, User } from 'lucide-react';

interface Trip {
  id: string;
  passenger: string;
  pickup: string;
  dropoff: string;
  distance: number;
  fare: number;
  status: string;
}

interface TripCardProps {
  trip: Trip;
}

const statusColors: Record<string, string> = {
  pending:    'bg-yellow-100 text-yellow-800',
  accepted:   'bg-blue-100 text-blue-800',
  in_progress:'bg-green-100 text-green-800',
  completed:  'bg-gray-100 text-gray-700',
  cancelled:  'bg-red-100 text-red-800',
};

const TripCard: React.FC<TripCardProps> = ({ trip }) => {
  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <User size={18} className="text-blue-600" />
          <span className="font-semibold text-gray-900">{trip.passenger}</span>
        </div>
        <span className={`text-xs font-semibold px-3 py-1 rounded-full capitalize ${statusColors[trip.status] ?? 'bg-gray-100 text-gray-700'}`}>
          {trip.status.replace('_', ' ')}
        </span>
      </div>

      {/* Route */}
      <div className="space-y-2 mb-4">
        <div className="flex items-start gap-2">
          <div className="mt-1 w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
          <p className="text-sm text-gray-700">{trip.pickup}</p>
        </div>
        <div className="ml-1.5 border-l-2 border-dashed border-gray-300 h-4" />
        <div className="flex items-start gap-2">
          <MapPin size={14} className="text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-gray-700">{trip.dropoff}</p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-6 text-sm border-t border-gray-100 pt-4">
        <div className="flex items-center gap-1 text-gray-600">
          <Clock size={14} />
          <span>{trip.distance} km</span>
        </div>
        <div className="flex items-center gap-1 text-green-600 font-bold">
          <DollarSign size={14} />
          <span>Sh{trip.fare}</span>
        </div>
      </div>
    </div>
  );
};

export default TripCard;

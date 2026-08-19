/**
 * Trips Page — trip history with filters
 */

import React, { useEffect, useState } from 'react';
import TripCard from '../components/TripCard';
import api from '../services/api';

type StatusFilter = 'all' | 'completed' | 'cancelled' | 'in_progress';

const Trips: React.FC = () => {
  const [trips, setTrips] = useState<any[]>([]);
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTrips();
  }, [filter]);

  const fetchTrips = async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/drivers/trips', { params });
      setTrips(res.data.trips ?? []);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const filters: StatusFilter[] = ['all', 'in_progress', 'completed', 'cancelled'];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Trips</h1>
        <p className="text-gray-600 mt-2">View and manage all your trips</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-3 mb-6 flex-wrap">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition capitalize ${
              filter === f
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {f.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Trip List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg">No trips found</p>
          <p className="text-sm mt-1">Go online to start receiving trip requests</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Trips;

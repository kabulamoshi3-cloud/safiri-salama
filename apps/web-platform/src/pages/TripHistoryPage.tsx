/**
 * Trip History Page — past rides with receipt download
 */

import React, { useEffect, useState } from 'react';
import { MapPin, Star, Download, ChevronDown } from 'lucide-react';
import api from '../services/api';
import { i18n } from '../i18n';

interface Trip {
  id: string;
  pickup_location: string;
  dropoff_location: string;
  final_price: number;
  status: string;
  rating: number | null;
  driver_name: string;
  created_at: string;
}

const statusBadge: Record<string, string> = {
  completed: 'bg-green-100 text-green-700',
  cancelled:  'bg-red-100 text-red-700',
  in_progress:'bg-blue-100 text-blue-700',
};

const TripHistoryPage: React.FC = () => {
  const [trips,   setTrips]   = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  useEffect(() => { fetchTrips(1); }, []);

  const fetchTrips = async (p: number) => {
    setLoading(true);
    try {
      const res = await api.get('/trips/history', { params: { page: p, limit: 10 } });
      const incoming: Trip[] = res.data.trips ?? [];
      setTrips((prev) => p === 1 ? incoming : [...prev, ...incoming]);
      setHasMore(incoming.length === 10);
    } catch {
      setTrips([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchTrips(next);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{i18n.t('trips.history_title')}</h1>

      {loading && trips.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
        </div>
      ) : trips.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <MapPin size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-semibold">{i18n.t('no_trips_yet')}</p>
          <p className="text-sm">{i18n.t('trips.empty_desc')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {trips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-xl shadow border border-gray-100 p-5">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="text-xs text-gray-400">
                    {new Date(trip.created_at).toLocaleDateString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">{i18n.t('trips.driver_label')} {trip.driver_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  {trip.rating && (
                    <div className="flex items-center gap-1 text-yellow-500">
                      <Star size={14} className="fill-yellow-500" />
                      <span className="text-sm font-semibold text-gray-700">{trip.rating}</span>
                    </div>
                  )}
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${statusBadge[trip.status] ?? 'bg-gray-100 text-gray-600'}`}>
                    {trip.status}
                  </span>
                </div>
              </div>

              {/* Route */}
              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <p className="text-sm text-gray-700 truncate">{trip.pickup_location}</p>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={12} className="text-red-500 flex-shrink-0 ml-0.5" />
                  <p className="text-sm text-gray-700 truncate">{trip.dropoff_location}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-gray-100 pt-3">
                <p className="font-bold text-gray-900 text-lg">Sh{trip.final_price}</p>
                <button className="flex items-center gap-1 text-blue-600 text-sm font-semibold hover:underline">
                  <Download size={14} /> {i18n.t('receipt')}
                </button>
              </div>
            </div>
          ))}

          {hasMore && (
            <button
              onClick={loadMore}
              disabled={loading}
              className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-xl hover:bg-gray-50 transition flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-500" />
                : <><ChevronDown size={18} /> {i18n.t('common.load_more')}</>
              }
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default TripHistoryPage;

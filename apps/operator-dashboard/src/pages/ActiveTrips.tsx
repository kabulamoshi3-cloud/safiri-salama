import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Navigation } from 'lucide-react';

const mockTrips = [
  { id: 'TRP-1234', driver: 'James Mwangi', passenger: 'John Doe',   pickup: 'Kariakoo', destination: 'Masaki',      status: 'in_progress',     eta: '8 min' },
  { id: 'TRP-1235', driver: 'Peter Kimani', passenger: 'Mary Smith', pickup: 'Ubungo',   destination: 'Airport',     status: 'driver_arriving', eta: '3 min' },
  { id: 'TRP-1236', driver: 'Samuel Osei',  passenger: 'Ali Hassan', pickup: 'Mlimani',  destination: 'Mikocheni',   status: 'accepted',        eta: '12 min' },
  { id: 'TRP-1237', driver: 'Ali Hassan',   passenger: 'Jane Doe',   pickup: 'Sinza',    destination: 'City Center', status: 'in_progress',     eta: '15 min' },
];

const statusStyles: Record<string, string> = {
  accepted:        'bg-yellow-100 text-yellow-700',
  driver_arriving: 'bg-blue-100 text-blue-700',
  in_progress:     'bg-green-100 text-green-700',
};

export default function ActiveTrips() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? mockTrips : mockTrips.filter((t) => t.status === filter);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('nav_active_trips') || 'Active Trips'}</h1>
        <p className="text-gray-500 text-sm mt-1">Ongoing trips in real-time</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Active', value: mockTrips.length },
          { label: 'In Progress',  value: mockTrips.filter(t => t.status === 'in_progress').length },
          { label: 'Arriving',     value: mockTrips.filter(t => t.status === 'driver_arriving').length },
        ].map((s, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all','All'],['accepted','Accepted'],['driver_arriving','Driver Arriving'],['in_progress','In Progress']].map(([val,label]) => (
          <button key={val} onClick={() => setFilter(val)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === val ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Trip ID','Driver','Passenger','Pickup → Destination','Status','ETA','Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((trip) => (
              <tr key={trip.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{trip.id}</td>
                <td className="px-4 py-3 font-medium">{trip.driver}</td>
                <td className="px-4 py-3">{trip.passenger}</td>
                <td className="px-4 py-3 text-gray-600">{trip.pickup} → {trip.destination}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[trip.status] ?? 'bg-gray-100 text-gray-700'}`}>
                    {trip.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-blue-600 font-medium">{trip.eta}</td>
                <td className="px-4 py-3">
                  <button className="text-xs text-blue-600 hover:underline mr-2">View</button>
                  <button className="text-xs text-red-500 hover:underline">Flag</button>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-gray-400">No trips match this filter</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

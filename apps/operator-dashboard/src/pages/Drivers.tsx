/**
 * Drivers Management Page
 * Lists fleet drivers with stats, assign/unassign vehicle, expandable rows.
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Wifi, Star, X, ChevronDown, ChevronUp } from 'lucide-react';
import AlertBadge from '../components/AlertBadge';
import StatCard from '../components/StatCard';
import api from '../services/api';

interface Driver {
  id: string;
  name: string;
  phone: string;
  rating: number;
  trips_count: number;
  earnings_month: number;
  status: 'online' | 'offline' | 'on-trip';
  vehicle_plate: string;
}

// MOCK DATA — fallback when API is unavailable
const MOCK_DRIVERS: Driver[] = [
  { id: '1', name: 'Juma Ally',     phone: '+255712345001', rating: 4.8, trips_count: 312, earnings_month: 450000, status: 'online',   vehicle_plate: 'T 123 AAA' },
  { id: '2', name: 'Amina Hassan',  phone: '+255712345002', rating: 4.5, trips_count: 245, earnings_month: 380000, status: 'on-trip',  vehicle_plate: 'T 456 BBB' },
  { id: '3', name: 'Salim Mwangi', phone: '+255712345003', rating: 4.2, trips_count: 198, earnings_month: 310000, status: 'offline',  vehicle_plate: 'T 789 CCC' },
  { id: '4', name: 'Fatuma Said',   phone: '+255712345004', rating: 4.7, trips_count: 421, earnings_month: 590000, status: 'online',   vehicle_plate: 'T 321 DDD' },
  { id: '5', name: 'Omar Kimani',  phone: '+255712345005', rating: 3.9, trips_count: 134, earnings_month: 210000, status: 'offline',  vehicle_plate: '' },
  { id: '6', name: 'Zainab Musa',   phone: '+255712345006', rating: 4.6, trips_count: 287, earnings_month: 425000, status: 'on-trip',  vehicle_plate: 'T 654 EEE' },
];

// MOCK DATA — available vehicles for assign modal
const MOCK_AVAILABLE_PLATES = ['T 100 FFF', 'T 200 GGG', 'T 300 HHH'];

const StarRating: React.FC<{ value: number }> = ({ value }) => (
  <span className="text-yellow-500 text-sm">
    {'★'.repeat(Math.round(value))}{'☆'.repeat(5 - Math.round(value))}
    <span className="text-gray-500 ml-1 text-xs">{value.toFixed(1)}</span>
  </span>
);

const Drivers: React.FC = () => {
  const { t } = useTranslation();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [assignTarget, setAssignTarget] = useState<Driver | null>(null);
  const [assignPlate, setAssignPlate] = useState(MOCK_AVAILABLE_PLATES[0]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/drivers');
        setDrivers(res.data ?? MOCK_DRIVERS);
      } catch {
        // MOCK DATA
        setDrivers(MOCK_DRIVERS);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const total   = drivers.length;
  const online  = drivers.filter((d) => d.status === 'online' || d.status === 'on-trip').length;
  const avgRating = total > 0 ? (drivers.reduce((s, d) => s + d.rating, 0) / total).toFixed(2) : '0.00';

  const handleAssign = () => {
    if (!assignTarget) return;
    setDrivers((prev) =>
      prev.map((d) => (d.id === assignTarget.id ? { ...d, vehicle_plate: assignPlate } : d))
    );
    setAssignTarget(null);
  };

  const handleUnassign = (id: string) => {
    setDrivers((prev) => prev.map((d) => (d.id === id ? { ...d, vehicle_plate: '' } : d)));
  };

  const toggleExpand = (id: string) => setExpandedId((cur) => (cur === id ? null : id));

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{t('drivers_title')}</h1>
        <p className="text-gray-500 mt-1">{t('drivers_subtitle')}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard title={`${t('th_name')}s Total`} value={total} icon={<Users size={20} />} color="blue" />
        <StatCard title={`${t('drivers_title')} Online`} value={online} icon={<Wifi size={20} />} color="green" />
        <StatCard title={`Avg ${t('th_rating')}`} value={avgRating} icon={<Star size={20} />} color="yellow" />
      </div>

      {/* Drivers Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-500">{t('loading')}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 w-4"></th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_name')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Phone</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_status')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_trips')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_rating')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('drivers_earnings')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_plate')}</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">{t('th_actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {drivers.map((d) => (
                  <React.Fragment key={d.id}>
                    <tr
                      className="hover:bg-gray-50 transition cursor-pointer"
                      onClick={() => toggleExpand(d.id)}
                    >
                      <td className="px-4 py-3 text-gray-400">
                        {expandedId === d.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{d.name}</td>
                      <td className="px-4 py-3 text-gray-600">{d.phone}</td>
                      <td className="px-4 py-3"><AlertBadge status={d.status} /></td>
                      <td className="px-4 py-3 text-gray-700">{d.trips_count}</td>
                      <td className="px-4 py-3"><StarRating value={d.rating} /></td>
                      <td className="px-4 py-3 text-gray-700">{d.earnings_month.toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{d.vehicle_plate || '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {d.vehicle_plate ? (
                          <button
                            onClick={() => handleUnassign(d.id)}
                            className="text-red-600 hover:text-red-800 font-medium text-xs"
                          >
                            {t('drivers_unassign')}
                          </button>
                        ) : (
                          <button
                            onClick={() => { setAssignTarget(d); setAssignPlate(MOCK_AVAILABLE_PLATES[0]); }}
                            className="text-blue-600 hover:text-blue-800 font-medium text-xs"
                          >
                            {t('drivers_assign_vehicle')}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedId === d.id && (
                      <tr className="bg-blue-50">
                        <td colSpan={9} className="px-8 py-4 text-sm text-gray-700">
                          <div className="flex flex-wrap gap-6">
                            <span><strong>ID:</strong> {d.id}</span>
                            <span><strong>Phone:</strong> {d.phone}</span>
                            <span><strong>{t('th_rating')}:</strong> {d.rating}</span>
                            <span><strong>{t('th_trips')}:</strong> {d.trips_count}</span>
                            <span><strong>{t('drivers_earnings')}:</strong> TZS {d.earnings_month.toLocaleString()}</span>
                            <span><strong>{t('th_plate')}:</strong> {d.vehicle_plate || '—'}</span>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Assign Vehicle Modal */}
      {assignTarget && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">{t('drivers_assign_vehicle')}</h2>
              <button onClick={() => setAssignTarget(null)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-3">Driver: <strong>{assignTarget.name}</strong></p>
            <select
              value={assignPlate}
              onChange={(e) => setAssignPlate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {MOCK_AVAILABLE_PLATES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setAssignTarget(null)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2 rounded-lg hover:bg-gray-50 transition"
              >
                {t('fleet_cancel')}
              </button>
              <button
                onClick={handleAssign}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition"
              >
                {t('fleet_save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drivers;

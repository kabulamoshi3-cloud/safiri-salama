/**
 * Reports Page
 * Four analytics sections powered by Recharts with mock data.
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

type Period = 'day' | 'week' | 'month';

// MOCK DATA — trip volume (last 30 days)
function makeTripVolume(period: Period) {
  const labels: string[] = [];
  const count = period === 'day' ? 24 : period === 'week' ? 7 : 30;
  for (let i = count - 1; i >= 0; i--) {
    if (period === 'day') {
      labels.push(`${i}h`);
    } else {
      const d = new Date();
      d.setDate(d.getDate() - i);
      labels.push(`${d.getDate()}/${d.getMonth() + 1}`);
    }
  }
  return labels.map((label) => ({
    label,
    trips: Math.floor(Math.random() * 30) + 5,
  }));
}

// MOCK DATA — top drivers
const TOP_DRIVERS = [
  { name: 'Fatuma Said',   trips: 421, rating: 4.7, revenue: 590000 },
  { name: 'Juma Ally',     trips: 312, rating: 4.8, revenue: 450000 },
  { name: 'Zainab Musa',   trips: 287, rating: 4.6, revenue: 425000 },
  { name: 'Amina Hassan',  trips: 245, rating: 4.5, revenue: 380000 },
  { name: 'Salim Mwangi',  trips: 198, rating: 4.2, revenue: 310000 },
];

// MOCK DATA — vehicle utilization
const VEHICLE_UTILIZATION = [
  { plate: 'T 123 AAA', trips: 421, utilization: 88 },
  { plate: 'T 456 BBB', trips: 312, utilization: 73 },
  { plate: 'T 654 EEE', trips: 287, utilization: 65 },
  { plate: 'T 321 DDD', trips: 245, utilization: 55 },
  { plate: 'T 789 CCC', trips: 198, utilization: 42 },
];

// MOCK DATA — revenue per vehicle
const REVENUE_PER_VEHICLE = VEHICLE_UTILIZATION.map((v) => ({
  plate: v.plate,
  revenue: Math.round(v.trips * 1400),
}));

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<Period>('month');
  const tripVolume = makeTripVolume(period);

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('reports_title')}</h1>
          <p className="text-gray-500 mt-1">{t('reports_subtitle')}</p>
        </div>
        {/* Period selector */}
        <div className="flex gap-2">
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                period === p
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* (1) Trip Volume */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('reports_trip_volume')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tripVolume} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="trips" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* (3) Vehicle Utilization */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('reports_vehicle_utilization')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={VEHICLE_UTILIZATION} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="plate" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
              <Tooltip formatter={(v) => [`${v}%`, 'Utilization']} />
              <Legend />
              <Bar dataKey="utilization" fill="#10b981" radius={[4, 4, 0, 0]} name="Utilization %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* (4) Revenue per Vehicle */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('reports_revenue_per_vehicle')}</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={REVENUE_PER_VEHICLE}
              layout="vertical"
              margin={{ top: 4, right: 16, left: 20, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="plate" tick={{ fontSize: 10 }} width={88} />
              <Tooltip formatter={(v) => [`TZS ${Number(v).toLocaleString()}`, 'Revenue']} />
              <Legend />
              <Bar dataKey="revenue" fill="#8b5cf6" radius={[0, 4, 4, 0]} name="Revenue (TZS)" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* (2) Top Performing Drivers Table */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">{t('reports_top_drivers')}</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-gray-600">{t('th_name')}</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">{t('th_trips')}</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">{t('th_rating')}</th>
                  <th className="text-right px-3 py-2 font-semibold text-gray-600">{t('th_amount')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {TOP_DRIVERS.map((d, i) => (
                  <tr key={d.name} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-gray-900 font-medium">
                      <span className="text-gray-400 mr-2">#{i + 1}</span>{d.name}
                    </td>
                    <td className="px-3 py-2 text-right text-gray-700">{d.trips}</td>
                    <td className="px-3 py-2 text-right text-yellow-500">⭐ {d.rating}</td>
                    <td className="px-3 py-2 text-right text-green-600">{d.revenue.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;

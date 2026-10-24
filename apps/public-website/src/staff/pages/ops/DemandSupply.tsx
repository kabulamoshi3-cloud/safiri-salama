import React from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';

const zones = [
  { zone: 'Kariakoo',    demand: 28, supply: 15, gap: 13 },
  { zone: 'Masaki',      demand: 18, supply: 12, gap: 6 },
  { zone: 'Ubungo',      demand: 22, supply: 20, gap: 2 },
  { zone: 'Mikocheni',   demand: 14, supply: 16, gap: -2 },
  { zone: 'City Center', demand: 35, supply: 18, gap: 17 },
];

export default function DemandSupply() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp size={24} className="text-blue-500" />
          {t('nav_demand_supply') || 'Demand & Supply'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Fleet capacity planning and demand analysis</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Demand</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{zones.reduce((a, z) => a + z.demand, 0)}</p>
          <p className="text-xs text-gray-400 mt-1">Active requests</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-sm text-gray-500">Total Supply</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{zones.reduce((a, z) => a + z.supply, 0)}</p>
          <p className="text-xs text-gray-400 mt-1">Available drivers</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-sm text-gray-500">Unmet Demand</p>
          <p className="text-2xl font-bold text-red-600 mt-1">{zones.filter(z => z.gap > 0).reduce((a, z) => a + z.gap, 0)}</p>
          <p className="text-xs text-gray-400 mt-1">Requests without drivers</p>
        </div>
      </div>

      {/* Zone breakdown */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4">Demand vs Supply by Zone</h2>
        <div className="space-y-4">
          {zones.map((z) => (
            <div key={z.zone}>
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">{z.zone}</span>
                <span className={`text-xs font-medium ${z.gap > 5 ? 'text-red-600' : z.gap > 0 ? 'text-yellow-600' : 'text-green-600'}`}>
                  {z.gap > 0 ? `+${z.gap} shortage` : `${Math.abs(z.gap)} surplus`}
                </span>
              </div>
              <div className="flex gap-2 items-center text-xs text-gray-500">
                <span className="w-16">Demand</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${(z.demand / 40) * 100}%` }} />
                </div>
                <span className="w-6 text-right">{z.demand}</span>
              </div>
              <div className="flex gap-2 items-center text-xs text-gray-500 mt-1">
                <span className="w-16">Supply</span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: `${(z.supply / 40) * 100}%` }} />
                </div>
                <span className="w-6 text-right">{z.supply}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* High demand zones table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold">High Demand Zones</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Zone','Demand','Supply','Gap','Priority'].map((h) => (
                <th key={h} className="text-left px-5 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {zones.sort((a, b) => b.gap - a.gap).map((z) => (
              <tr key={z.zone} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-5 py-3 font-medium">{z.zone}</td>
                <td className="px-5 py-3 text-blue-600 font-medium">{z.demand}</td>
                <td className="px-5 py-3 text-green-600 font-medium">{z.supply}</td>
                <td className="px-5 py-3">
                  <span className={`font-medium ${z.gap > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {z.gap > 0 ? `+${z.gap}` : z.gap}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    z.gap > 10 ? 'bg-red-100 text-red-700' : z.gap > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                  }`}>
                    {z.gap > 10 ? 'Critical' : z.gap > 0 ? 'Medium' : 'Normal'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

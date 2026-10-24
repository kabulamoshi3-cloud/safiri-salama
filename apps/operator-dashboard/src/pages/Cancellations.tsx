import React from 'react';
import { useTranslation } from 'react-i18next';
import { XCircle } from 'lucide-react';

const mockCancellations = [
  { id: 'TRP-1240', driver: 'James M.', passenger: 'John D.', cancelledBy: 'Passenger', reason: 'Driver too far', time: '10:45 AM', fareLost: 'Sh 0' },
  { id: 'TRP-1238', driver: 'Peter K.', passenger: 'Mary S.', cancelledBy: 'Driver',    reason: 'Vehicle issue', time: '10:20 AM', fareLost: 'Sh 8,500' },
  { id: 'TRP-1235', driver: 'Samuel O.',passenger: 'Ali H.',  cancelledBy: 'System',    reason: 'Timeout',       time: '09:55 AM', fareLost: 'Sh 0' },
];

export default function Cancellations() {
  const { t } = useTranslation();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <XCircle size={24} className="text-red-500" />
          {t('nav_cancellations') || 'Cancellations'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Cancelled trips analysis</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'By Passenger', value: mockCancellations.filter(c => c.cancelledBy === 'Passenger').length, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'By Driver',    value: mockCancellations.filter(c => c.cancelledBy === 'Driver').length,    color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'By System',    value: mockCancellations.filter(c => c.cancelledBy === 'System').length,    color: 'text-gray-600',   bg: 'bg-gray-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Trip ID','Driver','Passenger','Cancelled By','Reason','Time','Fare Lost','Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {mockCancellations.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{c.id}</td>
                <td className="px-4 py-3">{c.driver}</td>
                <td className="px-4 py-3">{c.passenger}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    c.cancelledBy === 'Passenger' ? 'bg-orange-100 text-orange-700' :
                    c.cancelledBy === 'Driver' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'
                  }`}>{c.cancelledBy}</span>
                </td>
                <td className="px-4 py-3 text-gray-600">{c.reason}</td>
                <td className="px-4 py-3 text-gray-500">{c.time}</td>
                <td className="px-4 py-3 font-medium">{c.fareLost}</td>
                <td className="px-4 py-3"><button className="text-xs text-blue-600 hover:underline">Review</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

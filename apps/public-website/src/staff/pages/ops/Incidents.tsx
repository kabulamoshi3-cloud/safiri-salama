import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';

const mockIncidents = [
  { id: 'INC-001', tripId: 'TRP-1100', driver: 'James M.', passenger: 'John D.', type: 'Safety Report',  severity: 'High',   status: 'Open',     reported: '2 hours ago' },
  { id: 'INC-002', tripId: 'TRP-1095', driver: 'Peter K.', passenger: 'Mary S.', type: 'Vehicle Issue',  severity: 'Medium', status: 'In Review', reported: '4 hours ago' },
  { id: 'INC-003', tripId: 'TRP-1088', driver: 'Samuel O.',passenger: 'Ali H.',  type: 'Route Dispute',  severity: 'Low',    status: 'Resolved', reported: '1 day ago' },
];

const severityStyle: Record<string, string> = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-yellow-100 text-yellow-700',
  Low:    'bg-green-100 text-green-700',
  Critical:'bg-purple-100 text-purple-700',
};

const statusStyle: Record<string, string> = {
  Open:       'bg-red-50 text-red-600',
  'In Review':'bg-blue-50 text-blue-600',
  Resolved:   'bg-green-50 text-green-600',
};

export default function Incidents() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? mockIncidents : mockIncidents.filter((i) =>
    filter === 'open' ? i.status === 'Open' : filter === 'resolved' ? i.status === 'Resolved' : true
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle size={24} className="text-orange-500" />
          {t('nav_incidents') || 'Incidents'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Safety incidents and reports</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open',      value: mockIncidents.filter(i => i.status === 'Open').length,       color: 'text-red-600',    bg: 'bg-red-50' },
          { label: 'In Review', value: mockIncidents.filter(i => i.status === 'In Review').length,  color: 'text-blue-600',   bg: 'bg-blue-50' },
          { label: 'Resolved',  value: mockIncidents.filter(i => i.status === 'Resolved').length,   color: 'text-green-600',  bg: 'bg-green-50' },
          { label: 'Total',     value: mockIncidents.length,                                         color: 'text-gray-700',   bg: 'bg-gray-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all','All'],['open','Open'],['resolved','Resolved']].map(([val,label]) => (
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
              {['Incident ID','Trip ID','Driver','Passenger','Type','Severity','Status','Reported','Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((inc) => (
              <tr key={inc.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{inc.id}</td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">{inc.tripId}</td>
                <td className="px-4 py-3">{inc.driver}</td>
                <td className="px-4 py-3">{inc.passenger}</td>
                <td className="px-4 py-3">{inc.type}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${severityStyle[inc.severity]}`}>{inc.severity}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[inc.status]}`}>{inc.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{inc.reported}</td>
                <td className="px-4 py-3"><button className="text-xs text-blue-600 hover:underline">Review</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No incidents found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

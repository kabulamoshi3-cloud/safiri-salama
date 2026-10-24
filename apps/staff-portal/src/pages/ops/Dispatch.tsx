import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Radio, User, Clock, CheckCircle } from 'lucide-react';

export default function Dispatch() {
  const { t } = useTranslation();
  const [selectedRequest, setSelectedRequest] = useState('');
  const [selectedDriver, setSelectedDriver] = useState('');

  const pendingRequests = [
    { id: 'REQ-001', passenger: 'John Doe', pickup: 'Kariakoo Market', destination: 'Masaki', time: '2 min ago' },
    { id: 'REQ-002', passenger: 'Mary Smith', pickup: 'Ubungo Terminal', destination: 'Airport', time: '4 min ago' },
    { id: 'REQ-003', passenger: 'Ali Hassan', pickup: 'Mlimani City', destination: 'Mikocheni', time: '6 min ago' },
  ];

  const availableDrivers = [
    { id: 'DRV-001', name: 'James Mwangi', vehicle: 'T 123 ABC', distance: '0.5 km', rating: 4.9 },
    { id: 'DRV-002', name: 'Peter Kimani', vehicle: 'T 456 DEF', distance: '1.2 km', rating: 4.7 },
    { id: 'DRV-003', name: 'Samuel Osei', vehicle: 'T 789 GHI', distance: '1.8 km', rating: 4.8 },
  ];

  const dispatchHistory = [
    { id: '#D-045', request: 'REQ-098', driver: 'James M.', time: '10:32 AM', status: 'Accepted' },
    { id: '#D-044', request: 'REQ-097', driver: 'Peter K.', time: '10:28 AM', status: 'Accepted' },
    { id: '#D-043', request: 'REQ-096', driver: 'Samuel O.', time: '10:21 AM', status: 'Rejected' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('dispatch_title') || 'Dispatch Center'}</h1>
        <p className="text-gray-500 text-sm mt-1">{t('dispatch_subtitle') || 'Manual trip assignment and driver coordination'}</p>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {[
          { label: 'Pending Requests', value: pendingRequests.length, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Available Drivers', value: availableDrivers.length, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Dispatched Today', value: 45, color: 'text-blue-600', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} rounded-xl p-5`}>
            <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Pending Requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock size={18} className="text-red-500" /> Pending Requests
          </h2>
          <div className="space-y-3">
            {pendingRequests.map((req) => (
              <div
                key={req.id}
                onClick={() => setSelectedRequest(req.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                  selectedRequest === req.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-xs font-mono text-gray-400">{req.id}</span>
                  <span className="text-xs text-gray-400">{req.time}</span>
                </div>
                <p className="text-sm font-medium">{req.passenger}</p>
                <p className="text-xs text-gray-500">📍 {req.pickup} → {req.destination}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Available Drivers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User size={18} className="text-green-500" /> Available Drivers
          </h2>
          <div className="space-y-3">
            {availableDrivers.map((drv) => (
              <div
                key={drv.id}
                onClick={() => setSelectedDriver(drv.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition ${
                  selectedDriver === drv.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium">{drv.name}</span>
                  <span className="text-xs text-yellow-500">⭐ {drv.rating}</span>
                </div>
                <p className="text-xs text-gray-500">{drv.vehicle} • {drv.distance} away</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Manual Assignment */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Radio size={18} className="text-blue-500" /> Manual Assignment
        </h2>
        <div className="grid grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Request</label>
            <select
              value={selectedRequest}
              onChange={(e) => setSelectedRequest(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <option value="">Choose request...</option>
              {pendingRequests.map((r) => <option key={r.id} value={r.id}>{r.id} — {r.passenger}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Driver</label>
            <select
              value={selectedDriver}
              onChange={(e) => setSelectedDriver(e.target.value)}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm"
            >
              <option value="">Choose driver...</option>
              {availableDrivers.map((d) => <option key={d.id} value={d.id}>{d.name} — {d.vehicle}</option>)}
            </select>
          </div>
          <button
            disabled={!selectedRequest || !selectedDriver}
            className="bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            Dispatch Now
          </button>
        </div>
      </div>

      {/* Dispatch History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <CheckCircle size={18} className="text-gray-400" /> Dispatch History
        </h2>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-100">
              <th className="text-left pb-3 font-medium">Dispatch ID</th>
              <th className="text-left pb-3 font-medium">Request</th>
              <th className="text-left pb-3 font-medium">Driver</th>
              <th className="text-left pb-3 font-medium">Time</th>
              <th className="text-left pb-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {dispatchHistory.map((d) => (
              <tr key={d.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-3 font-mono text-xs">{d.id}</td>
                <td className="py-3">{d.request}</td>
                <td className="py-3">{d.driver}</td>
                <td className="py-3 text-gray-500">{d.time}</td>
                <td className="py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    d.status === 'Accepted' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

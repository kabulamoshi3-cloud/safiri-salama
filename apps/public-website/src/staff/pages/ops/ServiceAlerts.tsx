import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Plus } from 'lucide-react';

const mockAlerts = [
  { id: 1, type: 'Traffic',     message: 'Heavy traffic on Nyerere Road — expect 30% longer ETAs', target: 'All Drivers',     status: 'Active',   created: '10 min ago', expires: '2 hours' },
  { id: 2, type: 'System',      message: 'Scheduled maintenance tonight 11PM – 2AM',                target: 'All',            status: 'Active',   created: '1 hour ago', expires: '8 hours' },
  { id: 3, type: 'Weather',     message: 'Heavy rain warning: Drive carefully in Kinondoni area',   target: 'All Drivers',     status: 'Active',   created: '3 hours ago',expires: '4 hours' },
  { id: 4, type: 'Maintenance', message: 'GPS tracking may be intermittent for the next 30 mins',  target: 'All',            status: 'Expired',  created: 'Yesterday',   expires: 'Expired' },
];

const typeStyle: Record<string, string> = {
  Traffic: 'bg-orange-100 text-orange-700', System: 'bg-blue-100 text-blue-700',
  Weather: 'bg-purple-100 text-purple-700', Maintenance: 'bg-gray-100 text-gray-700',
};

export default function ServiceAlerts() {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'Traffic', message: '', target: 'All', expires: '1' });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell size={24} className="text-blue-500" />
            {t('nav_service_alerts') || 'Service Alerts'}
          </h1>
          <p className="text-gray-500 text-sm mt-1">System notifications and service broadcasts</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
        >
          <Plus size={16} /> New Alert
        </button>
      </div>

      {/* Create Alert Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="text-lg font-semibold mb-4">Create Service Alert</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alert Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm">
                {['Traffic','Weather','System','Maintenance'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Audience</label>
              <select value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })}
                className="w-full border border-gray-200 rounded-lg p-2.5 text-sm">
                {['All','All Drivers','All Passengers','Specific Area'].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
            <textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="Enter alert message..." rows={3}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm resize-none" />
          </div>
          <div className="flex gap-3">
            <button className="bg-blue-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">Publish Alert</button>
            <button onClick={() => setShowForm(false)} className="bg-gray-100 text-gray-600 px-6 py-2 rounded-lg text-sm font-medium hover:bg-gray-200">Cancel</button>
          </div>
        </div>
      )}

      {/* Alerts list */}
      <div className="space-y-3">
        {mockAlerts.map((alert) => (
          <div key={alert.id} className={`bg-white rounded-xl shadow-sm border ${alert.status === 'Active' ? 'border-blue-100' : 'border-gray-100'} p-5`}>
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3 flex-1">
                <span className={`px-2 py-1 rounded-full text-xs font-medium mt-0.5 ${typeStyle[alert.type]}`}>{alert.type}</span>
                <div className="flex-1">
                  <p className={`font-medium ${alert.status === 'Expired' ? 'text-gray-400' : 'text-gray-800'}`}>{alert.message}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>🎯 {alert.target}</span>
                    <span>🕐 {alert.created}</span>
                    <span>⏱ Expires: {alert.expires}</span>
                  </div>
                </div>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ml-4 ${alert.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {alert.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

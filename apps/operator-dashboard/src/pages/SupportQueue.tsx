import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare } from 'lucide-react';

const mockTickets = [
  { id: 'TKT-001', requester: 'John Doe',   type: 'Passenger', subject: 'Overcharged on trip',        priority: 'High',   status: 'Open',        created: '30 min ago', assignedTo: 'Unassigned' },
  { id: 'TKT-002', requester: 'James M.',   type: 'Driver',    subject: 'App crash during active trip', priority: 'High',   status: 'In Progress', created: '1 hour ago', assignedTo: 'Agent 1' },
  { id: 'TKT-003', requester: 'Mary Smith', type: 'Passenger', subject: 'Driver was rude',              priority: 'Medium', status: 'Open',        created: '2 hours ago',assignedTo: 'Unassigned' },
  { id: 'TKT-004', requester: 'Peter K.',   type: 'Driver',    subject: 'Payment not received',         priority: 'Medium', status: 'Resolved',    created: 'Yesterday',  assignedTo: 'Agent 2' },
];

const priorityStyle: Record<string, string> = {
  High: 'bg-red-100 text-red-700', Medium: 'bg-yellow-100 text-yellow-700', Low: 'bg-gray-100 text-gray-700',
};
const statusStyle: Record<string, string> = {
  Open: 'bg-red-50 text-red-600', 'In Progress': 'bg-blue-50 text-blue-600', Resolved: 'bg-green-50 text-green-600',
};

export default function SupportQueue() {
  const { t } = useTranslation();
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all' ? mockTickets : mockTickets.filter((tk) =>
    filter === 'open' ? tk.status === 'Open' :
    filter === 'progress' ? tk.status === 'In Progress' :
    tk.status === 'Resolved'
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <MessageSquare size={24} className="text-blue-500" />
          {t('nav_support_queue') || 'Support Queue'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">Operator support tickets and case management</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Open',        value: mockTickets.filter(t => t.status === 'Open').length,        bg: 'bg-red-50',   color: 'text-red-600' },
          { label: 'In Progress', value: mockTickets.filter(t => t.status === 'In Progress').length, bg: 'bg-blue-50',  color: 'text-blue-600' },
          { label: 'Resolved',    value: mockTickets.filter(t => t.status === 'Resolved').length,    bg: 'bg-green-50', color: 'text-green-600' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-xl p-4`}>
            <p className="text-sm text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold ${s.color} mt-1`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-4">
        {[['all','All'],['open','Open'],['progress','In Progress'],['resolved','Resolved']].map(([v,l]) => (
          <button key={v} onClick={() => setFilter(v)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${
              filter === v ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}>{l}</button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['Ticket ID','Requester','Type','Subject','Priority','Status','Created','Assigned To','Actions'].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-medium text-gray-600">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((tk) => (
              <tr key={tk.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{tk.id}</td>
                <td className="px-4 py-3 font-medium">{tk.requester}</td>
                <td className="px-4 py-3 text-gray-500">{tk.type}</td>
                <td className="px-4 py-3">{tk.subject}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${priorityStyle[tk.priority]}`}>{tk.priority}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyle[tk.status]}`}>{tk.status}</span></td>
                <td className="px-4 py-3 text-gray-500">{tk.created}</td>
                <td className="px-4 py-3 text-gray-500">{tk.assignedTo}</td>
                <td className="px-4 py-3"><button className="text-xs text-blue-600 hover:underline">Open</button></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={9} className="px-4 py-10 text-center text-gray-400">No tickets found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

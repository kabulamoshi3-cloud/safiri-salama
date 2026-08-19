/**
 * Documents Page — driver licence, insurance, vehicle docs management
 */

import React, { useState } from 'react';
import { FileText, Upload, CheckCircle, AlertCircle, Clock } from 'lucide-react';

interface Document {
  id: string;
  name: string;
  status: 'verified' | 'pending' | 'expired' | 'missing';
  expires_at?: string;
  uploaded_at?: string;
}

const mockDocuments: Document[] = [
  { id: '1', name: "Driver's Licence",    status: 'verified',  expires_at: '2027-06-15', uploaded_at: '2024-01-10' },
  { id: '2', name: 'Vehicle Registration', status: 'verified',  expires_at: '2025-12-01', uploaded_at: '2024-01-10' },
  { id: '3', name: 'Insurance Certificate',status: 'pending',   expires_at: '2025-09-30', uploaded_at: '2024-07-20' },
  { id: '4', name: 'PSV Badge',            status: 'expired',   expires_at: '2024-03-01', uploaded_at: '2022-03-01' },
  { id: '5', name: 'Good Conduct',         status: 'missing' },
];

const statusConfig = {
  verified: { color: 'text-green-600',  bg: 'bg-green-50',  border: 'border-green-200', icon: CheckCircle,   label: 'Verified'  },
  pending:  { color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200',icon: Clock,         label: 'Pending'   },
  expired:  { color: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200',   icon: AlertCircle,   label: 'Expired'   },
  missing:  { color: 'text-gray-500',   bg: 'bg-gray-50',   border: 'border-gray-200',  icon: FileText,      label: 'Missing'   },
};

const Documents: React.FC = () => {
  const [docs, setDocs] = useState<Document[]>(mockDocuments);
  const [uploading, setUploading] = useState<string | null>(null);

  const handleUpload = async (docId: string) => {
    setUploading(docId);
    // Simulate upload delay
    await new Promise((r) => setTimeout(r, 1500));
    setDocs((prev) =>
      prev.map((d) =>
        d.id === docId
          ? { ...d, status: 'pending', uploaded_at: new Date().toISOString().split('T')[0] }
          : d
      )
    );
    setUploading(null);
  };

  const verified = docs.filter((d) => d.status === 'verified').length;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Documents</h1>
        <p className="text-gray-600 mt-2">Keep your documents up to date to stay active</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {(['verified','pending','expired','missing'] as const).map((s) => {
          const count = docs.filter((d) => d.status === s).length;
          const cfg   = statusConfig[s];
          const Icon  = cfg.icon;
          return (
            <div key={s} className={`rounded-lg border p-4 ${cfg.bg} ${cfg.border}`}>
              <Icon className={cfg.color} size={20} />
              <p className="text-2xl font-bold mt-2 text-gray-900">{count}</p>
              <p className={`text-sm font-semibold ${cfg.color}`}>{cfg.label}</p>
            </div>
          );
        })}
      </div>

      {/* Progress Banner */}
      <div className="bg-white rounded-lg shadow p-4 mb-8">
        <div className="flex justify-between mb-2">
          <span className="font-semibold text-gray-700">Document Completion</span>
          <span className="text-sm text-gray-600">{verified}/{docs.length} verified</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all"
            style={{ width: `${(verified / docs.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Document Cards */}
      <div className="space-y-4">
        {docs.map((doc) => {
          const cfg  = statusConfig[doc.status];
          const Icon = cfg.icon;
          const isExpiringSoon =
            doc.expires_at &&
            new Date(doc.expires_at) < new Date(Date.now() + 30 * 86400000);

          return (
            <div
              key={doc.id}
              className={`bg-white rounded-lg shadow border ${cfg.border} p-5 flex items-center justify-between`}
            >
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-lg ${cfg.bg}`}>
                  <Icon className={cfg.color} size={22} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{doc.name}</p>
                  <div className="flex gap-4 text-xs text-gray-500 mt-1">
                    {doc.uploaded_at && <span>Uploaded: {doc.uploaded_at}</span>}
                    {doc.expires_at && (
                      <span className={isExpiringSoon ? 'text-red-600 font-semibold' : ''}>
                        Expires: {doc.expires_at}
                        {isExpiringSoon && ' ⚠'}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>
                {(doc.status === 'missing' || doc.status === 'expired') && (
                  <button
                    onClick={() => handleUpload(doc.id)}
                    disabled={uploading === doc.id}
                    className="flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-60"
                  >
                    {uploading === doc.id ? (
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    ) : (
                      <Upload size={14} />
                    )}
                    Upload
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Documents;

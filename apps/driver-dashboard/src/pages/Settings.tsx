/**
 * Settings Page — notifications, language, account actions
 */

import React, { useState } from 'react';
import { Bell, Globe, Lock, LogOut, Trash2 } from 'lucide-react';
import { useAuthStore } from '../store/auth';

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
      checked ? 'bg-blue-600' : 'bg-gray-300'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const Settings: React.FC = () => {
  const { logout } = useAuthStore();
  const [notifs, setNotifs] = useState({
    trip_requests:  true,
    earnings:       true,
    promotions:     false,
    system_updates: true,
  });
  const [language, setLanguage]     = useState('en');
  const [showDelete, setShowDelete] = useState(false);

  const toggleNotif = (key: keyof typeof notifs) =>
    setNotifs((n) => ({ ...n, [key]: !n[key] }));

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-2">Manage your account preferences</p>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Bell size={18} /> Notifications
        </h2>
        <div className="space-y-4">
          {(Object.keys(notifs) as (keyof typeof notifs)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-700 capitalize">{key.replace(/_/g, ' ')}</span>
              <Toggle checked={notifs[key]} onChange={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* Language */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Globe size={18} /> Language
        </h2>
        <select
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
        >
          <option value="en">English</option>
          <option value="sw">Swahili</option>
        </select>
      </div>

      {/* Security */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Lock size={18} /> Security
        </h2>
        <button className="w-full border border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition">
          Change Password
        </button>
      </div>

      {/* Account Actions */}
      <div className="bg-white rounded-lg shadow p-6 space-y-3">
        <h2 className="text-lg font-bold mb-4">Account</h2>

        <button
          onClick={logout}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg transition"
        >
          <LogOut size={18} />
          Log Out
        </button>

        <button
          onClick={() => setShowDelete(true)}
          className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-lg transition"
        >
          <Trash2 size={18} />
          Delete Account
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Account?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete your driver account and all data. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="flex-1 border border-gray-300 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-semibold transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;

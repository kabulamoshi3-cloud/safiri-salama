/**
 * Profile Page — driver personal info and vehicle details
 */

import React, { useState } from 'react';
import { User, Car, Phone, Mail, Star, Save } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import api from '../services/api';

const Profile: React.FC = () => {
  const { driver } = useAuthStore();
  const [form, setForm] = useState({
    name:          driver?.name ?? '',
    phone_number:  driver?.phone_number ?? '',
    email:         driver?.email ?? '',
    vehicle_plate: driver?.vehicle_plate ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/drivers/me', form);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        <p className="text-gray-600 mt-2">Update your personal and vehicle information</p>
      </div>

      {/* Avatar & Rating */}
      <div className="bg-white rounded-lg shadow p-6 mb-6 flex items-center gap-5">
        <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
          {form.name.charAt(0).toUpperCase() || 'D'}
        </div>
        <div>
          <p className="text-xl font-bold text-gray-900">{form.name || 'Driver'}</p>
          <div className="flex items-center gap-2 mt-1">
            <Star size={16} className="text-yellow-500 fill-yellow-500" />
            <span className="font-semibold">{driver?.rating ?? 'N/A'}</span>
            <span className="text-sm text-gray-500">rating</span>
          </div>
          <span className={`inline-block mt-2 text-xs font-semibold px-2 py-1 rounded-full ${
            driver?.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
          }`}>
            {driver?.status ?? 'inactive'}
          </span>
        </div>
      </div>

      {/* Personal Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <User size={18} /> Personal Information
        </h2>
        <div className="space-y-4">
          {[
            { label: 'Full Name',     name: 'name',         icon: User,  type: 'text'  },
            { label: 'Phone Number',  name: 'phone_number', icon: Phone, type: 'tel'   },
            { label: 'Email Address', name: 'email',        icon: Mail,  type: 'email' },
          ].map(({ label, name, icon: Icon, type }) => (
            <div key={name}>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500">
                <Icon size={16} className="text-gray-400" />
                <input
                  type={type}
                  name={name}
                  value={(form as any)[name]}
                  onChange={handleChange}
                  className="flex-1 outline-none text-gray-900 bg-transparent"
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vehicle Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Car size={18} /> Vehicle Information
        </h2>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Number Plate</label>
          <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-3 py-2 focus-within:border-blue-500">
            <Car size={16} className="text-gray-400" />
            <input
              type="text"
              name="vehicle_plate"
              value={form.vehicle_plate}
              onChange={handleChange}
              placeholder="e.g. KCA 123X"
              className="flex-1 outline-none text-gray-900 bg-transparent uppercase"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
      >
        {saving ? (
          <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
        ) : (
          <Save size={18} />
        )}
        {saved ? 'Saved!' : 'Save Changes'}
      </button>
    </div>
  );
};

export default Profile;

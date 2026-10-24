/**
 * Settings Page — Fleet info, commission, notifications, language, account
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Truck, Percent, Bell, Globe, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import i18n from '../../i18n/index';
import api from '../../services/api';

const Toggle: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
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
  const { t } = useTranslation();
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  // (1) Fleet Info
  const [fleetName,   setFleetName]   = useState('');
  const [contactEmail, setContactEmail] = useState(userProfile?.email ?? '');
  const [contactPhone, setContactPhone] = useState(userProfile?.phone ?? '');
  const [fleetSaved,  setFleetSaved]  = useState(false);

  const saveFleet = async () => {
    try {
      await api.patch('/auth/me', { fleet_name: fleetName, email: contactEmail, phone: contactPhone });
    } catch {
      // MOCK DATA — save locally only
    }
    setFleetSaved(true);
    setTimeout(() => setFleetSaved(false), 2000);
  };

  // (3) Notifications
  const [notifs, setNotifs] = useState({
    trip_alerts:            true,
    daily_summary:          true,
    payment_notifications:  true,
    system_updates:         false,
  });
  const toggleNotif = (key: keyof typeof notifs) =>
    setNotifs((n) => ({ ...n, [key]: !n[key] }));

  // (4) Language
  const [language, setLanguage] = useState(i18n.language ?? 'en');
  const handleLanguageChange = (val: string) => {
    setLanguage(val);
    i18n.changeLanguage(val);
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{t('settings_title')}</h1>
      </div>

      {/* (1) Fleet Info */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Truck size={18} /> {t('settings_fleet_name')}
        </h2>
        <div className="space-y-3">
          <label className="block">
            <span className="text-sm font-medium text-gray-700">{t('settings_fleet_name')}</span>
            <input
              type="text"
              value={fleetName}
              onChange={(e) => setFleetName(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">Email</span>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-gray-700">{t('settings_contact')}</span>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            />
          </label>
        </div>
        <button
          onClick={saveFleet}
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm transition"
        >
          {fleetSaved ? '✓ Saved' : t('settings_save')}
        </button>
      </div>

      {/* (2) Commission Rate — read-only */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
          <Percent size={18} /> {t('settings_commission_rate')}
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-3xl font-bold text-gray-900">15%</span>{/* MOCK DATA commission rate */}
          <span className="text-sm text-gray-500">— rates are set by Safiri Haraka admin and cannot be changed here.</span>
        </div>
      </div>

      {/* (3) Notifications */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Bell size={18} /> {t('settings_notifications')}
        </h2>
        <div className="space-y-4">
          {(Object.keys(notifs) as (keyof typeof notifs)[]).map((key) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-gray-700 text-sm capitalize">{key.replace(/_/g, ' ')}</span>
              <Toggle checked={notifs[key]} onChange={() => toggleNotif(key)} />
            </div>
          ))}
        </div>
      </div>

      {/* (4) Language */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Globe size={18} /> {t('settings_language')}
        </h2>
        <select
          value={language}
          onChange={(e) => handleLanguageChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
        >
          <option value="en">English</option>
          <option value="sw">Swahili</option>
        </select>
      </div>

      {/* (5) Account */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-bold mb-4">Account</h2>
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-3 rounded-lg transition"
        >
          <LogOut size={18} />
          {t('nav_logout')}
        </button>
      </div>
    </div>
  );
};

export default Settings;

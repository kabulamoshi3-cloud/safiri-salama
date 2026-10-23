/**
 * Profile Page — account info, subscription badge, referral, logout
 */

import React, { useState } from 'react';
import { User, Phone, Mail, Star, Gift, Crown, LogOut, ChevronRight, Copy, Check } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const ProfilePage: React.FC = () => {
  const { user, subscription, logout } = useAuthStore();
  const navigate = useNavigate();
  const [referralCode, setReferralCode]   = useState<string | null>(null);
  const [copied,       setCopied]         = useState(false);
  const [loadingRef,   setLoadingRef]     = useState(false);

  const fetchReferralCode = async () => {
    setLoadingRef(true);
    try {
      const res = await api.post('/referral/generate-link');
      setReferralCode(res.data.referral_code);
    } catch {
      alert('Could not generate referral link');
    } finally {
      setLoadingRef(false);
    }
  };

  const copyCode = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuItems = [
    { label: 'My Trips',     path: '/trips'    },
    { label: 'My Wallet',    path: '/wallet'   },
    { label: 'Subscription', path: '/subscribe'},
    { label: 'Support',      path: '/support'  },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Profile</h1>

      {/* User Card */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
          {user?.name?.charAt(0).toUpperCase() ?? 'U'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-bold text-gray-900">{user?.name ?? 'User'}</p>
          <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
            <Phone size={13} /> +255{user?.phone_number}
          </p>
          {user?.email && (
            <p className="text-sm text-gray-500 flex items-center gap-1">
              <Mail size={13} /> {user.email}
            </p>
          )}
        </div>
        {user?.rating && (
          <div className="flex items-center gap-1 text-yellow-500">
            <Star size={16} className="fill-yellow-500" />
            <span className="font-bold text-gray-800">{user.rating}</span>
          </div>
        )}
      </div>

      {/* Subscription Badge */}
      {subscription?.has_subscription ? (
        <div className="bg-gradient-to-r from-yellow-400 to-orange-400 rounded-xl p-4 flex items-center gap-3 text-white">
          <Crown size={28} />
          <div>
            <p className="font-bold text-lg">{subscription.plan_name}</p>
            <p className="text-yellow-100 text-sm">{subscription.discount_percentage}% off all rides · renews {new Date(subscription.renews_at).toLocaleDateString()}</p>
          </div>
        </div>
      ) : (
        <button
          onClick={() => navigate('/subscribe')}
          className="w-full border-2 border-dashed border-yellow-400 rounded-xl p-4 flex items-center justify-between hover:bg-yellow-50 transition"
        >
          <div className="flex items-center gap-3">
            <Crown size={24} className="text-yellow-500" />
            <div className="text-left">
              <p className="font-bold text-gray-900">Upgrade to SafiriSalama Plus</p>
              <p className="text-sm text-gray-500">Get 10% off every ride</p>
            </div>
          </div>
          <ChevronRight size={18} className="text-gray-400" />
        </button>
      )}

      {/* Referral */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-5">
        <h2 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
          <Gift size={18} className="text-blue-600" /> Refer & Earn
        </h2>
        <p className="text-sm text-gray-600 mb-4">
          Invite a friend. They get <strong>Sh5,000</strong> off their first ride, you get <strong>Sh2,500</strong> credit.
        </p>
        {referralCode ? (
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-lg px-4 py-2 font-mono font-bold text-gray-900 text-sm tracking-widest">
              {referralCode}
            </div>
            <button
              onClick={copyCode}
              className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition"
            >
              {copied ? <Check size={18} /> : <Copy size={18} />}
            </button>
          </div>
        ) : (
          <button
            onClick={fetchReferralCode}
            disabled={loadingRef}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 rounded-lg transition"
          >
            {loadingRef ? 'Generating...' : 'Get My Referral Code'}
          </button>
        )}
      </div>

      {/* Menu */}
      <div className="bg-white rounded-xl shadow border border-gray-100 divide-y divide-gray-100">
        {menuItems.map(({ label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition"
          >
            <span className="font-semibold text-gray-800">{label}</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 font-semibold py-3 rounded-xl transition"
      >
        <LogOut size={18} /> Log Out
      </button>
    </div>
  );
};

export default ProfilePage;

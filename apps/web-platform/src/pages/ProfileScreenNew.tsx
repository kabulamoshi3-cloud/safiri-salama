/**
 * Screen 9: Profile & Settings
 * User card + menu list
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  CheckCircle,
  ChevronRight,
  CreditCard,
  Gift,
  HelpCircle,
  Settings,
  Info,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { i18n } from '../i18n';

const ProfileScreenNew: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const menuItems = [
    { icon: User, label: 'My Rides', path: '/trips' },
    { icon: CreditCard, label: 'Payment Methods', path: '/wallet' },
    { icon: Gift, label: 'Promotions & Rewards', path: '/promotions' },
    { icon: HelpCircle, label: 'Help & Support', path: '/support' },
    { icon: Settings, label: 'Settings', path: '/settings' },
    { icon: Info, label: 'About Safiri Haraka', path: '/about' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/splash');
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9] pb-24">
      {/* User Card */}
      <div className="bg-white p-6 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 bg-[#2563EB] rounded-full flex items-center justify-center text-white text-3xl font-bold">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-[#0F172A] font-black text-xl">{user?.name || 'User'}</h2>
              <div className="bg-[#128901] text-white text-xs font-bold px-2 py-0.5 rounded flex items-center gap-1">
                <CheckCircle size={12} />
                Verified
              </div>
            </div>
            <div className="flex items-center gap-2 text-gray-600 text-sm">
              <Phone size={14} />
              <span>+255 {user?.phone_number}</span>
            </div>
            {user?.email && (
              <div className="flex items-center gap-2 text-gray-600 text-sm mt-1">
                <Mail size={14} />
                <span>{user.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Menu List */}
      <div className="mt-4 mx-4 bg-white rounded-2xl shadow-sm overflow-hidden divide-y divide-gray-100">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition"
          >
            <item.icon size={20} className="text-gray-600" />
            <span className="flex-1 text-left text-[#0F172A] font-semibold">{item.label}</span>
            <ChevronRight size={18} className="text-gray-400" />
          </button>
        ))}
      </div>

      {/* Logout */}
      <div className="mt-4 mx-4">
        <button
          onClick={handleLogout}
          className="w-full bg-white hover:bg-red-50 border-2 border-red-500 text-red-500 font-bold py-4 rounded-2xl transition flex items-center justify-center gap-2 shadow-sm"
        >
          <LogOut size={20} />
          Log Out
        </button>
      </div>
    </div>
  );
};

export default ProfileScreenNew;

/**
 * Bottom Navigation
 * 4 tabs + Footer with Admin & Operator links
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Car, Clock, User, Shield, Building2 } from 'lucide-react';

const BottomNav: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'home', label: 'Home', icon: Home, path: '/' },
    { id: 'ride', label: 'Ride', icon: Car, path: '/book' },
    { id: 'activity', label: 'Activity', icon: Clock, path: '/trips' },
    { id: 'profile', label: 'Profile', icon: User, path: '/profile' },
  ];

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_10px_rgba(0,0,0,0.1)] z-50">
      {/* Main Navigation Tabs */}
      <div className="flex items-center justify-around px-4 py-3 border-b border-gray-100">
        {tabs.map((tab) => {
          const active = isActive(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className="flex flex-col items-center gap-1 flex-1 transition-colors"
            >
              <Icon
                size={24}
                className={active ? 'text-[#2563EB]' : 'text-gray-400'}
                strokeWidth={active ? 2.5 : 2}
              />
              <span
                className={`text-xs font-semibold ${
                  active ? 'text-[#2563EB]' : 'text-gray-500'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Links */}
      <div className="flex items-center justify-center gap-6 px-4 py-2 bg-gray-50">
        <a
          href="https://admin-panel-pi-ebon.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-[#2563EB] transition-colors"
        >
          <Shield size={14} />
          <span>Admin Panel</span>
        </a>
        <span className="text-gray-300">|</span>
        <a
          href="https://operator-dashboard.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-gray-600 hover:text-[#2563EB] transition-colors"
        >
          <Building2 size={14} />
          <span>Operator Dashboard</span>
        </a>
      </div>
    </nav>
  );
};

export default BottomNav;

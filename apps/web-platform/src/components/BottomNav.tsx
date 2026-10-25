/**
 * Bottom Navigation
 * 4 tabs: Home, Ride, Activity, Profile
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Car, Clock, User } from 'lucide-react';

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
      <div className="flex items-center justify-around px-4 py-3">
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
    </nav>
  );
};

export default BottomNav;

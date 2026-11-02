/**
 * Bottom Navigation — SkyRex Passenger App
 * 4 tabs: Home | Ride | Activity | Profile
 * Hidden on full-screen flows: book, searching, active-trip, trip-complete, splash, login, auth
 */
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Car, Clock, User, Bell } from 'lucide-react';

// Routes where BottomNav should NOT appear (full-screen flows)
const HIDDEN_ROUTES = [
  '/book', '/searching', '/active-trip', '/trip-complete',
  '/splash', '/login', '/auth',
];

const BottomNav: React.FC = () => {
  const navigate  = useNavigate();
  const location  = useLocation();

  // Hide on full-screen routes
  if (HIDDEN_ROUTES.some(r => location.pathname.startsWith(r))) return null;

  const tabs = [
    { id: 'home',          label: 'Home',     icon: Home,  path: '/' },
    { id: 'ride',          label: 'Ride',      icon: Car,   path: '/',    action: 'book' },
    { id: 'activity',      label: 'Activity',  icon: Clock, path: '/trips' },
    { id: 'notifications', label: 'Alerts',    icon: Bell,  path: '/notifications' },
    { id: 'profile',       label: 'Profile',   icon: User,  path: '/profile' },
  ];

  const isActive = (tab: typeof tabs[0]) => {
    if (tab.id === 'home') return location.pathname === '/';
    if (tab.id === 'ride') return false; // never "active" — it's an action button
    return location.pathname.startsWith(tab.path);
  };

  const handleTab = (tab: typeof tabs[0]) => {
    if (tab.action === 'book') {
      // Scroll top booking input into focus instead of navigating blindly to /book
      // /book requires pickup+dropoff — send user to home to enter destination
      navigate('/');
      // Small delay then focus the destination input
      setTimeout(() => {
        const input = document.querySelector<HTMLInputElement>('input[placeholder]');
        if (input) input.focus();
      }, 100);
    } else {
      navigate(tab.path);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-50">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {tabs.map(tab => {
          const active = isActive(tab);
          const Icon   = tab.icon;
          const isRide = tab.id === 'ride';

          return (
            <button
              key={tab.id}
              onClick={() => handleTab(tab)}
              className={`flex flex-col items-center gap-0.5 flex-1 py-1 transition-all ${
                isRide ? '' : 'active:scale-95'
              }`}
            >
              {isRide ? (
                /* Ride — floating action button style */
                <div className="w-12 h-12 bg-[#2563EB] rounded-full flex items-center justify-center shadow-lg -mt-5 ring-4 ring-white">
                  <Icon size={22} className="text-white" strokeWidth={2} />
                </div>
              ) : (
                <div className={`p-1.5 rounded-xl transition-colors ${active ? 'bg-[#2563EB]/10' : ''}`}>
                  <Icon
                    size={22}
                    className={active ? 'text-[#2563EB]' : 'text-gray-400'}
                    strokeWidth={active ? 2.5 : 2}
                  />
                </div>
              )}
              <span className={`text-xs font-semibold leading-tight ${
                isRide ? 'text-[#2563EB]' : active ? 'text-[#2563EB]' : 'text-gray-400'
              }`}>
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

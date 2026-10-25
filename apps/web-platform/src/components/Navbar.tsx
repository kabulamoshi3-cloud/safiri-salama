/**
 * Bottom Navigation Bar — Mobile app style
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Wallet, MapPin, User, ShoppingBag, Home, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { i18n } from '../i18n';
import LanguageSwitcher from './LanguageSwitcher';

const navLinks = [
  { path: '/',        labelKey: 'nav.home',     icon: Home        },
  { path: '/trips',   labelKey: 'nav.my_trips',  icon: MapPin      },
  { path: '/food',    labelKey: 'food',          icon: ShoppingBag },
  { path: '/wallet',  labelKey: 'nav.wallet',    icon: Wallet      },
  { path: '/profile', labelKey: 'nav.profile',  icon: User        },
];

const Navbar: React.FC = () => {
  const { user, logout }  = useAuthStore();
  const location          = useLocation();
  const navigate          = useNavigate();

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      {/* Top Bar - Desktop only with logo and logout */}
      <div className="hidden md:block fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="text-2xl font-black text-blue-600">
            {i18n.t('app_name')}
          </Link>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <span className="text-sm text-gray-600 font-medium">
              {user?.name ?? ''}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-semibold transition"
            >
              <LogOut size={16} /> {i18n.t('logout')}
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Navigation Bar - Mobile app style */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-6xl mx-auto px-2 h-16 flex items-center justify-around">
          {navLinks.map(({ path, labelKey, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center justify-center gap-1 px-3 py-2 rounded-lg transition min-w-[60px] ${
                isActive(path)
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon size={22} strokeWidth={isActive(path) ? 2.5 : 2} />
              <span className={`text-xs font-medium ${isActive(path) ? 'font-semibold' : ''}`}>
                {i18n.t(labelKey)}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
};

export default Navbar;

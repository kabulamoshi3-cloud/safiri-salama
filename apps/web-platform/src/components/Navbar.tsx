/**
 * Top Navigation Bar — responsive with mobile menu
 */

import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, Wallet, MapPin, User, ShoppingBag, Home, LogOut } from 'lucide-react';
import { useAuthStore } from '../store/auth';

const navLinks = [
  { path: '/',       label: 'Home',       icon: Home       },
  { path: '/trips',  label: 'My Trips',   icon: MapPin     },
  { path: '/food',   label: 'Food',       icon: ShoppingBag},
  { path: '/wallet', label: 'Wallet',     icon: Wallet     },
  { path: '/profile',label: 'Profile',    icon: User       },
];

const Navbar: React.FC = () => {
  const { user, logout }  = useAuthStore();
  const location          = useLocation();
  const navigate          = useNavigate();
  const [open, setOpen]   = useState(false);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login');
    setOpen(false);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="text-2xl font-black text-blue-600">
          SafiriSalama
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map(({ path, label }) => (
            <Link
              key={path}
              to={path}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                isActive(path)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>

        {/* Desktop right */}
        <div className="hidden md:flex items-center gap-3">
          <span className="text-sm text-gray-600 font-medium">
            {user?.name ?? ''}
          </span>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-red-500 hover:text-red-700 font-semibold transition"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pb-4 pt-2 space-y-1">
          {navLinks.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition ${
                isActive(path)
                  ? 'bg-blue-50 text-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon size={18} /> {label}
            </Link>
          ))}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-red-500 text-sm font-semibold hover:bg-red-50 rounded-lg transition"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

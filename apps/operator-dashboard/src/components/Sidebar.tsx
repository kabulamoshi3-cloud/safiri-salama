/**
 * Sidebar Navigation Component — Operator Dashboard
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Truck,
  Users,
  DollarSign,
  BarChart3,
  Settings,
  LogOut,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';

const Sidebar: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { operator, logout } = useAuthStore();

  const navItems = [
    { path: '/', label: t('nav_dashboard'), icon: LayoutDashboard },
    { path: '/fleet', label: t('nav_fleet'), icon: Truck },
    { path: '/drivers', label: t('nav_drivers'), icon: Users },
    { path: '/earnings', label: t('nav_earnings'), icon: DollarSign },
    { path: '/reports', label: t('nav_reports'), icon: BarChart3 },
  ];

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 shadow-lg overflow-y-auto flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">DalaSmart</h1>
        <p className="text-sm text-gray-400 mt-1">Operator Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="p-4 flex-1">
        <div className="space-y-2">
          {navItems.map(({ path, label, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                isActive(path)
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Icon size={20} />
              <span className="font-medium">{label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Divider */}
      <div className="border-t border-gray-800 mx-4"></div>

      {/* Operator Info */}
      <div className="p-4 bg-gray-800 mx-4 rounded-lg my-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shrink-0">
            <Truck size={18} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">
              {operator?.name ?? 'Operator'}
            </p>
            <p className="text-xs text-gray-400 truncate">
              {operator?.fleet_name ?? 'Fleet'}
            </p>
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <Link
          to="/settings"
          className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          <Settings size={20} />
          <span>{t('nav_settings')}</span>
        </Link>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition"
        >
          <LogOut size={20} />
          <span>{t('nav_logout')}</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

/**
 * Sidebar Navigation Component
 */

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BarChart3, MapPin, DollarSign, Award, FileText, User, Settings, LogOut } from 'lucide-react';

const Sidebar: React.FC = () => {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: BarChart3 },
    { path: '/trips', label: 'Trips', icon: MapPin },
    { path: '/earnings', label: 'Earnings', icon: DollarSign },
    { path: '/incentives', label: 'Incentives', icon: Award },
    { path: '/documents', label: 'Documents', icon: FileText },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="w-64 bg-gray-900 text-white h-screen fixed left-0 top-0 shadow-lg overflow-y-auto">
      {/* Logo */}
      <div className="p-6 border-b border-gray-800">
        <h1 className="text-2xl font-bold">DalaSmart</h1>
        <p className="text-sm text-gray-400 mt-1">Driver Dashboard</p>
      </div>

      {/* Navigation */}
      <nav className="p-4">
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
      <div className="border-t border-gray-800 my-4"></div>

      {/* Driver Info */}
      <div className="p-4 bg-gray-800 mx-4 rounded-lg mb-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <p className="font-semibold text-sm">John Mwangi</p>
            <p className="text-xs text-gray-400">Driver ID: #12345</p>
          </div>
        </div>
        <div className="flex gap-2 text-xs">
          <span className="bg-green-600 px-2 py-1 rounded">Active</span>
          <span className="bg-blue-600 px-2 py-1 rounded">4.8★</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <button className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition">
          <Settings size={20} />
          <span>Settings</span>
        </button>
        <button className="flex items-center gap-3 w-full px-4 py-2 text-gray-300 hover:text-white hover:bg-gray-800 rounded-lg transition">
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;

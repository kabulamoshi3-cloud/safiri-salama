/**
 * Reusable Stat Card Component
 */

import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'red';
  trend?: string;
  subtext?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color, trend, subtext }) => {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
        </div>
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
      
      <div className="flex items-end justify-between">
        <p className="text-2xl md:text-3xl font-bold text-gray-900">{value}</p>
        {trend && (
          <span className={`text-sm font-semibold ${trend.startsWith('+') ? 'text-green-600' : 'text-red-600'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
  );
};

export default StatCard;

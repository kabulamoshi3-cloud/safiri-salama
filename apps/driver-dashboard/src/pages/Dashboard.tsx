/**
 * Driver Dashboard - Main View
 * Real-time stats, current trip, and today's summary
 */

import React, { useEffect, useState } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, Users, MapPin, Star, AlertCircle, Phone, MessageSquare } from 'lucide-react';
import StatCard from '../components/StatCard';
import TripCard from '../components/TripCard';
import api from '../services/api';

interface DashboardStats {
  trips_today: number;
  earnings_today: number;
  pending_amount: number;
  avg_rating: number;
  acceptance_rate: number;
  completion_rate: number;
  current_trip?: {
    id: string;
    passenger: string;
    pickup: string;
    dropoff: string;
    distance: number;
    fare: number;
    status: string;
  };
  incentives_today: number;
  active_targets: Array<{
    type: string;
    target: number;
    current: number;
    bonus: number;
  }>;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    fetchDashboardStats();
    const interval = setInterval(fetchDashboardStats, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await api.get('/driver-incentives/stats');
      setStats(response.data);

      // Mock chart data - replace with real data from API
      setChartData([
        { time: '6 AM', trips: 0, earnings: 0 },
        { time: '9 AM', trips: 2, earnings: 2500 },
        { time: '12 PM', trips: 5, earnings: 7500 },
        { time: '3 PM', trips: 8, earnings: 12000 },
        { time: '6 PM', trips: 11, earnings: 16500 },
        { time: '9 PM', trips: 13, earnings: 19500 },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">Welcome back! Here's your performance today.</p>
      </div>

      {/* Alert Banner */}
      {stats?.pending_amount && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-blue-600" size={20} />
          <div>
            <p className="font-semibold text-blue-900">Pending Earnings</p>
            <p className="text-blue-700">You have Sh{stats.pending_amount} in incentives waiting to be credited</p>
          </div>
        </div>
      )}

      {/* Current Trip */}
      {stats?.current_trip && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4">Current Trip</h2>
          <TripCard trip={stats.current_trip} />
        </div>
      )}

      {/* Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          title="Trips Today"
          value={stats?.trips_today || 0}
          icon={<MapPin />}
          color="blue"
          trend="+12%"
        />
        <StatCard
          title="Earnings Today"
          value={`Sh${stats?.earnings_today || 0}`}
          icon={<TrendingUp />}
          color="green"
          trend="+8%"
        />
        <StatCard
          title="Rating"
          value={stats?.avg_rating?.toFixed(1) || 'N/A'}
          icon={<Star />}
          color="yellow"
          subtext={`${stats?.acceptance_rate || 0}% acceptance`}
        />
        <StatCard
          title="Incentives"
          value={`Sh${stats?.incentives_today || 0}`}
          icon={<Users />}
          color="purple"
          subtext="Today's bonuses"
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Earnings Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Earnings Timeline</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip formatter={(value) => `Sh${value}`} />
              <Legend />
              <Line type="monotone" dataKey="earnings" stroke="#3b82f6" name="Earnings" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Trips Chart */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-bold mb-4">Trips by Hour</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="trips" fill="#10b981" name="Trips" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Active Targets */}
      {stats?.active_targets && stats.active_targets.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h3 className="text-lg font-bold mb-4">Active Targets</h3>
          <div className="space-y-4">
            {stats.active_targets.map((target, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-semibold capitalize">{target.type.replace('_', ' ')}</span>
                  <span className="text-green-600 font-bold">+Sh{target.bonus}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${Math.min((target.current / target.target) * 100, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>{target.current} / {target.target}</span>
                  <span>{Math.round((target.current / target.target) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg flex flex-col items-center gap-2 transition">
            <MapPin size={24} className="text-blue-600" />
            <span className="text-sm font-semibold">Start Driving</span>
          </button>
          <button className="p-4 bg-green-50 hover:bg-green-100 rounded-lg flex flex-col items-center gap-2 transition">
            <Phone size={24} className="text-green-600" />
            <span className="text-sm font-semibold">Support</span>
          </button>
          <button className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg flex flex-col items-center gap-2 transition">
            <MessageSquare size={24} className="text-purple-600" />
            <span className="text-sm font-semibold">Messages</span>
          </button>
          <button className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg flex flex-col items-center gap-2 transition">
            <Star size={24} className="text-yellow-600" />
            <span className="text-sm font-semibold">Ratings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

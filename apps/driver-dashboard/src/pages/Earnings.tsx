/**
 * Driver Earnings Page
 * Detailed earnings breakdown, history, and withdrawals
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Calendar, Download } from 'lucide-react';
import api from '../services/api';

interface EarningsData {
  today: {
    trips: number;
    earnings: number;
    avg_rating: number;
  };
  this_week: {
    trips: number;
    earnings: number;
  };
  this_month: {
    trips: number;
    earnings: number;
  };
  all_time: {
    trips: number;
    earnings: number;
  };
  history: Array<{
    date: string;
    type: string;
    amount: number;
    count: number;
  }>;
  pending_withdrawals: Array<{
    id: string;
    amount: number;
    status: string;
    requested_date: string;
    expected_date: string;
  }>;
}

const Earnings: React.FC = () => {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const fetchEarningsData = async () => {
    try {
      const response = await api.get('/driver-incentives/history?days=90');
      setEarnings(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching earnings:', error);
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

  const periodData = earnings?.[selectedPeriod];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Earnings & Payouts</h1>
        <p className="text-gray-600 mt-2">Track your income and manage withdrawals</p>
      </div>

      {/* Period Tabs */}
      <div className="flex gap-4 mb-8 border-b border-gray-200">
        {(['today', 'week', 'month', 'all'] as const).map((period) => (
          <button
            key={period}
            onClick={() => setSelectedPeriod(period)}
            className={`px-4 py-3 font-semibold border-b-2 transition ${
              selectedPeriod === period
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            {period.charAt(0).toUpperCase() + period.slice(1)}
          </button>
        ))}
      </div>

      {/* Period Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Trips</p>
              <p className="text-3xl font-bold mt-2">{periodData?.trips || 0}</p>
            </div>
            <TrendingUp className="text-blue-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Earnings</p>
              <p className="text-3xl font-bold mt-2">Sh{periodData?.earnings || 0}</p>
            </div>
            <DollarSign className="text-green-600" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Average per Trip</p>
              <p className="text-3xl font-bold mt-2">
                Sh{periodData?.earnings ? Math.round(periodData.earnings / (periodData.trips || 1)) : 0}
              </p>
            </div>
            <Calendar className="text-purple-600" size={32} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Earnings Breakdown */}
        <div className="lg:col-span-2 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-6">Earnings Breakdown</h2>
          <div className="space-y-4">
            {earnings?.history?.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold capitalize">{item.type.replace('_', ' ')}</p>
                  <p className="text-sm text-gray-600">{item.count} instances</p>
                </div>
                <p className="text-xl font-bold text-green-600">+Sh{item.amount}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Pending Withdrawals */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Pending Withdrawals</h2>
          {earnings?.pending_withdrawals && earnings.pending_withdrawals.length > 0 ? (
            <div className="space-y-4">
              {earnings.pending_withdrawals.map((withdrawal) => (
                <div key={withdrawal.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-bold">Sh{withdrawal.amount}</span>
                    <span className={`text-xs font-semibold px-2 py-1 rounded ${
                      withdrawal.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {withdrawal.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Expected: {new Date(withdrawal.expected_date).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600 text-center py-8">No pending withdrawals</p>
          )}

          <button className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition">
            <Download size={18} className="inline mr-2" />
            Request Withdrawal
          </button>
        </div>
      </div>

      {/* Detailed History */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6">Detailed History (Last 30 Days)</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Trip ID</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Incentive</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Total</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(10)].map((_, idx) => (
                <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">{new Date(Date.now() - idx * 86400000).toLocaleDateString()}</td>
                  <td className="py-3 px-4 font-mono text-blue-600">TRIP-{String(idx + 1).padStart(6, '0')}</td>
                  <td className="py-3 px-4">Sh{Math.floor(Math.random() * 5000) + 1500}</td>
                  <td className="py-3 px-4">+Sh{Math.floor(Math.random() * 2000)}</td>
                  <td className="py-3 px-4 font-bold">Sh{Math.floor(Math.random() * 7000) + 1500}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Earnings;

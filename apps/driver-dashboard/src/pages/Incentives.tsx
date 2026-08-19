/**
 * Driver Incentives Page
 * Bonuses, targets, and leaderboard
 */

import React, { useEffect, useState } from 'react';
import { Award, TrendingUp, Target, Users } from 'lucide-react';
import api from '../services/api';

interface IncentiveStats {
  today: {
    trip_bonus: number;
    rating_bonus: number;
    streak_bonus: number;
    total: number;
  };
  targets: Array<{
    id: string;
    type: string;
    target: number;
    current: number;
    progress: number;
    bonus: number;
    ends_in: string;
  }>;
  leaderboard: Array<{
    rank: number;
    driver_id: string;
    name: string;
    total_earned: number;
    incentives_count: number;
    avg_rating: string;
  }>;
}

const Incentives: React.FC = () => {
  const [incentives, setIncentives] = useState<IncentiveStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchIncentives();
    const interval = setInterval(fetchIncentives, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const fetchIncentives = async () => {
    try {
      const [statsRes, leaderboardRes] = await Promise.all([
        api.get('/driver-incentives/stats'),
        api.get('/driver-incentives/leaderboard?period=day')
      ]);
      
      setIncentives({
        today: statsRes.data.today,
        targets: statsRes.data.active_targets,
        leaderboard: leaderboardRes.data.leaderboard
      });
      setLoading(false);
    } catch (error) {
      console.error('Error fetching incentives:', error);
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Incentives & Bonuses</h1>
        <p className="text-gray-600 mt-2">Maximize your earnings with performance bonuses</p>
      </div>

      {/* Today's Bonuses */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm">Trip Bonus</p>
            <TrendingUp className="text-blue-600" size={20} />
          </div>
          <p className="text-2xl font-bold">Sh{incentives?.today.trip_bonus || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm">Rating Bonus</p>
            <Award className="text-yellow-600" size={20} />
          </div>
          <p className="text-2xl font-bold">Sh{incentives?.today.rating_bonus || 0}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-gray-600 text-sm">Streak Bonus</p>
            <TrendingUp className="text-green-600" size={20} />
          </div>
          <p className="text-2xl font-bold">Sh{incentives?.today.streak_bonus || 0}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-blue-100 text-sm">Total Today</p>
            <Award className="text-blue-100" size={20} />
          </div>
          <p className="text-3xl font-bold">Sh{incentives?.today.total || 0}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Active Targets */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-6">Active Performance Targets</h2>
            <div className="space-y-6">
              {incentives?.targets && incentives.targets.length > 0 ? (
                incentives.targets.map((target) => (
                  <div key={target.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-lg capitalize">{target.type.replace('_', ' ')}</h3>
                        <p className="text-sm text-gray-600">Reward: Sh{target.bonus}</p>
                      </div>
                      <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded">
                        {target.ends_in}
                      </span>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="font-semibold">{target.current} / {target.target}</span>
                        <span className="text-gray-600">{target.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full transition-all ${
                            target.progress >= 100 ? 'bg-green-600' : 'bg-blue-600'
                          }`}
                          style={{ width: `${Math.min(target.progress, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    {target.progress >= 100 && (
                      <p className="text-green-600 text-sm font-semibold">✓ Target Completed!</p>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-center py-8">No active targets</p>
              )}
            </div>
          </div>
        </div>

        {/* How to Earn */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Bonus Breakdown</h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-blue-600" size={16} />
              </div>
              <div>
                <p className="font-semibold">Trip Bonus</p>
                <p className="text-gray-600">Sh500 per trip (first 10)</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                <Award className="text-yellow-600" size={16} />
              </div>
              <div>
                <p className="font-semibold">Rating Bonus</p>
                <p className="text-gray-600">Sh500-1000 for 4.5+ rating</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="text-green-600" size={16} />
              </div>
              <div>
                <p className="font-semibold">Streak Bonus</p>
                <p className="text-gray-600">Sh100 per consecutive trip</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                <Target className="text-purple-600" size={16} />
              </div>
              <div>
                <p className="font-semibold">Distance Bonus</p>
                <p className="text-gray-600">Sh10 per km (trips >5km)</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="mt-8 bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-bold mb-6">Top Drivers This Week</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rank</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Driver</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Earnings</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Bonuses</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Rating</th>
              </tr>
            </thead>
            <tbody>
              {incentives?.leaderboard && incentives.leaderboard.length > 0 ? (
                incentives.leaderboard.map((driver) => (
                  <tr key={driver.driver_id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full font-bold ${
                        driver.rank === 1
                          ? 'bg-yellow-100 text-yellow-700'
                          : driver.rank === 2
                          ? 'bg-gray-100 text-gray-700'
                          : driver.rank === 3
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-gray-50 text-gray-700'
                      }`}>
                        {driver.rank}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold">{driver.name}</td>
                    <td className="py-3 px-4 font-bold text-green-600">Sh{driver.total_earned}</td>
                    <td className="py-3 px-4">{driver.incentives_count}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold">{driver.avg_rating}</span>
                        <span className="text-yellow-500">★</span>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-gray-600">
                    No leaderboard data available
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Incentives;

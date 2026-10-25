/**
 * Home Page - Main booking interface
 */

import React, { useState } from 'react';
import { MapPin, Search, Star, Zap, Gift } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { i18n } from '../i18n';

interface Promo {
  code: string;
  description: string;
  discount: string;
  expires_in: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [pickup, setPickup] = useState('');
  const [dropoff, setDropoff] = useState('');
  const [promos, setPromos] = useState<Promo[]>([
    {
      code: 'WELCOME2024',
      description: 'home.promo_welcome',
      discount: '30%',
      expires_in: 'home.expires_5days'
    },
    {
      code: 'HOLIDAY50',
      description: 'home.promo_holiday',
      discount: '50%',
      expires_in: 'home.expires_2days'
    }
  ]);

  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  React.useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const handleBookRide = () => {
    if (pickup && dropoff) {
      navigate('/book', { state: { pickup, dropoff } });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            {i18n.t('home.hero_title')}
          </h1>
          <p className="text-xl text-gray-600">{i18n.t('home.hero_subtitle')}</p>
        </div>

        {/* Booking Card */}
        <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl mx-auto mb-12">
          <div className="space-y-4">
            {/* Pickup */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{i18n.t('common.from')}</label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-300 focus-within:border-blue-500">
                <MapPin className="text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={i18n.t('home.enter_pickup')}
                  value={pickup}
                  onChange={(e) => setPickup(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Dropoff */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{i18n.t('common.to')}</label>
              <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3 border border-gray-300 focus-within:border-blue-500">
                <MapPin className="text-gray-400" size={20} />
                <input
                  type="text"
                  placeholder={i18n.t('home.enter_destination')}
                  value={dropoff}
                  onChange={(e) => setDropoff(e.target.value)}
                  className="flex-1 bg-transparent outline-none text-gray-900 placeholder-gray-500"
                />
              </div>
            </div>

            {/* Book Button */}
            <button
              onClick={handleBookRide}
              disabled={!pickup || !dropoff}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Search size={20} />
              {i18n.t('home.find_rides')}
            </button>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto mb-12">
          <button
            onClick={() => navigate('/food')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
          >
            <div className="bg-orange-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="text-orange-600" size={24} />
            </div>
            <h3 className="font-bold text-gray-900">{i18n.t('food.delivery_title')}</h3>
            <p className="text-sm text-gray-600 mt-1">{i18n.t('home.food_desc')}</p>
          </button>

          <button
            onClick={() => navigate('/wallet')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
          >
            <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <Star className="text-green-600" size={24} />
            </div>
            <h3 className="font-bold text-gray-900">{i18n.t('nav.wallet')}</h3>
            <p className="text-sm text-gray-600 mt-1">{i18n.t('home.wallet_desc')}</p>
          </button>

          <button
            onClick={() => navigate('/trips')}
            className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition text-center"
          >
            <div className="bg-purple-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
              <MapPin className="text-purple-600" size={24} />
            </div>
            <h3 className="font-bold text-gray-900">{i18n.t('home.trip_history')}</h3>
            <p className="text-sm text-gray-600 mt-1">{i18n.t('home.trip_history_desc')}</p>
          </button>
        </div>

        {/* Promos Section */}
        {promos.length > 0 && (
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Gift size={24} />
              {i18n.t('home.available_offers')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {promos.map((promo) => (
                <div key={promo.code} className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-4 text-white">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-sm font-semibold">{promo.code}</p>
                      <p className="text-2xl font-bold">{promo.discount} {i18n.t('home.off')}</p>
                    </div>
                    <span className="text-xs bg-white bg-opacity-20 px-2 py-1 rounded">
                      {i18n.t('home.expires_in')} {i18n.t(promo.expires_in)}
                    </span>
                  </div>
                  <p className="text-sm text-blue-50">{i18n.t(promo.description)}</p>
                  <button className="mt-3 w-full bg-white text-blue-600 font-semibold py-2 rounded hover:bg-blue-50 transition">
                    {i18n.t('home.apply_code')}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Features Section */}
      <div className="bg-white border-t border-gray-200 mt-16 py-12">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">{i18n.t('home.why_choose')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="text-blue-600" size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{i18n.t('home.safe_reliable')}</h3>
              <p className="text-gray-600">{i18n.t('home.safe_reliable_desc')}</p>
            </div>

            <div className="text-center">
              <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="text-green-600" size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{i18n.t('home.fast_convenient')}</h3>
              <p className="text-gray-600">{i18n.t('home.fast_desc')}</p>
            </div>

            <div className="text-center">
              <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="text-purple-600" size={32} />
              </div>
              <h3 className="font-bold text-gray-900 mb-2">{i18n.t('home.great_rewards')}</h3>
              <p className="text-gray-600">{i18n.t('home.rewards_desc')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

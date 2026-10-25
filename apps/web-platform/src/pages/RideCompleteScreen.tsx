/**
 * Screen 8: Ride Complete
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Car, Star } from 'lucide-react';
import { i18n } from '../i18n';
import { useTripStore } from '../store/tripStore';

const RideCompleteScreen: React.FC = () => {
  const navigate = useNavigate();
  const { activeTrip, clearTrip } = useTripStore();
  const [rating, setRating] = useState(0);
  const [showRating, setShowRating] = useState(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return i18n.subscribe(() => forceUpdate()); }, []);

  const fareData = {
    amount: activeTrip?.fare || 6000,
    payment: i18n.t('cash'),
    distance: activeTrip?.distanceKm || 1.8,
    duration: activeTrip?.durationMin || 6,
  };

  const handleRate = async () => {
    if (rating === 0) { setShowRating(true); return; }
    clearTrip();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 py-16 pb-24">
      <div className="relative mb-8">
        <div className="w-32 h-32 bg-[#128901]/10 rounded-full flex items-center justify-center mb-4 animate-bounce">
          <CheckCircle size={80} className="text-[#128901]" strokeWidth={2} />
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2">
          <div className="bg-[#2563EB] p-3 rounded-full shadow-lg">
            <Car size={24} className="text-white" />
          </div>
        </div>
      </div>

      <h1 className="text-[#0F172A] font-black text-3xl mb-2 text-center">
        {i18n.t('trip_completed_title')}!
      </h1>
      <p className="text-gray-600 text-center text-base mb-10">
        {i18n.t('thank_you_ride')}
      </p>

      <div className="w-full max-w-md bg-[#F3F5F9] rounded-2xl p-6 mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 font-medium">{i18n.t('fare')}</span>
          <span className="text-[#0F172A] font-black text-2xl">TZS {fareData.amount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{i18n.t('payment_method')}</span>
          <span className="text-gray-800 font-semibold">{fareData.payment}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{i18n.t('distance')}</span>
          <span className="text-gray-800 font-semibold">{fareData.distance} km</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">{i18n.t('estimated_time')}</span>
          <span className="text-gray-800 font-semibold">{fareData.duration} {i18n.t('minutes')}</span>
        </div>
      </div>

      {showRating && (
        <div className="w-full max-w-md mb-6 p-6 bg-white border-2 border-[#2563EB] rounded-2xl">
          <p className="text-center text-gray-700 font-semibold mb-4">{i18n.t('rate_driver')}</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} className="transition-transform hover:scale-110">
                <Star size={40} className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'} strokeWidth={1.5} />
              </button>
            ))}
          </div>
        </div>
      )}

      <button onClick={handleRate} className="w-full max-w-md bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-black py-4 rounded-xl transition shadow-lg mb-4">
        {rating > 0 ? i18n.t('submit_rating') : i18n.t('rate_driver')}
      </button>
      <button onClick={() => { clearTrip(); navigate('/'); }} className="text-gray-600 hover:text-gray-800 font-semibold text-sm">
        {i18n.t('back')}
      </button>
    </div>
  );
};

export default RideCompleteScreen;

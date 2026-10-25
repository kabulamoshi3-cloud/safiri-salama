/**
 * Screen 8: Ride Complete
 * Green checkmark, fare summary, rate driver
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, Car, Star } from 'lucide-react';

const RideCompleteScreen: React.FC = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);
  const [showRating, setShowRating] = useState(false);

  // TODO: Get actual trip data from store
  const fareData = {
    amount: 6000,
    payment: 'Cash',
    distance: 1.8,
    duration: 6,
  };

  const handleRate = async () => {
    if (rating === 0) {
      setShowRating(true);
      return;
    }
    // TODO: Submit rating to API
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8 py-16">
      {/* Success Animation */}
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

      {/* Text */}
      <h1 className="text-[#0F172A] font-black text-3xl mb-2 text-center">
        Ride Completed!
      </h1>
      <p className="text-gray-600 text-center text-base mb-10">
        Thank you for riding with Safiri Haraka.
      </p>

      {/* Fare Summary Card */}
      <div className="w-full max-w-md bg-[#F3F5F9] rounded-2xl p-6 mb-8 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-gray-600 font-medium">Fare</span>
          <span className="text-[#0F172A] font-black text-2xl">TZS {fareData.amount.toLocaleString()}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Payment</span>
          <span className="text-gray-800 font-semibold">{fareData.payment}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Distance</span>
          <span className="text-gray-800 font-semibold">{fareData.distance} km</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Duration</span>
          <span className="text-gray-800 font-semibold">{fareData.duration} min</span>
        </div>
      </div>

      {/* Rating Section */}
      {showRating ? (
        <div className="w-full max-w-md mb-6 p-6 bg-white border-2 border-[#2563EB] rounded-2xl">
          <p className="text-center text-gray-700 font-semibold mb-4">Rate your driver</p>
          <div className="flex justify-center gap-2 mb-4">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  size={40}
                  className={star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {/* CTA */}
      <button
        onClick={handleRate}
        className="w-full max-w-md bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-black py-4 rounded-xl transition shadow-lg mb-4"
      >
        {rating > 0 ? 'Submit Rating' : 'Rate Driver'}
      </button>

      <button
        onClick={() => navigate('/')}
        className="text-gray-600 hover:text-gray-800 font-semibold text-sm"
      >
        Back to Home
      </button>
    </div>
  );
};

export default RideCompleteScreen;

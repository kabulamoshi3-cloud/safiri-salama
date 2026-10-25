/**
 * Screen 5: Searching for Driver
 * Animated pulsing car, finding driver message
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';

const SearchingDriverScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // TODO: Connect to Socket.IO and listen for driver_assigned event
    // For now, simulate with timeout
    const timer = setTimeout(() => {
      // navigate('/active-trip');
    }, 10000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleCancel = () => {
    // TODO: Cancel trip request via API
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
      {/* Animated Pulsing Car Icon */}
      <div className="relative mb-12">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-48 h-48 bg-[#2563EB]/10 rounded-full animate-ping" />
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-40 h-40 bg-[#2563EB]/20 rounded-full animate-pulse" />
        </div>
        <div className="relative z-10 w-32 h-32 bg-[#2563EB] rounded-full flex items-center justify-center shadow-2xl">
          <Car size={64} className="text-white" strokeWidth={1.5} />
        </div>
      </div>

      {/* Text */}
      <h1 className="text-[#0F172A] font-black text-3xl mb-3 text-center">
        Finding a driver...
      </h1>
      <p className="text-gray-600 text-center text-base max-w-sm mb-8">
        We're looking for the nearest driver for you.
      </p>

      {/* ETA Chip */}
      <div className="bg-[#F3F5F9] px-6 py-2 rounded-full mb-12">
        <p className="text-[#2563EB] font-bold text-sm">Estimated arrival: 2 min</p>
      </div>

      {/* Cancel Button */}
      <button
        onClick={handleCancel}
        className="border-2 border-gray-300 text-gray-700 font-semibold px-12 py-3 rounded-xl hover:bg-gray-50 transition"
      >
        Cancel
      </button>
    </div>
  );
};

export default SearchingDriverScreen;

/**
 * Screen 5: Searching for Driver
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Car } from 'lucide-react';
import { i18n } from '../i18n';

const SearchingDriverScreen: React.FC = () => {
  const navigate = useNavigate();
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return i18n.subscribe(() => forceUpdate()); }, []);

  useEffect(() => {
    const timer = setTimeout(() => {}, 10000);
    return () => clearTimeout(timer);
  }, [navigate]);

  const handleCancel = () => navigate('/');

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-8">
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
      <h1 className="text-[#0F172A] font-black text-3xl mb-3 text-center">
        {i18n.t('finding_driver')}
      </h1>
      <p className="text-gray-600 text-center text-base max-w-sm mb-8">
        {i18n.t('finding_driver_sub')}
      </p>
      <div className="bg-[#F3F5F9] px-6 py-2 rounded-full mb-12">
        <p className="text-[#2563EB] font-bold text-sm">{i18n.t('eta_minutes').replace('{n}', '2')}</p>
      </div>
      <button
        onClick={handleCancel}
        className="border-2 border-gray-300 text-gray-700 font-semibold px-12 py-3 rounded-xl hover:bg-gray-50 transition"
      >
        {i18n.t('cancel')}
      </button>
    </div>
  );
};

export default SearchingDriverScreen;

/**
 * Screen 1: Splash Screen
 * Full-screen brand moment with SH logo, city backdrop
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Zap } from 'lucide-react';

const SplashScreen: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-check session after 2 seconds
    const timer = setTimeout(() => {
      const token = localStorage.getItem('safiri_token');
      if (token) {
        navigate('/');
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2563EB] to-[#0F172A] flex flex-col items-center justify-between px-8 py-16 relative overflow-hidden">
      {/* Decorative circles */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
      <div className="absolute bottom-0 left-0 w-72 h-72 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

      <div className="flex-1" />

      {/* Logo Section */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="w-32 h-32 bg-white/10 backdrop-blur-lg rounded-3xl flex items-center justify-center mb-6 shadow-2xl ring-2 ring-white/20">
          <div className="relative">
            <div className="text-white font-black text-5xl">SH</div>
            <MapPin className="absolute -bottom-2 -right-2 text-[#7C3AED]" size={24} />
          </div>
        </div>
        <h1 className="text-white font-black text-4xl mb-2">Safiri Haraka</h1>
        <p className="text-white/70 text-base">Intelligence in Every Journey</p>
      </div>

      {/* CTA Section */}
      <div className="relative z-10 w-full max-w-md space-y-4">
        <button
          onClick={() => navigate('/login?mode=register')}
          className="w-full bg-white hover:bg-white/90 text-[#2563EB] font-black py-4 rounded-2xl text-lg shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          Get Started
          <Zap size={20} />
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full text-white/80 hover:text-white text-sm font-semibold transition-all"
        >
          I already have an account
        </button>
      </div>
    </div>
  );
};

export default SplashScreen;

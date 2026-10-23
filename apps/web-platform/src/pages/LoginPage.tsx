/**
 * LoginPage — Animated onboarding slides + Login / Register
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, Shield, Car, MapPin, Star,
  Clock, ChevronRight, User, Lock, CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

/* ─── Slide data ──────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 0,
    icon: <Car size={64} className="text-white drop-shadow-lg" />,
    title: 'Ride Safely Across Morogoro',
    subtitle: 'Book a trusted driver in seconds. Fast, affordable rides to any destination.',
    bg: 'from-blue-600 via-blue-700 to-indigo-800',
    accent: 'bg-blue-400',
    dots: ['top-10 left-10', 'top-20 right-16', 'bottom-24 left-20'],
  },
  {
    id: 1,
    icon: <MapPin size={64} className="text-white drop-shadow-lg" />,
    title: 'Real-Time GPS Tracking',
    subtitle: 'Watch your driver arrive in real time. Share your trip with family for extra safety.',
    bg: 'from-emerald-500 via-teal-600 to-cyan-700',
    accent: 'bg-emerald-400',
    dots: ['top-16 right-12', 'bottom-20 right-20', 'top-32 left-8'],
  },
  {
    id: 2,
    icon: <Star size={64} className="text-white drop-shadow-lg" />,
    title: 'Top-Rated Drivers',
    subtitle: 'Every driver is verified, trained, and rated by passengers just like you.',
    bg: 'from-violet-600 via-purple-700 to-fuchsia-800',
    accent: 'bg-violet-400',
    dots: ['top-12 left-16', 'bottom-16 left-10', 'top-24 right-8'],
  },
  {
    id: 3,
    icon: <Clock size={64} className="text-white drop-shadow-lg" />,
    title: 'Arrive On Time, Every Time',
    subtitle: 'Smart traffic prediction gets you there faster. Know your ETA before you book.',
    bg: 'from-orange-500 via-amber-600 to-yellow-600',
    accent: 'bg-orange-400',
    dots: ['top-8 right-10', 'bottom-28 right-16', 'top-28 left-12'],
  },
];

type AuthMode = 'slides' | 'login' | 'register' | 'otp';

/* ─── Component ──────────────────────────────────────────────── */
const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, verifyOtp, loading } = useAuthStore();

  const [mode, setMode] = useState<AuthMode>('slides');
  const [slide, setSlide] = useState(0);
  const [animating, setAnimating] = useState(false);

  /* form state */
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* auto-advance slides */
  useEffect(() => {
    if (mode !== 'slides') return;
    const t = setInterval(() => nextSlide(), 4000);
    return () => clearInterval(t);
  }, [slide, mode]);

  const nextSlide = () => {
    setAnimating(true);
    setTimeout(() => {
      setSlide((s) => (s + 1) % SLIDES.length);
      setAnimating(false);
    }, 300);
  };

  const goSlide = (i: number) => {
    if (i === slide) return;
    setAnimating(true);
    setTimeout(() => { setSlide(i); setAnimating(false); }, 300);
  };

  /* OTP input handling */
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleSendOtp = async () => {
    setError('');
    if (!phone || phone.length < 9) { setError('Enter a valid phone number'); return; }
    try {
      await login(phone);
      setMode('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    }
  };

  const handleVerify = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    try {
      await verifyOtp(phone, code);
      navigate('/');
    } catch {
      setError('Invalid code. Please try again.');
    }
  };

  const cur = SLIDES[slide];

  /* ── SLIDES SCREEN ─────────────────────────────────────────── */
  if (mode === 'slides') {
    return (
      <div className={`min-h-screen bg-gradient-to-br ${cur.bg} flex flex-col transition-all duration-700`}>
        {/* Skip */}
        <div className="flex justify-end p-6">
          <button
            onClick={() => setMode('login')}
            className="text-white/80 hover:text-white text-sm font-medium px-4 py-2 rounded-full border border-white/30 backdrop-blur-sm transition"
          >
            Skip
          </button>
        </div>

        {/* Decorative dots */}
        {cur.dots.map((pos, i) => (
          <div
            key={i}
            className={`absolute ${pos} w-24 h-24 ${cur.accent} rounded-full opacity-20 blur-2xl pointer-events-none`}
          />
        ))}

        {/* Slide content */}
        <div
          className={`flex-1 flex flex-col items-center justify-center px-8 text-center transition-all duration-300 ${
            animating ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Animated icon circle */}
          <div className="relative mb-10">
            <div className="w-40 h-40 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center shadow-2xl animate-pulse-slow">
              <div className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center">
                {cur.icon}
              </div>
            </div>
            {/* Orbiting dot */}
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center animate-bounce">
              <CheckCircle size={18} className="text-green-500" />
            </div>
          </div>

          <h1 className="text-3xl font-black text-white leading-tight mb-4 max-w-xs">
            {cur.title}
          </h1>
          <p className="text-white/80 text-base leading-relaxed max-w-sm">
            {cur.subtitle}
          </p>
        </div>

        {/* Dots indicator */}
        <div className="flex justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <button
              key={i}
              onClick={() => goSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === slide ? 'w-8 h-3 bg-white' : 'w-3 h-3 bg-white/40'
              }`}
            />
          ))}
        </div>

        {/* Action buttons */}
        <div className="px-6 pb-10 space-y-3">
          <button
            onClick={() => setMode('register')}
            className="w-full bg-white text-blue-700 font-bold py-4 rounded-2xl text-lg shadow-xl flex items-center justify-center gap-2 hover:bg-blue-50 active:scale-95 transition-all duration-200"
          >
            Get Started <ChevronRight size={20} />
          </button>
          <button
            onClick={() => setMode('login')}
            className="w-full bg-white/20 backdrop-blur-sm text-white font-semibold py-4 rounded-2xl text-base border border-white/30 hover:bg-white/30 active:scale-95 transition-all duration-200"
          >
            I already have an account
          </button>
        </div>
      </div>
    );
  }

  /* ── LOGIN / REGISTER SCREEN ───────────────────────────────── */
  if (mode === 'login' || mode === 'register') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex flex-col">
        {/* Top branding */}
        <div className="flex-shrink-0 pt-12 pb-6 px-6 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4 shadow-lg">
            <Car size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white">SafiriSalama</h1>
          <p className="text-white/70 text-sm mt-1">Safe rides across Morogoro</p>
        </div>

        {/* Card */}
        <div className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10 overflow-auto">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-8">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode('register'); setError(''); }}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all duration-200 ${
                mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'
              }`}
            >
              Register
            </button>
          </div>

          <h2 className="text-2xl font-black text-gray-900 mb-2">
            {mode === 'login' ? 'Welcome back 👋' : 'Create account 🎉'}
          </h2>
          <p className="text-gray-500 text-sm mb-8">
            {mode === 'login'
              ? 'Enter your phone number to continue'
              : 'Join thousands of riders in Morogoro'}
          </p>

          {/* Name field (register only) */}
          {mode === 'register' && (
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
              <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
                <User size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder="e.g. Amina Juma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 outline-none text-gray-900 text-base"
                />
              </div>
            </div>
          )}

          {/* Phone field */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
            <div className="flex items-center gap-3 border-2 border-gray-200 rounded-xl px-4 py-3 focus-within:border-blue-500 transition-colors">
              <div className="flex items-center gap-2 border-r border-gray-200 pr-3">
                <span className="text-lg">🇹🇿</span>
                <span className="text-gray-700 font-semibold text-sm">+255</span>
              </div>
              <Phone size={16} className="text-gray-400" />
              <input
                type="tel"
                placeholder="7XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="flex-1 outline-none text-gray-900 text-base"
              />
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <button
            onClick={handleSendOtp}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 text-base"
          >
            {loading ? (
              <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                {mode === 'login' ? 'Send OTP Code' : 'Create Account'}
                <ArrowRight size={18} />
              </>
            )}
          </button>

          {/* Features list */}
          <div className="mt-8 space-y-3">
            {[
              { icon: '🔒', text: 'Your data is safe and encrypted' },
              { icon: '🚗', text: 'Verified drivers only' },
              { icon: '📍', text: 'Real-time GPS tracking' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3">
                <span className="text-lg">{f.icon}</span>
                <span className="text-gray-500 text-sm">{f.text}</span>
              </div>
            ))}
          </div>

          <p className="text-center text-xs text-gray-400 mt-8">
            By continuing you agree to our{' '}
            <a href="/terms" className="text-blue-600">Terms</a> &{' '}
            <a href="/privacy" className="text-blue-600">Privacy Policy</a>
          </p>
        </div>
      </div>
    );
  }

  /* ── OTP SCREEN ─────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-900 flex flex-col">
      {/* Top */}
      <div className="flex-shrink-0 pt-12 pb-6 px-6 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
          <Shield size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">Verify Your Number</h1>
        <p className="text-white/70 text-sm mt-2">
          We sent a 6-digit code to<br />
          <span className="text-white font-bold">+255 {phone}</span>
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 pt-8 pb-10">
        <button
          onClick={() => setMode('login')}
          className="flex items-center gap-1 text-blue-600 text-sm font-medium mb-8 hover:underline"
        >
          ← Change number
        </button>

        <h2 className="text-2xl font-black text-gray-900 mb-2">Enter OTP Code</h2>
        <p className="text-gray-500 text-sm mb-8">Check your SMS for the verification code</p>

        {/* OTP boxes */}
        <div className="flex gap-3 justify-center mb-8">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { otpRefs.current[i] = el; }}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(i, e.target.value)}
              onKeyDown={(e) => handleOtpKey(i, e)}
              className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all duration-200 ${
                digit
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-900'
              } focus:border-blue-500 focus:bg-blue-50`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-blue-200 active:scale-95 text-base"
        >
          {loading ? (
            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>Verify & Continue <CheckCircle size={18} /></>
          )}
        </button>

        <button
          onClick={handleSendOtp}
          className="w-full text-blue-600 text-sm mt-5 hover:underline font-medium py-2"
        >
          Didn't receive the code? Resend
        </button>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mt-8">
          {['Phone', 'Verify', 'Ride'].map((step, i) => (
            <React.Fragment key={step}>
              <div className={`flex items-center gap-1 ${i <= 1 ? 'text-blue-600' : 'text-gray-300'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < 1 ? 'bg-blue-600 text-white' :
                  i === 1 ? 'bg-blue-100 text-blue-600 border-2 border-blue-600' :
                  'bg-gray-100 text-gray-400'
                }`}>
                  {i < 1 ? '✓' : i + 1}
                </div>
                <span className="text-xs font-medium">{step}</span>
              </div>
              {i < 2 && <div className={`w-6 h-px ${i < 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

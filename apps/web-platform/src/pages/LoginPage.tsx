/**
 * LoginPage — Animated onboarding + Login / Register / OTP
 * Primary: Deep Blue   Secondary: Amber/Gold   Accent: Emerald
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, Shield, Car, MapPin, Star,
  Clock, ChevronRight, User, CheckCircle, Zap,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

type AuthMode = 'slides' | 'login' | 'register' | 'otp';

/* ─── Brand colours ───────────────────────────────────────────── */
// primary  = deep blue   (#1d4ed8 … #1e3a8a)
// secondary= amber/gold  (#f59e0b … #d97706)
// accent   = emerald     (#10b981 … #059669)

/* ─── Slide data ──────────────────────────────────────────────── */
const SLIDES = [
  {
    id: 0,
    emoji: '🚗',
    icon: <Car size={56} strokeWidth={1.5} className="text-white" />,
    badge: { icon: '⚡', label: 'Fast Pickup' },
    title: 'Ride Safely Across\nMorogoro',
    subtitle: 'Book a trusted driver in seconds. Fast, affordable rides to SUA, town centre and beyond.',
    gradientFrom: 'from-primary-800',
    gradientVia:  'via-primary-700',
    gradientTo:   'to-primary-600',
    ringColor:    'ring-secondary-400',
    badgeBg:      'bg-secondary-500',
    dotColor:     'bg-secondary-400',
  },
  {
    id: 1,
    emoji: '📍',
    icon: <MapPin size={56} strokeWidth={1.5} className="text-white" />,
    badge: { icon: '📡', label: 'Live GPS' },
    title: 'Track Your Ride\nin Real-Time',
    subtitle: 'Watch your driver approach on a live map. Share your trip with family for extra peace of mind.',
    gradientFrom: 'from-accent-700',
    gradientVia:  'via-accent-600',
    gradientTo:   'to-accent-500',
    ringColor:    'ring-secondary-300',
    badgeBg:      'bg-secondary-500',
    dotColor:     'bg-secondary-400',
  },
  {
    id: 2,
    emoji: '⭐',
    icon: <Star size={56} strokeWidth={1.5} className="text-white" />,
    badge: { icon: '✅', label: 'Verified' },
    title: 'Top-Rated Verified\nDrivers Only',
    subtitle: 'Every driver passes background checks, training, and is rated by passengers like you.',
    gradientFrom: 'from-secondary-700',
    gradientVia:  'via-secondary-600',
    gradientTo:   'to-secondary-500',
    ringColor:    'ring-primary-300',
    badgeBg:      'bg-primary-600',
    dotColor:     'bg-primary-400',
  },
  {
    id: 3,
    emoji: '🕐',
    icon: <Clock size={56} strokeWidth={1.5} className="text-white" />,
    badge: { icon: '🧠', label: 'Smart ETA' },
    title: 'Arrive On Time\nEvery Time',
    subtitle: 'Our AI traffic system predicts the fastest route so you never miss an appointment again.',
    gradientFrom: 'from-dark-900',
    gradientVia:  'via-primary-900',
    gradientTo:   'to-primary-800',
    ringColor:    'ring-secondary-400',
    badgeBg:      'bg-secondary-500',
    dotColor:     'bg-secondary-400',
  },
];

type AuthMode = 'slides' | 'login' | 'register' | 'otp';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { sendOtp, verifyOtp, loading } = useAuthStore();

  const [mode,      setMode]      = useState<AuthMode>('slides');
  const [slide,     setSlide]     = useState(0);
  const [exiting,   setExiting]   = useState(false);
  const [phone,     setPhone]     = useState('');
  const [name,      setName]      = useState('');
  const [otp,       setOtp]       = useState(['', '', '', '', '', '']);
  const [error,     setError]     = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  /* auto-advance */
  useEffect(() => {
    if (mode !== 'slides') return;
    const t = setInterval(() => advance(), 4500);
    return () => clearInterval(t);
  }, [slide, mode]);

  const advance = () => {
    setExiting(true);
    setTimeout(() => { setSlide(s => (s + 1) % SLIDES.length); setExiting(false); }, 350);
  };

  const goTo = (i: number) => {
    if (i === slide) return;
    setExiting(true);
    setTimeout(() => { setSlide(i); setExiting(false); }, 350);
  };

  /* OTP */
  const handleOtpChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...otp]; next[i] = val; setOtp(next);
    if (val && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[i] && i > 0) otpRefs.current[i - 1]?.focus();
  };

  const handleSendOtp = async () => {
    setError('');
    if (!phone || phone.length < 9) { setError('Enter a valid phone number (9 digits)'); return; }
    try {
      await sendOtp(phone);
      setMode('otp');
    } catch (err: any) {
      const code = err?.code || '';
      const msg  = err?.message || String(err);
      console.error('sendOtp error:', code, msg);
      if (code === 'auth/too-many-requests')       setError('Too many attempts. Wait a few minutes and try again.');
      else if (code === 'auth/invalid-phone-number') setError('Invalid phone number. Example: 712345678');
      else if (code === 'auth/captcha-check-failed') setError('reCAPTCHA failed. Please refresh and try again.');
      else if (code === 'auth/unauthorized-domain')  setError('Domain not authorized. Contact support.');
      else setError(`Error: ${code || msg}`);
    }
  };

  const handleVerify = async () => {
    setError('');
    const code = otp.join('');
    if (code.length !== 6) { setError('Enter all 6 digits'); return; }
    try {
      await verifyOtp(code, name || undefined);
      navigate('/');
    } catch (err: any) {
      const errCode = err?.code || '';
      const msg = err?.message || String(err);
      console.error('verifyOtp error:', errCode, msg);
      if (errCode === 'auth/invalid-verification-code') setError('Wrong code. Check your SMS and try again.');
      else if (errCode === 'auth/code-expired')         setError('Code expired. Request a new one.');
      else setError(`Error: ${errCode || msg}`);
    }
  };

  const cur = SLIDES[slide];

  /* ══════════════════════════════════════════════════════════════
     SLIDES
  ══════════════════════════════════════════════════════════════ */
  if (mode === 'slides') return (
    <div className={`min-h-screen bg-gradient-to-br ${cur.gradientFrom} ${cur.gradientVia} ${cur.gradientTo} flex flex-col transition-colors duration-700 relative overflow-hidden`}>

      {/* Background decorative blobs */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-white/3 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex justify-between items-center px-6 pt-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-secondary-500 rounded-lg flex items-center justify-center shadow-md">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-black text-lg tracking-tight">SafiriSalama</span>
        </div>
        <button
          onClick={() => setMode('login')}
          className="text-white/70 hover:text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/20 hover:border-white/50 transition-all"
        >
          Skip →
        </button>
      </div>

      {/* Slide content */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center transition-all duration-350 ${exiting ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>

        {/* Icon with pulse ring */}
        <div className="relative mb-10">
          {/* Pulse rings */}
          <div className={`absolute inset-0 rounded-full ring-4 ${cur.ringColor} animate-pulse-ring opacity-60`} />
          <div className={`absolute inset-0 rounded-full ring-2 ${cur.ringColor} animate-pulse-ring opacity-40`}
               style={{ animationDelay: '0.5s' }} />

          {/* Main circle */}
          <div className="relative w-44 h-44 rounded-full bg-white/10 backdrop-blur ring-2 ring-white/20 flex items-center justify-center shadow-2xl animate-float">
            <div className="w-32 h-32 rounded-full bg-white/15 flex items-center justify-center">
              {cur.icon}
            </div>
          </div>

          {/* Badge pill */}
          <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 ${cur.badgeBg} text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 whitespace-nowrap`}>
            <span>{cur.badge.icon}</span>
            <span>{cur.badge.label}</span>
          </div>
        </div>

        {/* Text */}
        <h1 className="text-3xl font-black text-white leading-snug mb-4 max-w-xs whitespace-pre-line">
          {cur.title}
        </h1>
        <p className="text-white/75 text-sm leading-relaxed max-w-sm">
          {cur.subtitle}
        </p>
      </div>

      {/* Slide indicators */}
      <div className="relative z-10 flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goTo(i)}
            className={`rounded-full transition-all duration-300 ${i === slide ? `w-8 h-3 ${cur.dotColor}` : 'w-3 h-3 bg-white/30 hover:bg-white/50'}`}
          />
        ))}
      </div>

      {/* CTA buttons */}
      <div className="relative z-10 px-6 pb-12 space-y-3">
        <button
          onClick={() => setMode('register')}
          className="w-full bg-secondary-500 hover:bg-secondary-400 active:scale-95 text-white font-black py-4 rounded-2xl text-base shadow-xl shadow-black/20 flex items-center justify-center gap-2 transition-all duration-200"
        >
          Get Started Free <ChevronRight size={20} />
        </button>
        <button
          onClick={() => setMode('login')}
          className="w-full bg-white/15 hover:bg-white/25 active:scale-95 backdrop-blur text-white font-semibold py-4 rounded-2xl text-base border border-white/25 transition-all duration-200"
        >
          Sign In to My Account
        </button>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     LOGIN / REGISTER
  ══════════════════════════════════════════════════════════════ */
  if (mode === 'login' || mode === 'register') return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">

      {/* Header hero */}
      <div className="flex-shrink-0 pt-14 pb-8 px-6">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-black text-xl">SafiriSalama</span>
        </div>

        <h1 className="text-3xl font-black text-white leading-tight">
          {mode === 'login' ? 'Welcome\nback 👋' : 'Join the\nride! 🚗'}
        </h1>
        <p className="text-white/60 text-sm mt-2">
          {mode === 'login'
            ? 'Sign in to book your ride'
            : 'Create your free account today'}
        </p>

        {/* Stats row */}
        <div className="flex gap-4 mt-6">
          {[
            { val: '500+', label: 'Drivers' },
            { val: '4.8★', label: 'Rating' },
            { val: 'Free', label: 'Download' },
          ].map(s => (
            <div key={s.label} className="flex-1 bg-white/10 backdrop-blur rounded-xl py-3 text-center">
              <p className="text-secondary-400 font-black text-lg leading-none">{s.val}</p>
              <p className="text-white/60 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 pt-7 pb-10 animate-slide-up overflow-auto">

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-7">
          {(['login', 'register'] as const).map(m => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                mode === m
                  ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Name (register only) */}
        {mode === 'register' && (
          <div className="mb-4 animate-fade-in">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
            <div className="flex items-center gap-3 border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:border-secondary-400 focus-within:bg-secondary-50/50 transition-all">
              <User size={18} className="text-secondary-500 flex-shrink-0" />
              <input
                type="text"
                placeholder="e.g. Amina Juma"
                value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 outline-none bg-transparent text-gray-900 text-base"
              />
            </div>
          </div>
        )}

        {/* Phone */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
          <div className="flex items-center gap-3 border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:border-primary-500 focus-within:bg-primary-50/30 transition-all">
            <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
              <span className="text-xl">🇹🇿</span>
              <span className="text-primary-700 font-black text-sm">+255</span>
            </div>
            <Phone size={16} className="text-primary-400 flex-shrink-0" />
            <input
              type="tel"
              placeholder="7XX XXX XXX"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={9}
              className="flex-1 outline-none bg-transparent text-gray-900 text-base font-medium"
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 animate-fade-in">
            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Primary CTA */}
        <button
          id="send-otp-btn"
          onClick={handleSendOtp}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-primary-200 active:scale-95 text-base mb-3"
        >
          {loading
            ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            : <>{mode === 'login' ? 'Send OTP Code' : 'Create Account'} <ArrowRight size={18} /></>
          }
        </button>

        {/* Secondary divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">OR CONTINUE WITH</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Google / social placeholder */}
        <button className="w-full border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm mb-6 active:scale-95">
          <span className="text-xl">📱</span>
          Continue with Google
        </button>

        {/* Feature chips */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { icon: '🔒', label: 'Encrypted', color: 'bg-primary-50 text-primary-700' },
            { icon: '🚗', label: 'Verified', color: 'bg-secondary-50 text-secondary-700' },
            { icon: '📍', label: 'Live GPS', color: 'bg-accent-50 text-accent-700' },
          ].map(f => (
            <div key={f.label} className={`${f.color} rounded-xl py-2.5 px-2 text-center`}>
              <span className="text-base block mb-0.5">{f.icon}</span>
              <span className="text-xs font-semibold">{f.label}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400">
          By continuing you agree to our{' '}
          <a href="/terms" className="text-primary-600 font-semibold">Terms</a>
          {' & '}
          <a href="/privacy" className="text-primary-600 font-semibold">Privacy Policy</a>
        </p>
      </div>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     OTP
  ══════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">

      {/* Header */}
      <div className="flex-shrink-0 pt-14 pb-8 px-6 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-secondary-500 shadow-xl shadow-secondary-900/40 mb-5 animate-float">
          <Shield size={38} className="text-white" />
        </div>
        <h1 className="text-2xl font-black text-white">Verify Your Number</h1>
        <p className="text-white/60 text-sm mt-2 leading-relaxed">
          6-digit code sent to<br />
          <span className="text-secondary-400 font-black text-base">+255 {phone}</span>
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 pt-7 pb-10 animate-slide-up">
        <button
          onClick={() => setMode('login')}
          className="flex items-center gap-1.5 text-primary-600 text-sm font-bold mb-7 hover:gap-2.5 transition-all"
        >
          ← Change number
        </button>

        {/* Progress steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { label: 'Phone',  done: true },
            { label: 'Verify', active: true },
            { label: 'Ride',   done: false },
          ].map((s, i) => (
            <React.Fragment key={s.label}>
              <div className="flex items-center gap-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                  s.done   ? 'bg-accent-500 text-white' :
                  s.active ? 'bg-secondary-500 text-white ring-4 ring-secondary-100' :
                             'bg-gray-100 text-gray-400'
                }`}>
                  {s.done ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-semibold ${s.done || s.active ? 'text-gray-700' : 'text-gray-400'}`}>
                  {s.label}
                </span>
              </div>
              {i < 2 && (
                <div className={`w-8 h-0.5 rounded-full ${s.done ? 'bg-accent-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        <h2 className="text-xl font-black text-gray-900 mb-1">Enter OTP Code</h2>
        <p className="text-gray-400 text-sm mb-7">Type the 6-digit code from your SMS</p>

        {/* OTP boxes */}
        <div className="flex gap-2.5 justify-center mb-7">
          {otp.map((digit, i) => (
            <input
              key={i}
              ref={el => { otpRefs.current[i] = el; }}
              type="tel"
              maxLength={1}
              value={digit}
              onChange={e => handleOtpChange(i, e.target.value)}
              onKeyDown={e => handleOtpKey(i, e)}
              className={`w-12 h-14 text-center text-2xl font-black rounded-xl border-2 outline-none transition-all duration-150 ${
                digit
                  ? 'border-secondary-400 bg-secondary-50 text-secondary-700 scale-105 shadow-md shadow-secondary-100'
                  : 'border-gray-200 text-gray-900 bg-gray-50'
              } focus:border-primary-500 focus:bg-primary-50 focus:scale-105`}
            />
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Verify button */}
        <button
          onClick={handleVerify}
          disabled={loading || otp.join('').length !== 6}
          className="w-full bg-secondary-500 hover:bg-secondary-400 disabled:opacity-50 text-white font-black py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-secondary-200 active:scale-95 text-base mb-3"
        >
          {loading
            ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            : <><CheckCircle size={18} /> Verify & Continue</>
          }
        </button>

        <button
          onClick={handleSendOtp}
          className="w-full border-2 border-primary-100 text-primary-600 font-semibold py-3.5 rounded-2xl hover:bg-primary-50 transition-all text-sm active:scale-95"
        >
          Resend Code
        </button>
      </div>
    </div>
  );
};

export default LoginPage;

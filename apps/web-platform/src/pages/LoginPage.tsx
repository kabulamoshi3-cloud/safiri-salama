/**
 * LoginPage — Animated slides + Phone/Password + Google Sign-In
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, Car, MapPin, Star, Clock,
  ChevronRight, User, Lock, Eye, EyeOff, Zap, CheckCircle,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

/* ─── Slides ──────────────────────────────────────────────────── */
const SLIDES = [
  {
    icon: <Car size={56} strokeWidth={1.5} className="text-white" />,
    badge: '⚡ Fast Pickup',
    title: 'Ride Safely Across\nMorogoro',
    subtitle: 'Book a trusted driver in seconds. Fast, affordable rides to SUA, town and beyond.',
    bg: 'from-primary-900 via-primary-800 to-primary-600',
    dot: 'bg-secondary-400',
  },
  {
    icon: <MapPin size={56} strokeWidth={1.5} className="text-white" />,
    badge: '📡 Live GPS',
    title: 'Track Your Ride\nin Real-Time',
    subtitle: 'Watch your driver approach on a live map. Share your trip for extra safety.',
    bg: 'from-accent-700 via-accent-600 to-accent-500',
    dot: 'bg-secondary-400',
  },
  {
    icon: <Star size={56} strokeWidth={1.5} className="text-white" />,
    badge: '✅ Verified',
    title: 'Top-Rated Verified\nDrivers Only',
    subtitle: 'Every driver passes background checks and is rated by passengers like you.',
    bg: 'from-secondary-700 via-secondary-600 to-secondary-500',
    dot: 'bg-primary-400',
  },
  {
    icon: <Clock size={56} strokeWidth={1.5} className="text-white" />,
    badge: '🧠 Smart ETA',
    title: 'Arrive On Time\nEvery Time',
    subtitle: 'AI traffic prediction gets you there faster. Know your ETA before you book.',
    bg: 'from-dark-900 via-primary-900 to-primary-800',
    dot: 'bg-secondary-400',
  },
];

type Mode = 'slides' | 'login' | 'register';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, login, loginGoogle, loading } = useAuthStore();

  const [mode,        setMode]        = useState<Mode>('slides');
  const [slide,       setSlide]       = useState(0);
  const [exiting,     setExiting]     = useState(false);
  const [phone,       setPhone]       = useState('');
  const [password,    setPassword]    = useState('');
  const [confirm,     setConfirm]     = useState('');
  const [name,        setName]        = useState('');
  const [showPass,    setShowPass]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error,       setError]       = useState('');
  const [success,     setSuccess]     = useState('');

  /* auto-advance slides */
  useEffect(() => {
    if (mode !== 'slides') return;
    const t = setInterval(() => {
      setExiting(true);
      setTimeout(() => { setSlide(s => (s + 1) % SLIDES.length); setExiting(false); }, 350);
    }, 4500);
    return () => clearInterval(t);
  }, [slide, mode]);

  const goSlide = (i: number) => {
    setExiting(true);
    setTimeout(() => { setSlide(i); setExiting(false); }, 350);
  };

  const switchMode = (m: Mode) => {
    setError(''); setSuccess('');
    setPhone(''); setPassword(''); setConfirm(''); setName('');
    setMode(m);
  };

  /* password strength */
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : password.match(/[A-Z]/) && password.match(/[0-9]/) ? 4
    : 3;
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColor = ['', 'bg-red-400', 'bg-yellow-400', 'bg-accent-500', 'bg-accent-600'];

  /* register handler */
  const handleRegister = async () => {
    setError(''); setSuccess('');
    if (!name.trim())        return setError('Please enter your full name');
    if (phone.length < 9)    return setError('Enter a valid phone number (9 digits)');
    if (password.length < 6) return setError('Password must be at least 6 characters');
    if (password !== confirm) return setError('Passwords do not match');
    try {
      await register(`+255${phone}`, password, name.trim());
      navigate('/');
    } catch (err: any) { setError(err.message); }
  };

  /* login handler */
  const handleLogin = async () => {
    setError(''); setSuccess('');
    if (phone.length < 9)  return setError('Enter a valid phone number (9 digits)');
    if (!password)         return setError('Enter your password');
    try {
      await login(`+255${phone}`, password);
      navigate('/');
    } catch (err: any) { setError(err.message); }
  };

  /* google handler */
  const handleGoogle = async () => {
    setError('');
    try {
      await loginGoogle();
      navigate('/');
    } catch (err: any) {
      if (err?.message === '__CANCELLED__') return; // user closed popup - silent
      setError(err?.message || 'Google sign-in failed. Please try again.');
    }
  };

  const cur = SLIDES[slide];

  /* ═══════════════════════════ SLIDES ═══════════════════════════ */
  if (mode === 'slides') return (
    <div className={`min-h-screen bg-gradient-to-br ${cur.bg} flex flex-col transition-colors duration-700 relative overflow-hidden`}>
      <div className="absolute top-0 right-0 w-72 h-72 bg-white/5 rounded-full -translate-y-1/3 translate-x-1/3 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-56 h-56 bg-black/10 rounded-full translate-y-1/3 -translate-x-1/3 pointer-events-none" />

      {/* Top bar */}
      <div className="relative z-10 flex justify-between items-center px-6 pt-14">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-secondary-500 rounded-lg flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <span className="text-white font-black text-lg">SafiriSalama</span>
        </div>
        <button onClick={() => switchMode('login')}
          className="text-white/70 hover:text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/20 transition-all">
          Skip →
        </button>
      </div>

      {/* Content */}
      <div className={`relative z-10 flex-1 flex flex-col items-center justify-center px-8 text-center transition-all duration-350 ${exiting ? 'opacity-0 scale-95 translate-y-4' : 'opacity-100 scale-100 translate-y-0'}`}>
        <div className="relative mb-10">
          <div className="w-44 h-44 rounded-full bg-white/10 backdrop-blur ring-2 ring-white/20 flex items-center justify-center shadow-2xl animate-float">
            <div className="w-32 h-32 rounded-full bg-white/15 flex items-center justify-center">
              {cur.icon}
            </div>
          </div>
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-secondary-500 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
            {cur.badge}
          </div>
        </div>
        <h1 className="text-3xl font-black text-white leading-snug mb-4 max-w-xs whitespace-pre-line">{cur.title}</h1>
        <p className="text-white/75 text-sm leading-relaxed max-w-sm">{cur.subtitle}</p>
      </div>

      {/* Dots */}
      <div className="relative z-10 flex justify-center gap-2 mb-8">
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => goSlide(i)}
            className={`rounded-full transition-all duration-300 ${i === slide ? `w-8 h-3 ${cur.dot}` : 'w-3 h-3 bg-white/30'}`} />
        ))}
      </div>

      {/* CTA */}
      <div className="relative z-10 px-6 pb-12 space-y-3">
        <button onClick={() => switchMode('register')}
          className="w-full bg-secondary-500 hover:bg-secondary-400 active:scale-95 text-white font-black py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2 transition-all">
          Get Started Free <ChevronRight size={20} />
        </button>
        <button onClick={() => switchMode('login')}
          className="w-full bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold py-4 rounded-2xl border border-white/25 transition-all">
          Sign In to My Account
        </button>
      </div>
    </div>
  );

  /* ═══════════════════════ LOGIN / REGISTER ══════════════════════ */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-primary-900 via-primary-800 to-primary-700">

      {/* Header */}
      <div className="flex-shrink-0 pt-14 pb-6 px-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-secondary-500 rounded-xl flex items-center justify-center shadow-lg">
            <Zap size={20} className="text-white" />
          </div>
          <span className="text-white font-black text-xl">SafiriSalama</span>
        </div>
        <h1 className="text-3xl font-black text-white leading-tight">
          {mode === 'login' ? 'Welcome\nback 👋' : 'Create\naccount 🚗'}
        </h1>
        <p className="text-white/60 text-sm mt-2">
          {mode === 'login' ? 'Sign in to book your ride' : 'Join riders across Morogoro'}
        </p>
      </div>

      {/* Card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 pt-7 pb-10 overflow-auto animate-slide-up">

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          {(['login', 'register'] as Mode[]).map(m => (
            <button key={m} onClick={() => switchMode(m)}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200 ${
                mode === m ? 'bg-primary-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'
              }`}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        {/* Google Button */}
        <button onClick={handleGoogle}
          className="w-full border-2 border-gray-100 bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3.5 rounded-2xl transition-all flex items-center justify-center gap-3 text-sm mb-5 active:scale-95 shadow-sm">
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400 font-medium">OR USE PHONE</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Name — register only */}
        {mode === 'register' && (
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Full Name</label>
            <div className="flex items-center gap-3 border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:border-secondary-400 transition-all">
              <User size={18} className="text-secondary-500 flex-shrink-0" />
              <input type="text" placeholder="e.g. Amina Juma" value={name}
                onChange={e => setName(e.target.value)}
                className="flex-1 outline-none bg-transparent text-gray-900 text-base" />
            </div>
          </div>
        )}

        {/* Phone */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Phone Number</label>
          <div className="flex items-center gap-3 border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:border-primary-500 transition-all">
            <div className="flex items-center gap-2 pr-3 border-r border-gray-200">
              <span className="text-xl">🇹🇿</span>
              <span className="text-primary-700 font-black text-sm">+255</span>
            </div>
            <Phone size={16} className="text-primary-400 flex-shrink-0" />
            <input type="tel" placeholder="7XX XXX XXX" value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              maxLength={9}
              className="flex-1 outline-none bg-transparent text-gray-900 text-base font-medium" />
          </div>
        </div>

        {/* Password */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Password</label>
          <div className="flex items-center gap-3 border-2 border-gray-100 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:border-primary-500 transition-all">
            <Lock size={18} className="text-primary-400 flex-shrink-0" />
            <input type={showPass ? 'text' : 'password'} placeholder="Min. 6 characters" value={password}
              onChange={e => setPassword(e.target.value)}
              className="flex-1 outline-none bg-transparent text-gray-900 text-base" />
            <button type="button" onClick={() => setShowPass(v => !v)} className="text-gray-400 hover:text-gray-600">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {/* Strength bar — register only */}
          {mode === 'register' && password.length > 0 && (
            <div className="mt-2 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1,2,3,4].map(i => (
                  <div key={i} className={`h-1.5 flex-1 rounded-full transition-all ${i <= strength ? strengthColor[strength] : 'bg-gray-200'}`} />
                ))}
              </div>
              <span className={`text-xs font-semibold ${strength >= 3 ? 'text-accent-600' : strength === 2 ? 'text-yellow-500' : 'text-red-500'}`}>
                {strengthLabel[strength]}
              </span>
            </div>
          )}
        </div>

        {/* Confirm Password — register only */}
        {mode === 'register' && (
          <div className="mb-5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirm Password</label>
            <div className={`flex items-center gap-3 border-2 bg-gray-50 rounded-2xl px-4 py-3.5 focus-within:border-primary-500 transition-all ${
              confirm && password !== confirm ? 'border-red-300' : 'border-gray-100'
            }`}>
              <Lock size={18} className="text-primary-400 flex-shrink-0" />
              <input type={showConfirm ? 'text' : 'password'} placeholder="Re-enter password" value={confirm}
                onChange={e => setConfirm(e.target.value)}
                className="flex-1 outline-none bg-transparent text-gray-900 text-base" />
              <button type="button" onClick={() => setShowConfirm(v => !v)} className="text-gray-400 hover:text-gray-600">
                {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {confirm && password === confirm && (
              <p className="text-accent-600 text-xs mt-1 flex items-center gap-1"><CheckCircle size={12} /> Passwords match</p>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2 animate-fade-in">
            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {/* Success */}
        {success && (
          <div className="bg-accent-50 border border-accent-100 rounded-xl px-4 py-3 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-accent-600 flex-shrink-0" />
            <p className="text-accent-700 text-sm font-medium">{success}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
          className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary-200 active:scale-95 text-base"
        >
          {loading
            ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            : <>{mode === 'login' ? 'Sign In' : 'Create Account'} <ArrowRight size={18} /></>
          }
        </button>

        {/* Feature chips */}
        <div className="grid grid-cols-3 gap-2 mt-6">
          {[
            { icon: '🔒', label: 'Encrypted', color: 'bg-primary-50 text-primary-700' },
            { icon: '🚗', label: 'Verified',  color: 'bg-secondary-50 text-secondary-700' },
            { icon: '📍', label: 'Live GPS',  color: 'bg-accent-50 text-accent-700' },
          ].map(f => (
            <div key={f.label} className={`${f.color} rounded-xl py-2.5 px-2 text-center`}>
              <span className="text-base block mb-0.5">{f.icon}</span>
              <span className="text-xs font-semibold">{f.label}</span>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-5">
          By continuing you agree to our{' '}
          <a href="/terms" className="text-primary-600 font-semibold">Terms</a>
          {' & '}
          <a href="/privacy" className="text-primary-600 font-semibold">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

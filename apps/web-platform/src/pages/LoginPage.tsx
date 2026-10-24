/**
 * LoginPage — Animated slides + Phone/Password
 */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Phone, ArrowRight, Car, MapPin, Star, Clock,
  ChevronRight, User, Lock, Eye, EyeOff, Zap, CheckCircle, Globe,
} from 'lucide-react';
import { useAuthStore } from '../store/auth';

/* ─── Translations ──────────────────────────────────────────────── */
const T = {
  en: {
    skip: 'Skip →',
    getStarted: 'Get Started Free',
    signIn: 'Sign In to My Account',
    slides: [
      { badge: '🚀 Lightning Fast', title: 'Your Ride in\n60 Seconds', subtitle: 'Tap, book, ride. The fastest way to get anywhere in Morogoro. No waiting, no hassle.' },
      { badge: '📍 Live Tracking', title: 'Watch Your Driver\nCome to You', subtitle: 'See exactly where your driver is every second. Share your trip with loved ones for peace of mind.' },
      { badge: '⭐ 5-Star Service', title: 'Safe, Trusted\nProfessional Drivers', subtitle: 'Every driver is verified, rated, and background-checked. Your safety is our priority.' },
      { badge: '💰 Best Prices', title: 'Affordable Rides\nEvery Day', subtitle: 'Fair, transparent pricing. No surge fees, no surprises. Get where you need to go without breaking the bank.' },
    ],
    namePlaceholder: 'Full Name',
    phonePlaceholder: 'Phone number (e.g. 0712 345 678)',
    passwordPlaceholder: 'Password',
    confirmPlaceholder: 'Confirm Password',
    registerBtn: 'Create Account',
    loginBtn: 'Sign In',
    noAccount: "Don't have an account?",
    hasAccount: 'Already have an account?',
    register: 'Register',
    login: 'Login',
  },
  sw: {
    skip: 'Ruka →',
    getStarted: 'Anza Bure',
    signIn: 'Ingia Akaunti Yangu',
    slides: [
      { badge: '🚀 Haraka Sana', title: 'Safari Yako\nNdani ya Sekunde 60', subtitle: 'Bonyeza, weka agizo, safiri. Njia ya haraka zaidi kufika popote Morogoro.' },
      { badge: '📍 Ufuatiliaji wa Moja kwa Moja', title: 'Angalia Dereva\nAnakuja Kwako', subtitle: 'Ona dereva wako kila sekunde. Shiriki safari yako na wapendwa kwa usalama zaidi.' },
      { badge: '⭐ Huduma ya Daraja la 5', title: 'Madereva Salama\nWaliothibitishwa', subtitle: 'Kila dereva amechunguzwa, amepewa alama, na amepita ukaguzi. Usalama wako ni kipaumbele.' },
      { badge: '💰 Bei Nafuu', title: 'Safari za Gharama\nNafuu Kila Siku', subtitle: 'Bei ya haki na wazi. Hakuna ada za ziada, hakuna mshangao. Fika unakotaka bila wasiwasi.' },
    ],
    namePlaceholder: 'Jina Kamili',
    phonePlaceholder: 'Nambari ya simu (mfano 0712 345 678)',
    passwordPlaceholder: 'Nenosiri',
    confirmPlaceholder: 'Thibitisha Nenosiri',
    registerBtn: 'Fungua Akaunti',
    loginBtn: 'Ingia',
    noAccount: 'Huna akaunti?',
    hasAccount: 'Una akaunti tayari?',
    register: 'Jisajili',
    login: 'Ingia',
  },
} as const;

type Lang = 'en' | 'sw';

/* ─── Slide visuals (icons + colors only, text comes from T) ──── */
const SLIDE_VISUALS = [
  { icon: <Zap size={64} strokeWidth={1.5} className="text-white drop-shadow-lg" />, bg: 'from-blue-600 via-purple-600 to-pink-500', dot: 'bg-yellow-400' },
  { icon: <MapPin size={64} strokeWidth={1.5} className="text-white drop-shadow-lg" />, bg: 'from-green-600 via-teal-600 to-cyan-500', dot: 'bg-lime-400' },
  { icon: <CheckCircle size={64} strokeWidth={1.5} className="text-white drop-shadow-lg" />, bg: 'from-orange-600 via-red-600 to-pink-600', dot: 'bg-yellow-300' },
  { icon: <Car size={64} strokeWidth={1.5} className="text-white drop-shadow-lg" />, bg: 'from-indigo-600 via-blue-700 to-purple-700', dot: 'bg-green-400' },
];

type Mode = 'slides' | 'login' | 'register';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { register, login, loginGoogle, loading } = useAuthStore();

  const [lang,        setLang]        = useState<Lang>('en');
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
  const [showLangMenu, setShowLangMenu] = useState(false);

  const t = T[lang];

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

  const cur = SLIDE_VISUALS[slide];
  const curText = t.slides[slide];

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
          <span className="text-white font-black text-lg">Safiri Haraka</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="text-white/70 hover:text-white p-2 rounded-full border border-white/20 transition-all flex items-center gap-1"
              aria-label="Change language"
            >
              <Globe size={18} />
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50">
                <button
                  onClick={() => { setLang('en'); setShowLangMenu(false); }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 ${lang === 'en' ? 'bg-gray-50 font-semibold' : ''}`}
                >
                  <span className="text-lg">🇬🇧</span>
                  <span className="text-sm text-gray-700">English</span>
                </button>
                <button
                  onClick={() => { setLang('sw'); setShowLangMenu(false); }}
                  className={`w-full px-4 py-2 text-left hover:bg-gray-100 transition-colors flex items-center gap-2 ${lang === 'sw' ? 'bg-gray-50 font-semibold' : ''}`}
                >
                  <span className="text-lg">🇹🇿</span>
                  <span className="text-sm text-gray-700">Kiswahili</span>
                </button>
              </div>
            )}
          </div>
          <button onClick={() => switchMode('login')}
            className="text-white/70 hover:text-white text-sm font-semibold px-4 py-2 rounded-full border border-white/20 transition-all">
            {t.skip}
          </button>
        </div>
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
            {curText.badge}
          </div>
        </div>
        <h1 className="text-3xl font-black text-white leading-snug mb-4 max-w-xs whitespace-pre-line">{curText.title}</h1>
        <p className="text-white/75 text-sm leading-relaxed max-w-sm">{curText.subtitle}</p>
      </div>

      {/* Dots */}
      <div className="relative z-10 flex justify-center gap-2 mb-8">
        {SLIDE_VISUALS.map((_, i) => (
          <button key={i} onClick={() => goSlide(i)}
            className={`rounded-full transition-all duration-300 ${i === slide ? `w-8 h-3 ${cur.dot}` : 'w-3 h-3 bg-white/30'}`} />
        ))}
      </div>

      {/* CTA */}
      <div className="relative z-10 px-6 pb-12 space-y-3">
        <button onClick={() => switchMode('register')}
          className="w-full bg-secondary-500 hover:bg-secondary-400 active:scale-95 text-white font-black py-4 rounded-2xl text-base shadow-xl flex items-center justify-center gap-2 transition-all">
          {t.getStarted} <ChevronRight size={20} />
        </button>
        <button onClick={() => switchMode('login')}
          className="w-full bg-white/15 hover:bg-white/25 active:scale-95 text-white font-semibold py-4 rounded-2xl border border-white/25 transition-all">
          {t.signIn}
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
          <span className="text-white font-black text-xl">Safiri Haraka</span>
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

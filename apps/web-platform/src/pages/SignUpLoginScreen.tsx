/**
 * Screen 2: Sign Up / Log In
 * Google/Apple social auth + manual form + language switcher
 */
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Phone, Mail, Lock, Eye, EyeOff, ArrowRight, Globe } from 'lucide-react';
import { useAuthStore } from '../store/auth';
import { i18n } from '../i18n';

const SignUpLoginScreen: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, login, loginGoogle, loading } = useAuthStore();

  const [mode, setMode] = useState<'login' | 'register'>(
    searchParams.get('mode') === 'register' ? 'register' : 'login'
  );
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => {
    return i18n.subscribe(() => forceUpdate());
  }, []);

  const currentLang = i18n.getLanguage();

  const handleSubmit = async () => {
    setError('');
    if (mode === 'register') {
      if (!name.trim()) return setError(i18n.t('login.err_name'));
      if (phone.length < 9) return setError(i18n.t('login.err_phone'));
      if (password.length < 6) return setError(i18n.t('login.err_password_short'));
      try {
        await register(`+255${phone}`, password, name.trim(), email.trim() || undefined);
        navigate('/');
      } catch (err: any) {
        setError(err.message);
      }
    } else {
      if (phone.length < 9) return setError(i18n.t('login.err_phone'));
      if (!password) return setError(i18n.t('login.err_password_required'));
      try {
        await login(`+255${phone}`, password);
        navigate('/');
      } catch (err: any) {
        setError(err.message);
      }
    }
  };

  const handleGoogle = async () => {
    setError('');
    try {
      await loginGoogle();
      navigate('/');
    } catch (err: any) {
      if (err?.message === '__CANCELLED__') return;
      setError(err?.message || i18n.t('login.google_failed'));
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#2563EB] to-[#1e40af] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 pt-14 pb-6 px-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-white font-black text-3xl mb-1">
              {mode === 'register' ? i18n.t('create_account') : i18n.t('welcome_back')}
            </h1>
            <p className="text-white/70 text-sm">
              {mode === 'register'
                ? i18n.t('login.join_subtitle')
                : i18n.t('login.sign_in_subtitle')}
            </p>
          </div>
          {/* Language Switcher */}
          <div className="relative">
            <button
              onClick={() => setShowLangMenu(!showLangMenu)}
              className="text-white/80 hover:text-white p-2 rounded-full border border-white/30 flex items-center gap-1 transition"
            >
              <Globe size={18} />
              <span className="text-xs font-bold">{currentLang === 'en' ? 'EN' : 'SW'}</span>
            </button>
            {showLangMenu && (
              <div className="absolute right-0 mt-2 w-36 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
                <button
                  onClick={() => { i18n.setLanguage('en'); setShowLangMenu(false); }}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition ${currentLang === 'en' ? 'font-bold text-[#2563EB]' : 'text-gray-700'}`}
                >
                  <span>🇬🇧</span> English
                </button>
                <button
                  onClick={() => { i18n.setLanguage('sw'); setShowLangMenu(false); }}
                  className={`w-full px-4 py-2 text-left flex items-center gap-2 hover:bg-gray-50 transition ${currentLang === 'sw' ? 'font-bold text-[#2563EB]' : 'text-gray-700'}`}
                >
                  <span>🇹🇿</span> Kiswahili
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="flex-1 bg-white rounded-t-3xl shadow-2xl px-6 py-8 overflow-auto">
        {/* Social Sign-In */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogle}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            {i18n.t('login.continue_google') || 'Continue with Google'}
          </button>
          <button className="w-full bg-black hover:bg-gray-900 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
            </svg>
            {i18n.t('login.continue_apple') || 'Continue with Apple'}
          </button>
        </div>

        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-gray-400 text-sm font-medium">{i18n.t('or') || 'or'}</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
          {(['login', 'register'] as const).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(''); }}
              className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${
                mode === m ? 'bg-[#2563EB] text-white shadow' : 'text-gray-500'
              }`}
            >
              {m === 'login' ? i18n.t('login') : i18n.t('sign_up')}
            </button>
          ))}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{i18n.t('full_name')}</label>
              <div className="flex items-center gap-3 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus-within:border-[#2563EB]">
                <User size={18} className="text-gray-400" />
                <input
                  type="text"
                  placeholder={i18n.t('enter_your_name')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 outline-none bg-transparent text-gray-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{i18n.t('phone_number')}</label>
            <div className="flex items-center gap-3 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus-within:border-[#2563EB]">
              <div className="flex items-center gap-2 pr-3 border-r border-gray-300">
                <span className="text-xl">🇹🇿</span>
                <span className="text-[#2563EB] font-black text-sm">+255</span>
              </div>
              <Phone size={16} className="text-gray-400" />
              <input
                type="tel"
                placeholder="7XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="flex-1 outline-none bg-transparent text-gray-900 font-medium"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{i18n.t('email')} ({i18n.t('optional') || 'optional'})</label>
              <div className="flex items-center gap-3 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus-within:border-[#2563EB]">
                <Mail size={18} className="text-gray-400" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 outline-none bg-transparent text-gray-900"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">{i18n.t('password')}</label>
            <div className="flex items-center gap-3 border-2 border-gray-200 bg-gray-50 rounded-xl px-4 py-3 focus-within:border-[#2563EB]">
              <Lock size={18} className="text-gray-400" />
              <input
                type={showPass ? 'text' : 'password'}
                placeholder={i18n.t('login.min_chars')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="flex-1 outline-none bg-transparent text-gray-900"
              />
              <button type="button" onClick={() => setShowPass(!showPass)} className="text-gray-400">
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full mt-6 bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-black py-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg active:scale-95"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
          ) : (
            <>
              {mode === 'register' ? i18n.t('sign_up') : i18n.t('login')}
              <ArrowRight size={18} />
            </>
          )}
        </button>

        <p className="text-center text-sm text-gray-500 mt-4">
          {mode === 'register' ? i18n.t('have_account') : i18n.t('no_account')}{' '}
          <button
            onClick={() => { setMode(mode === 'register' ? 'login' : 'register'); setError(''); }}
            className="text-[#2563EB] font-semibold"
          >
            {mode === 'register' ? i18n.t('login') : i18n.t('sign_up')}
          </button>
        </p>
      </div>
    </div>
  );
};

export default SignUpLoginScreen;

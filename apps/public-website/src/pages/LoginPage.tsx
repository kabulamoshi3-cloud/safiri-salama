import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login } from '../services/auth';
import { pubI18n } from '../i18n';
import api from '../services/api';

// Firebase Google Sign-In
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            'AIzaSyBkDgINXZ6talT1JByhytoTsiUNv8JVoo8',
  authDomain:        'safiri-salama-838eb.firebaseapp.com',
  projectId:         'safiri-salama-838eb',
  storageBucket:     'safiri-salama-838eb.firebasestorage.app',
  messagingSenderId: '820851879376',
  appId:             '1:820851879376:web:e45eff1a284bc5cf0f5dd5',
};
const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('email');
googleProvider.addScope('profile');

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return pubI18n.subscribe(() => forceUpdate()); }, []);

  const registered = searchParams.get('registered');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let loginPhone = email.trim();
      if (/^\d/.test(loginPhone)) {
        if (!loginPhone.startsWith('+')) {
          loginPhone = loginPhone.startsWith('0')
            ? '+255' + loginPhone.substring(1)
            : '+255' + loginPhone;
        }
      }
      const data = await login({ phone: loginPhone, password });
      localStorage.setItem('token', data.token);
      if (data.user?.userType === 'driver') navigate('/driver');
      else navigate('/');
    } catch (err) {
      setError(pubI18n.t('login_error'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const idToken = await result.user.getIdToken();
      let name = result.user.displayName || '';
      let userEmail = result.user.email || '';
      const res = await api.post('/auth/firebase-verify', {
        id_token: idToken, name, email: userEmail,
      });
      localStorage.setItem('token', res.data.token);
      navigate('/');
    } catch (err: any) {
      if (err?.code === 'auth/popup-closed-by-user' || err?.code === 'auth/cancelled-popup-request') return;
      if (err?.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized for Google Sign-In. Please contact support.');
        return;
      }
      setError(err?.message || 'Google sign-in failed. Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{pubI18n.t('welcome_back')}</h1>
          <p className="text-gray-600">{pubI18n.t('sign_in_subtitle')}</p>
        </div>

        {registered === 'true' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-center">{pubI18n.t('login_success')}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Role Toggle */}
          <div className="flex gap-2 mb-6">
            {(['passenger', 'driver'] as const).map(r => (
              <button key={r}
                onClick={() => setRole(r)}
                className={`flex-1 py-3 rounded-xl font-semibold transition-colors ${
                  role === r ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}>
                {pubI18n.t(r)}
              </button>
            ))}
          </div>

          {/* Google Sign-In */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full bg-[#2563EB] hover:bg-[#1d4ed8] disabled:opacity-50 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-3 transition mb-3"
          >
            {googleLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                {pubI18n.t('continue_google')}
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-gray-400 text-sm">{pubI18n.t('or')}</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Phone/Password Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('email_phone')}</label>
              <input
                type="text"
                placeholder={pubI18n.t('email_phone_placeholder')}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('password')}</label>
              <input
                type="password"
                placeholder={pubI18n.t('password_placeholder')}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
              />
            </div>
            <div>
              <a href="/forgot-password" className="text-blue-600 hover:underline text-sm">
                {pubI18n.t('forgot_password')}
              </a>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition"
            >
              {loading ? pubI18n.t('signing_in') : pubI18n.t('sign_in')}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6 text-sm">
            {pubI18n.t('no_account')}{' '}
            <Link to="/register" className="text-blue-600 hover:underline font-semibold">
              {pubI18n.t('register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

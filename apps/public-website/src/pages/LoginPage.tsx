import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Circle } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
L.Marker.prototype.options.icon = L.icon({ iconUrl, shadowUrl: iconShadow, iconSize: [25,41], iconAnchor: [12,41] });
import { login } from '../services/auth';
import { pubI18n } from '../i18n';
import api from '../services/api';

// Firebase Google Sign-In
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';

const firebaseConfig = {
  apiKey:            import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:        import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:         import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:     import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:             import.meta.env.VITE_FIREBASE_APP_ID,
};

const googleProvider = new GoogleAuthProvider();
let fbAuth: ReturnType<typeof getAuth> | null = null;
try {
  if (firebaseConfig.apiKey) {
    const fbApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    fbAuth = getAuth(fbApp);
    googleProvider.addScope('email');
    googleProvider.addScope('profile');
  }
} catch (e) {
  console.warn('Firebase init failed:', e);
}

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
      const digits = loginPhone.replace(/\D/g, '');
      if (loginPhone.startsWith('+')) {
        loginPhone = '+' + digits;
      } else if (digits) {
        loginPhone = digits.startsWith('255')
          ? '+' + digits
          : '+255' + (digits.startsWith('0') ? digits.substring(1) : digits);
      }
      const data = await login({ phone: loginPhone, password });
      localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err: any) {
      const status = err.response?.status;
      if (!err.response) {
        setError('Cannot connect to server. Check your internet connection.');
      } else if (status === 401) {
        setError('Incorrect phone number or password.');
      } else if (status === 403) {
        setError('Your account has been suspended. Contact support.');
      } else {
        setError(err.response?.data?.error || pubI18n.t('login_error'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError('');
    if (!fbAuth) { setError('Google sign-in is not configured.'); return; }
    setGoogleLoading(true);
    try {
      const result = await signInWithPopup(fbAuth, googleProvider);
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

  // Morogoro nearby driver dots (fake but realistic)
  const driverDots: [number, number][] = [
    [-6.8200, 37.6600], [-6.8050, 37.6750], [-6.8300, 37.6800],
    [-6.8100, 37.6550], [-6.8250, 37.6700], [-6.7950, 37.6650],
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left: Live Map */}
      <div className="hidden md:block md:w-1/2 relative">
        <MapContainer
          center={[-6.8160, 37.6677]}
          zoom={13}
          style={{ height: '100%', width: '100%', minHeight: '100vh' }}
          zoomControl={false}
          dragging={false}
          scrollWheelZoom={false}
          doubleClickZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* City center marker */}
          <Marker position={[-6.8160, 37.6677]} />
          {/* Nearby drivers (green dots) */}
          {driverDots.map(([lat, lng], i) => (
            <Circle key={i} center={[lat, lng]} radius={80} pathOptions={{ color: '#128901', fillColor: '#128901', fillOpacity: 0.8 }} />
          ))}
        </MapContainer>
        {/* Overlay text on map */}
        <div className="absolute bottom-8 left-8 right-8 bg-[#0F172A]/80 backdrop-blur rounded-2xl p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-[#128901] rounded-full animate-pulse" />
            <span className="text-sm font-semibold">6 drivers nearby in Morogoro</span>
          </div>
          <p className="text-xs text-white/60">Sign in to book your ride now</p>
        </div>
      </div>

      {/* Right: Login Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center py-12 px-6 bg-[#F3F5F9]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center">
              <span className="text-white font-black">SH</span>
            </div>
            <span className="text-2xl font-black text-[#0F172A]">Safiri Haraka</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{pubI18n.t('welcome_back')}</h1>
          <p className="text-gray-600">{pubI18n.t('sign_in_subtitle')}</p>
        </div>

        {registered === 'true' && searchParams.get('role') === 'driver' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <p className="text-yellow-800 text-center">
              Registration received! Your driver account is under review. You will be notified once approved.
            </p>
          </div>
        )}
        {registered === 'true' && !searchParams.get('role') && (
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
                <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('phone')}</label>
              <input
                type="tel"
                placeholder={pubI18n.t('phone_placeholder')}
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
              <Link to="/forgot-password" className="text-blue-600 hover:underline text-sm">
                {pubI18n.t('forgot_password')}
              </Link>
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
    </div>
  );
};

export default LoginPage;

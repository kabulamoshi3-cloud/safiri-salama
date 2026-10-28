import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+')) return '+' + digits;
  if (digits.startsWith('255')) return '+' + digits;
  if (digits.startsWith('0')) return '+255' + digits.slice(1);
  return '+255' + digits;
}

const VEHICLE_TYPES = ['car', 'bajaji', 'boda-boda'] as const;
type VehicleType = typeof VEHICLE_TYPES[number];

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [plateNumber, setPlateNumber] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('car');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const fullPhone = normalizePhone(phone);
    if (fullPhone.replace(/\D/g, '').length < 11) {
      setError('Please enter a valid phone number (e.g. 0712 345 678)');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'register') {
        if (!name.trim()) { setError('Please enter your full name'); setLoading(false); return; }
        if (password !== confirmPassword) { setError('Passwords do not match'); setLoading(false); return; }
        if (!licenseNumber.trim()) { setError('Please enter your license number'); setLoading(false); return; }
        if (!plateNumber.trim()) { setError('Please enter your vehicle plate number'); setLoading(false); return; }
        const res = await api.post('/auth/register', {
          phone: fullPhone,
          password,
          name: name.trim(),
          user_type: 'driver',
          license_number: licenseNumber.trim(),
          plate_number: plateNumber.trim(),
          vehicle_type: vehicleType,
        });
        localStorage.setItem('driver_token', res.data.token);
      } else {
        const res = await api.post('/auth/login', { phone: fullPhone, password });
        if (res.data.user?.userType !== 'driver') {
          setError('This account is not a driver account. Please register as a driver.');
          setLoading(false);
          return;
        }
        localStorage.setItem('driver_token', res.data.token);
      }
      navigate('/');
    } catch (err: any) {
      const status = err.response?.status;
      if (!err.response) {
        setError('Cannot connect to server. Check your internet connection.');
      } else if (status === 401) {
        setError('Incorrect phone number or password.');
      } else if (status === 403) {
        setError('Your account has been suspended. Contact support.');
      } else if (status === 400 && err.response?.data?.error?.toLowerCase().includes('already exists')) {
        setError('An account with this phone number already exists. Try logging in.');
      } else {
        setError(err.response?.data?.error || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const green = '#2e7d32';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0fdf4', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '440px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '36px 32px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🏍️</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: green, margin: 0 }}>Safiri Haraka Driver</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            {mode === 'login' ? 'Sign in to start earning.' : 'Register as a driver.'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', background: '#f0fdf4', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
          {(['login', 'register'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'all 0.15s',
                background: mode === m ? green : 'transparent',
                color: mode === m ? '#fff' : '#6b7280',
              }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {mode === 'register' && (
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#374151' }}>Full Name</label>
              <input type="text" placeholder="John Doe" value={name} onChange={(e) => setName(e.target.value)} required
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#374151' }}>Phone Number</label>
            <input type="tel" placeholder="+255 7XX XXX XXX or 07XX XXX XXX" value={phone} onChange={(e) => setPhone(e.target.value)} required
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          <div>
            <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#374151' }}>Password</label>
            <input type="password" placeholder="Min. 6 characters" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#374151' }}>Confirm Password</label>
                <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '8px', color: '#374151' }}>Vehicle Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {VEHICLE_TYPES.map((type) => (
                    <button key={type} type="button" onClick={() => setVehicleType(type)}
                      style={{ flex: 1, padding: '10px 6px', border: `2px solid ${vehicleType === type ? green : '#d1d5db'}`, borderRadius: '8px', background: vehicleType === type ? '#f0fdf4' : '#fff', color: vehicleType === type ? green : '#6b7280', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#374151' }}>License Number</label>
                <input type="text" placeholder="DL-1234567" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} required
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#374151' }}>Vehicle Plate Number</label>
                <input type="text" placeholder="ABC 123" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value.toUpperCase())} required
                  style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
            </>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', color: '#b91c1c', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: '13px', background: loading ? '#6b7280' : green, color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s', marginTop: '4px' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Driver Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', marginTop: '20px' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: green, fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (value.trim().startsWith('+')) return '+' + digits;
  if (digits.startsWith('255')) return '+' + digits;
  if (digits.startsWith('0')) return '+255' + digits.slice(1);
  return '+255' + digits;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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
        const res = await api.post('/auth/register', {
          phone: fullPhone,
          password,
          name: name.trim(),
          user_type: 'passenger',
        });
        localStorage.setItem('safiri_token', res.data.token);
      } else {
        const res = await api.post('/auth/login', { phone: fullPhone, password });
        localStorage.setItem('safiri_token', res.data.token);
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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '36px 32px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '40px', marginBottom: '8px' }}>🚗</div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1a73e8', margin: 0 }}>Safiri Haraka</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '4px' }}>
            {mode === 'login' ? 'Welcome back! Sign in to book your ride.' : 'Create your passenger account.'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '10px', padding: '4px', marginBottom: '24px' }}>
          {(['login', 'register'] as const).map((m) => (
            <button key={m} onClick={() => { setMode(m); setError(''); }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px', transition: 'all 0.15s',
                background: mode === m ? '#1a73e8' : 'transparent',
                color: mode === m ? '#fff' : '#6b7280',
              }}>
              {m === 'login' ? 'Sign In' : 'Register'}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            <div>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '13px', marginBottom: '6px', color: '#374151' }}>Confirm Password</label>
              <input type="password" placeholder="Re-enter password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #d1d5db', borderRadius: '10px', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px', color: '#b91c1c', fontSize: '14px' }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading}
            style={{ padding: '13px', background: loading ? '#93c5fd' : '#1a73e8', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '16px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background 0.15s' }}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <p style={{ textAlign: 'center', color: '#6b7280', fontSize: '13px', marginTop: '20px' }}>
          {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
          <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', color: '#1a73e8', fontWeight: 700, cursor: 'pointer', fontSize: '13px' }}>
            {mode === 'login' ? 'Register' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;

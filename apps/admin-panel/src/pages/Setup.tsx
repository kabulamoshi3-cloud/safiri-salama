import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_URL) ||
  'http://localhost:3000/api/v1';

export default function Setup() {
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [setupSecret, setSetupSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!setupSecret.trim()) {
      setError('Setup Secret is required.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/auth/admin-register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Setup-Secret': setupSecret,
        },
        body: JSON.stringify({ name, phone, password }),
      });

      if (response.status === 201) {
        setSuccess(true);
        setTimeout(() => navigate('/login?setup=done'), 2000);
      } else {
        const data = await response.json().catch(() => ({}));
        if (response.status === 403) {
          setError('Invalid setup secret.');
        } else if (response.status === 400) {
          setError(data.error || 'Please check your inputs and try again.');
        } else {
          setError(data.error || 'Admin registration failed. Please try again.');
        }
      }
    } catch {
      setError('Cannot reach the server. Check your network.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--color-content-bg)',
        }}
      >
        <div
          style={{
            textAlign: 'center',
            background: 'var(--color-card-bg)',
            borderRadius: '12px',
            padding: '36px 32px',
            boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>✅</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>
            Admin account created.
          </h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px' }}>
            Redirecting to login…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-content-bg)',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          background: 'var(--color-card-bg)',
          borderRadius: '12px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
          padding: '36px 32px',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '32px', marginBottom: '8px' }}>🔧</div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-accent)' }}>
            Admin Setup
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>
            Create the first admin account
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Name */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="setup-name"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}
            >
              Full Name
            </label>
            <input
              id="setup-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Admin Name"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Phone */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="setup-phone"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}
            >
              Phone Number
            </label>
            <input
              id="setup-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              placeholder="+255 7xx xxx xxx"
              autoComplete="tel"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Password */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="setup-password"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}
            >
              Password
            </label>
            <input
              id="setup-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Confirm Password */}
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="setup-confirm"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}
            >
              Confirm Password
            </label>
            <input
              id="setup-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {/* Setup Secret */}
          <div style={{ marginBottom: '24px' }}>
            <label
              htmlFor="setup-secret"
              style={{ display: 'block', marginBottom: '6px', fontWeight: 500, fontSize: '13px' }}
            >
              Setup Secret
            </label>
            <input
              id="setup-secret"
              type="password"
              value={setupSecret}
              onChange={(e) => setSetupSecret(e.target.value)}
              required
              placeholder="Provided by system administrator"
              autoComplete="off"
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid var(--color-border)',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p
              role="alert"
              style={{
                color: 'var(--color-red)',
                fontSize: '13px',
                marginBottom: '16px',
                padding: '8px 12px',
                background: 'var(--color-red-bg)',
                borderRadius: '6px',
              }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              background: loading ? '#ccc' : 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
          >
            {loading ? 'Creating…' : 'Create Admin Account'}
          </button>
        </form>
      </div>
    </div>
  );
}

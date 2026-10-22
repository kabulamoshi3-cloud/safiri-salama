import React, { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../store/auth';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { login, loading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      // Label is "Email" but we send it as the phone field per backend contract
      await login(email, password);
      navigate('/', { replace: true });
    } catch {
      setError(t('login_error'));
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-8">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-2">🚌</div>
          <h1 className="text-2xl font-bold text-blue-600">DalaSmart</h1>
          <p className="text-sm text-gray-500 mt-1">{t('login_title')}</p>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Email field */}
          <div className="mb-4">
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('login_email')}
            </label>
            <input
              id="email"
              type="text"
              name="phone"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="username"
              placeholder="+255 7xx xxx xxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Password field */}
          <div className="mb-6">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {t('login_password')}
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Error message */}
          {error && (
            <div
              role="alert"
              className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg"
            >
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white font-semibold rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
            {loading ? t('loading') : t('login_btn')}
          </button>
        </form>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { pubI18n } from '../i18n';

type Step = 'phone' | 'otp' | 'done';

const ForgotPasswordPage: React.FC = () => {
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let normalized = phone.trim();
      const digits = normalized.replace(/\D/g, '');
      if (normalized.startsWith('+')) {
        normalized = '+' + digits;
      } else if (digits.startsWith('255')) {
        normalized = '+' + digits;
      } else {
        normalized = '+255' + (digits.startsWith('0') ? digits.substring(1) : digits);
      }
      await api.post('/otp/send', { phone: normalized });
      setPhone(normalized);
      setInfo('A 6-digit code has been sent to your phone.');
      setStep('otp');
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to server. Check your internet connection.');
      } else {
        setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      // First verify the OTP
      await api.post('/otp/verify', { phone, code: otp });
      // Then reset the password
      await api.post('/auth/reset-password', { phone, otp, new_password: newPassword });
      setStep('done');
    } catch (err: any) {
      if (!err.response) {
        setError('Cannot connect to server. Check your internet connection.');
      } else if (err.response?.status === 404 || err.response?.status === 501) {
        setError('Password reset is not yet available. Please contact support.');
      } else {
        setError(err.response?.data?.error || 'Failed to reset password. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F3F5F9] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-[#2563EB] rounded-xl flex items-center justify-center">
              <span className="text-white font-black">SH</span>
            </div>
            <span className="text-2xl font-black text-[#0F172A]">SkyRex</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h1>
          <p className="text-gray-600">
            {step === 'phone' && "Enter your phone number to receive a reset code."}
            {step === 'otp' && "Enter the code sent to your phone."}
            {step === 'done' && "Your password has been reset."}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {step === 'phone' && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  placeholder="+255 7xx xxx xxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
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
                {loading ? 'Sending…' : 'Send Reset Code'}
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {info && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                  <p className="text-blue-800 text-sm">{info}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  6-Digit Code
                </label>
                <input
                  type="text"
                  placeholder="123456"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  placeholder="At least 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500 transition"
                />
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
                {loading ? 'Resetting…' : 'Reset Password'}
              </button>
              <button
                type="button"
                onClick={() => { setStep('phone'); setError(''); setOtp(''); }}
                className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
              >
                ← Back
              </button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="text-5xl">✅</div>
              <p className="text-gray-700 font-medium">Password reset successfully!</p>
              <Link
                to="/login"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition text-center"
              >
                Go to Login
              </Link>
            </div>
          )}

          {step !== 'done' && (
            <p className="text-center text-gray-600 mt-6 text-sm">
              Remember your password?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-semibold">
                {pubI18n.t('sign_in')}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

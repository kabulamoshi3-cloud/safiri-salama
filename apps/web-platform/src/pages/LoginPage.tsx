/**
 * Login Page — phone + OTP authentication
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, ArrowRight, Shield } from 'lucide-react';
import { useAuthStore } from '../store/auth';

type Step = 'phone' | 'otp';

const LoginPage: React.FC = () => {
  const navigate   = useNavigate();
  const { login, verifyOtp, loading } = useAuthStore();

  const [step, setStep]       = useState<Step>('phone');
  const [phone, setPhone]     = useState('');
  const [otp, setOtp]         = useState('');
  const [error, setError]     = useState('');

  const handleSendOtp = async () => {
    setError('');
    if (!phone || phone.length < 9) {
      setError('Enter a valid phone number');
      return;
    }
    try {
      await login(phone);
      setStep('otp');
    } catch {
      setError('Failed to send OTP. Please try again.');
    }
  };

  const handleVerify = async () => {
    setError('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    try {
      await verifyOtp(phone, otp);
      navigate('/');
    } catch {
      setError('Invalid code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-blue-600">DalaSmart</h1>
          <p className="text-gray-500 mt-2">Your ride, your way</p>
        </div>

        {step === 'phone' ? (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-6">Enter your phone number</h2>

            <div className="flex items-center gap-3 border border-gray-300 rounded-lg px-4 py-3 focus-within:border-blue-500 mb-4">
              <span className="text-gray-500 font-semibold">+254</span>
              <div className="w-px h-5 bg-gray-300" />
              <Phone size={16} className="text-gray-400" />
              <input
                type="tel"
                placeholder="7XX XXX XXX"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                maxLength={9}
                className="flex-1 outline-none text-gray-900 text-lg"
              />
            </div>

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                : <><span>Continue</span><ArrowRight size={18} /></>
              }
            </button>

            <p className="text-center text-sm text-gray-500 mt-6">
              By continuing you agree to our{' '}
              <a href="/terms" className="text-blue-600 underline">Terms</a> and{' '}
              <a href="/privacy" className="text-blue-600 underline">Privacy Policy</a>
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep('phone')} className="text-blue-600 hover:underline text-sm">
                ← Back
              </button>
              <h2 className="text-xl font-bold text-gray-900">Verify your number</h2>
            </div>

            <div className="bg-blue-50 rounded-lg p-4 flex items-start gap-3 mb-6">
              <Shield size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-800">
                We sent a 6-digit code to <strong>+254{phone}</strong>
              </p>
            </div>

            <input
              type="tel"
              placeholder="_ _ _ _ _ _"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              maxLength={6}
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center text-2xl tracking-[0.5em] font-bold outline-none focus:border-blue-500 mb-4"
            />

            {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

            <button
              onClick={handleVerify}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              {loading
                ? <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                : 'Verify & Continue'
              }
            </button>

            <button
              onClick={handleSendOtp}
              className="w-full text-blue-600 text-sm mt-4 hover:underline"
            >
              Resend code
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default LoginPage;

/**
 * AuthLanding — receives token from public website after login/register
 * URL: /auth?token=XXX
 * Stores the token then redirects to home.
 */
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const AuthLanding: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (token) {
      localStorage.setItem('safiri_token', token);
      // Clean URL then go home
      window.history.replaceState({}, '', '/');
      navigate('/', { replace: true });
    } else {
      // No token — send to public website login
      window.location.href = 'https://skyrex-web.vercel.app/login';
    }
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#2563EB] to-[#1e40af]">
      <div className="text-center">
        <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mb-4 mx-auto">
          <div className="text-white font-black text-3xl">SR</div>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
        <p className="text-white/70 mt-4 text-sm">Signing you in...</p>
      </div>
    </div>
  );
};

export default AuthLanding;

/**
 * SignUpLoginScreen — redirects to public website for auth
 * The public website handles login/register and sends the token back via /auth?token=XXX
 */
import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const PUBLIC_SITE = 'https://skyrex-web.vercel.app';

const SignUpLoginScreen: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode');

  useEffect(() => {
    const destination = mode === 'register'
      ? `${PUBLIC_SITE}/register`
      : `${PUBLIC_SITE}/login`;
    window.location.replace(destination);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#2563EB] to-[#1e40af]">
      <div className="text-center">
        <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mb-4 mx-auto">
          <div className="text-white font-black text-3xl">SR</div>
        </div>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
        <p className="text-white/70 mt-4 text-sm">Redirecting...</p>
      </div>
    </div>
  );
};

export default SignUpLoginScreen;

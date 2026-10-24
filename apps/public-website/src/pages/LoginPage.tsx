import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { login } from '../services/auth';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [role, setRole] = useState<'passenger' | 'driver'>('passenger');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const registered = searchParams.get('registered');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await login({ email, password, role });
      localStorage.setItem('token', data.token);

      if (role === 'driver') {
        navigate('/driver');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError('Invalid email or password. Please try again.');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h1>
          <p className="text-gray-600">Sign in to your Safiri Haraka account</p>
        </div>

        {registered === 'true' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800 text-center">
              Account created successfully! Please sign in.
            </p>
          </div>
        )}

        <Card>
          {/* Role Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setRole('passenger')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                role === 'passenger'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Passenger
            </button>
            <button
              onClick={() => setRole('driver')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-colors ${
                role === 'driver'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Driver
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email or Phone"
              id="email"
              type="text"
              placeholder="Enter your email or phone number"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Password"
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <div className="mb-6">
              <a
                href="/forgot-password"
                className="text-primary hover:underline text-sm"
              >
                Forgot password?
              </a>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Don't have an account?{' '}
              <Link to="/register" className="text-primary hover:underline font-semibold">
                Register
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default LoginPage;

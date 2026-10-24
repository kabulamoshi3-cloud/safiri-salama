import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { register } from '../services/auth';
import Button from '../components/Button';
import Input from '../components/Input';
import Card from '../components/Card';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'driver' ? 'driver' : 'passenger';

  const [role, setRole] = useState<'passenger' | 'driver'>(defaultRole);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    vehicleType: 'Car',
    licenseNumber: '',
    plateNumber: '',
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!agreeToTerms) {
      setError('You must agree to the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);

    try {
      // Ensure phone has +255 prefix
      let phone = formData.phone.trim();
      if (!phone.startsWith('+')) {
        phone = phone.startsWith('0') ? '+255' + phone.substring(1) : '+255' + phone;
      }

      const payload: any = {
        name: formData.name,
        phone: phone,
        password: formData.password,
        user_type: role,  // API expects user_type, not role
      };

      // Add email only if provided
      if (formData.email && formData.email.trim()) {
        payload.email = formData.email.trim();
      }

      if (role === 'driver') {
        payload.vehicleType = formData.vehicleType;
        payload.licenseNumber = formData.licenseNumber;
        payload.plateNumber = formData.plateNumber;
      }

      await register(payload);
      navigate('/login?registered=true');
    } catch (err: any) {
      setError(
        err.response?.data?.message || 'Registration failed. Please try again.'
      );
      console.error('Registration error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h1>
          <p className="text-gray-600">Join Safiri Haraka today</p>
        </div>

        <Card>
          {/* Role Selection */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-3">
              I want to register as:
            </label>
            <div className="flex gap-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="passenger"
                  checked={role === 'passenger'}
                  onChange={(e) => setRole(e.target.value as 'passenger' | 'driver')}
                  className="mr-2"
                />
                <span>Passenger</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value="driver"
                  checked={role === 'driver'}
                  onChange={(e) => setRole(e.target.value as 'passenger' | 'driver')}
                  className="mr-2"
                />
                <span>Driver</span>
              </label>
            </div>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Common Fields */}
            <Input
              label="Full Name"
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleChange}
              required
            />

            <Input
              label="Phone Number"
              id="phone"
              name="phone"
              type="tel"
              placeholder="e.g., +255 700 000 000"
              value={formData.phone}
              onChange={handleChange}
              required
            />

            <Input
              label="Email (Optional)"
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleChange}
            />

            <Input
              label="Password"
              id="password"
              name="password"
              type="password"
              placeholder="Create a password"
              value={formData.password}
              onChange={handleChange}
              required
            />

            <Input
              label="Confirm Password"
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
            />

            {/* Driver-Specific Fields */}
            {role === 'driver' && (
              <>
                <div className="mb-4">
                  <label
                    htmlFor="vehicleType"
                    className="block text-gray-700 font-medium mb-2"
                  >
                    Vehicle Type
                  </label>
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition"
                    required
                  >
                    <option value="Car">Car</option>
                    <option value="Bajaji">Bajaji</option>
                    <option value="Boda Boda">Boda Boda</option>
                  </select>
                </div>

                <Input
                  label="License Number"
                  id="licenseNumber"
                  name="licenseNumber"
                  type="text"
                  placeholder="Enter your driver's license number"
                  value={formData.licenseNumber}
                  onChange={handleChange}
                  required
                />

                <Input
                  label="Plate Number"
                  id="plateNumber"
                  name="plateNumber"
                  type="text"
                  placeholder="Enter your vehicle plate number"
                  value={formData.plateNumber}
                  onChange={handleChange}
                  required
                />
              </>
            )}

            {/* Terms Checkbox */}
            <div className="mb-6">
              <label className="flex items-start">
                <input
                  type="checkbox"
                  checked={agreeToTerms}
                  onChange={(e) => setAgreeToTerms(e.target.checked)}
                  className="mt-1 mr-2"
                />
                <span className="text-sm text-gray-700">
                  I agree to the{' '}
                  <a href="/terms" className="text-primary hover:underline">
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a href="/privacy" className="text-primary hover:underline">
                    Privacy Policy
                  </a>
                </span>
              </label>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <Button type="submit" variant="primary" fullWidth disabled={loading}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-semibold">
                Sign In
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;

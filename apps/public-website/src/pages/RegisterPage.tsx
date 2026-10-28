import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { register } from '../services/auth';
import api from '../services/api';
import { pubI18n } from '../i18n';

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'driver' ? 'driver' : 'passenger';

  const [role, setRole] = useState<'passenger' | 'driver'>(defaultRole);
  const [formData, setFormData] = useState({
    name: '', phone: '', email: '', password: '', confirmPassword: '',
    vehicleType: 'Car', licenseNumber: '', plateNumber: '',
  });
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return pubI18n.subscribe(() => forceUpdate()); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (formData.password !== formData.confirmPassword) { setError(pubI18n.t('passwords_no_match')); return; }
    if (!agreeToTerms) { setError(pubI18n.t('agree_terms_error')); return; }
    setLoading(true);
    try {
      let phone = formData.phone.trim();
      if (!phone.startsWith('+')) {
        const digits = phone.replace(/\D/g, '');
        phone = digits.startsWith('255')
          ? '+' + digits
          : '+255' + (digits.startsWith('0') ? digits.substring(1) : digits);
      } else {
        phone = '+' + phone.slice(1).replace(/\D/g, '');
      }
      const payload: any = { name: formData.name, phone, password: formData.password, user_type: role };
      if (formData.email?.trim()) payload.email = formData.email.trim();
      if (role === 'driver') {
        payload.vehicleType = formData.vehicleType;
        payload.licenseNumber = formData.licenseNumber;
        payload.plateNumber = formData.plateNumber;
      }
      await register(payload);
      // Auto-login after successful registration
      const loginRes = await api.post('/auth/login', { phone, password: formData.password });
      localStorage.setItem('token', loginRes.data.token);
      navigate('/');
    } catch (err: any) {
      const status = err.response?.status;
      if (!err.response) {
        setError('Cannot connect to server. Check your internet connection.');
      } else if (status === 409 || (status === 400 && err.response?.data?.error?.toLowerCase().includes('already exists'))) {
        setError('An account with this phone number already exists. Try logging in.');
      } else if (status === 400) {
        setError(err.response?.data?.error || 'Please check your inputs and try again.');
      } else {
        setError('Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{pubI18n.t('create_account')}</h1>
          <p className="text-gray-600">{pubI18n.t('join_subtitle')}</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Role */}
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-3">{pubI18n.t('register_as')}</label>
            <div className="flex gap-4">
              {(['passenger', 'driver'] as const).map(r => (
                <label key={r} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="role" value={r} checked={role === r} onChange={() => setRole(r)} className="accent-blue-600" />
                  <span>{pubI18n.t(r)}</span>
                </label>
              ))}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('full_name')}</label>
              <input name="name" type="text" placeholder={pubI18n.t('full_name_placeholder')} value={formData.name} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('phone')}</label>
              <input name="phone" type="tel" placeholder={pubI18n.t('phone_placeholder')} value={formData.phone} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('email_optional')}</label>
              <input name="email" type="email" placeholder={pubI18n.t('email_placeholder')} value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('password')}</label>
              <input name="password" type="password" placeholder={pubI18n.t('password_placeholder')} value={formData.password} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('confirm_password')}</label>
              <input name="confirmPassword" type="password" placeholder={pubI18n.t('confirm_password_placeholder')} value={formData.confirmPassword} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
            </div>

            {role === 'driver' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('vehicle_type')}</label>
                  <select name="vehicleType" value={formData.vehicleType} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500">
                    <option value="Car">Car</option>
                    <option value="Bajaji">Bajaji</option>
                    <option value="Boda Boda">Boda Boda</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('license_number')}</label>
                  <input name="licenseNumber" type="text" value={formData.licenseNumber} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{pubI18n.t('plate_number')}</label>
                  <input name="plateNumber" type="text" value={formData.plateNumber} onChange={handleChange} required className="w-full border border-gray-300 rounded-xl px-4 py-3 outline-none focus:border-blue-500" />
                </div>
              </>
            )}

            <label className="flex items-start gap-2 cursor-pointer">
              <input type="checkbox" checked={agreeToTerms} onChange={(e) => setAgreeToTerms(e.target.checked)} className="mt-1 accent-blue-600" />
              <span className="text-sm text-gray-700">
                {pubI18n.t('agree_terms')}{' '}
                <a href="/terms" className="text-blue-600 hover:underline">{pubI18n.t('terms')}</a>
                {' '}{pubI18n.t('and')}{' '}
                <a href="/privacy" className="text-blue-600 hover:underline">{pubI18n.t('privacy')}</a>
              </span>
            </label>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">
              {loading ? pubI18n.t('creating') : pubI18n.t('create_account')}
            </button>
          </form>

          <p className="text-center text-gray-600 mt-6 text-sm">
            {pubI18n.t('have_account')}{' '}
            <Link to="/login" className="text-blue-600 hover:underline font-semibold">{pubI18n.t('sign_in')}</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;

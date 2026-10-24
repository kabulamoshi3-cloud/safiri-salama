import api from './api';

export const login = async (credentials: { phone: string; password: string }) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const register = async (data: {
  name: string;
  phone: string;
  email: string;
  password: string;
  role: string;
  vehicleType?: string;
  licenseNumber?: string;
  plateNumber?: string;
}) => {
  const response = await api.post('/auth/register', data);
  return response.data;
};

export const logout = () => {
  localStorage.removeItem('token');
};

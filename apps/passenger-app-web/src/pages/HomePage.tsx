import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

interface User {
  id: string;
  name: string;
  phone_number?: string;
  phone?: string;
}

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then((res) => setUser(res.data.user))
      .catch(() => {
        localStorage.removeItem('safiri_token');
        navigate('/login');
      });
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('safiri_token');
    navigate('/login');
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '420px', background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '36px 32px', textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>🚗</div>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#1a73e8', margin: '0 0 8px' }}>Safiri Haraka</h1>
        {user ? (
          <>
            <p style={{ color: '#374151', fontSize: '16px', marginBottom: '4px' }}>Welcome back, <strong>{user.name}</strong>!</p>
            <p style={{ color: '#6b7280', fontSize: '13px', marginBottom: '32px' }}>{user.phone_number || user.phone}</p>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              The full passenger experience is coming soon. You can book rides via the <strong>web platform</strong> or the mobile app.
            </p>
          </>
        ) : (
          <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>Loading your profile…</p>
        )}
        <button onClick={handleLogout}
          style={{ padding: '11px 28px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
          Sign Out
        </button>
      </div>
    </div>
  );
};

export default HomePage;

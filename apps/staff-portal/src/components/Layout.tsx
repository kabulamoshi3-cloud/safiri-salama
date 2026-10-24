import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';
import AdminSidebar from './AdminSidebar';
import OperatorSidebar from './OperatorSidebar';

interface LayoutProps {
  role: UserRole;
}

export default function Layout({ role }: LayoutProps) {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login', { replace: true });
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Role-based Sidebar */}
      {role === 'admin' ? (
        <AdminSidebar userProfile={userProfile} onLogout={handleLogout} />
      ) : (
        <OperatorSidebar userProfile={userProfile} onLogout={handleLogout} />
      )}

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
            background: 'var(--color-content-bg)',
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}

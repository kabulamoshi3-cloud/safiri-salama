import React, { lazy, Suspense } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

const AdminSidebar = lazy(() => import('./AdminSidebar'));
const OperatorSidebar = lazy(() => import('./OperatorSidebar'));

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

  const Sidebar = role === 'operator' ? OperatorSidebar : AdminSidebar;

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Role-based Sidebar with lazy loading */}
      <Suspense fallback={<div style={{ width: '240px', background: 'var(--color-sidebar-bg)' }} />}>
        <Sidebar userProfile={userProfile} onLogout={handleLogout} role={role} />
      </Suspense>

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

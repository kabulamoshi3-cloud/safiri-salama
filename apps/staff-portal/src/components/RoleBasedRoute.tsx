import { ReactNode } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '../context/AuthContext';

interface RoleBasedRouteProps {
  children: ReactNode;
  allowedRoles: UserRole[];
}

export default function RoleBasedRoute({ children, allowedRoles }: RoleBasedRouteProps) {
  const { isAuthenticated, role, logout } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role && !allowedRoles.includes(role)) {
    const correctDashboard = role === 'admin' ? '/admin' : '/ops';
    
    return (
      <div style={{ padding: '2rem', textAlign: 'center', maxWidth: '600px', margin: '4rem auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--color-text-primary)' }}>Access Denied</h1>
        <p style={{ marginBottom: '2rem', color: 'var(--color-text-secondary)' }}>
          You do not have permission to access this page.
        </p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <button
            onClick={() => navigate(correctDashboard)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--color-accent)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Go to {role === 'admin' ? 'Admin' : 'Operations'} Dashboard
          </button>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'var(--color-gray-bg)',
              color: 'var(--color-text-primary)',
              border: '1px solid var(--color-border)',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '14px',
            }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

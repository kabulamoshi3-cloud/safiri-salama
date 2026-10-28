import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Drivers from './pages/Drivers';
import Fleet from './pages/Fleet';
import Trips from './pages/Trips';
import Finance from './pages/Finance';
import Pricing from './pages/Pricing';
import Promotions from './pages/Promotions';
import Analytics from './pages/Analytics';
import Support from './pages/Support';
import StaffRoles from './pages/StaffRoles';
import Settings from './pages/Settings';
import Passengers from './pages/Passengers';
import AuditLogs from './pages/AuditLogs';

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: (
      <RequireAuth>
        <Layout />
      </RequireAuth>
    ),
    children: [
      { index: true,       element: <Dashboard /> },
      { path: 'users',      element: <Users /> },
      { path: 'drivers',    element: <Drivers /> },
      { path: 'fleet',      element: <Fleet /> },
      { path: 'trips',      element: <Trips /> },
      { path: 'finance',    element: <Finance /> },
      { path: 'pricing',    element: <Pricing /> },
      { path: 'promotions', element: <Promotions /> },
      { path: 'analytics',  element: <Analytics /> },
      { path: 'support',    element: <Support /> },
      { path: 'staff',      element: <StaffRoles /> },
      { path: 'passengers', element: <Passengers /> },
      { path: 'settings',   element: <Settings /> },
      { path: 'audit-logs', element: <AuditLogs /> },
      { path: '*',          element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

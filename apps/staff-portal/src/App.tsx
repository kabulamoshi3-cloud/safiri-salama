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
import Dashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import Drivers from './pages/admin/Drivers';
import Fleet from './pages/admin/Fleet';
import Trips from './pages/admin/Trips';
import Finance from './pages/admin/Finance';
import Pricing from './pages/admin/Pricing';
import Promotions from './pages/admin/Promotions';
import Analytics from './pages/admin/Analytics';
import Support from './pages/admin/Support';
import StaffRoles from './pages/admin/StaffRoles';
import Settings from './pages/admin/Settings';

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
      { path: 'settings',   element: <Settings /> },
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

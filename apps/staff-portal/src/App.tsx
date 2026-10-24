import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import RoleBasedRoute from './components/RoleBasedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';

// Admin pages
import AdminDashboard from './pages/admin/Dashboard';
import Users from './pages/admin/Users';
import AdminDrivers from './pages/admin/Drivers';
import AdminFleet from './pages/admin/Fleet';
import Trips from './pages/admin/Trips';
import Finance from './pages/admin/Finance';
import Pricing from './pages/admin/Pricing';
import Promotions from './pages/admin/Promotions';
import Analytics from './pages/admin/Analytics';
import Support from './pages/admin/Support';
import StaffRoles from './pages/admin/StaffRoles';
import AdminSettings from './pages/admin/Settings';

// Operator pages
import OpsDashboard from './pages/ops/Dashboard';
import Dispatch from './pages/ops/Dispatch';
import LiveMap from './pages/ops/LiveMap';
import ActiveTrips from './pages/ops/ActiveTrips';
import OpsDrivers from './pages/ops/Drivers';
import Incidents from './pages/ops/Incidents';
import Cancellations from './pages/ops/Cancellations';
import DemandSupply from './pages/ops/DemandSupply';
import SupportQueue from './pages/ops/SupportQueue';
import ServiceAlerts from './pages/ops/ServiceAlerts';
import OpsFleet from './pages/ops/Fleet';
import Earnings from './pages/ops/Earnings';
import Reports from './pages/ops/Reports';
import OpsSettings from './pages/ops/Settings';

// Root redirect component
function RootRedirect() {
  const { isAuthenticated, role } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role === 'admin') {
    return <Navigate to="/admin" replace />;
  }

  if (role === 'operator') {
    return <Navigate to="/ops" replace />;
  }

  return <Navigate to="/login" replace />;
}

const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/admin',
    element: (
      <RoleBasedRoute allowedRoles={['admin']}>
        <Layout role="admin" />
      </RoleBasedRoute>
    ),
    children: [
      { index: true,        element: <AdminDashboard /> },
      { path: 'users',      element: <Users /> },
      { path: 'drivers',    element: <AdminDrivers /> },
      { path: 'fleet',      element: <AdminFleet /> },
      { path: 'trips',      element: <Trips /> },
      { path: 'finance',    element: <Finance /> },
      { path: 'pricing',    element: <Pricing /> },
      { path: 'promotions', element: <Promotions /> },
      { path: 'analytics',  element: <Analytics /> },
      { path: 'support',    element: <Support /> },
      { path: 'staff',      element: <StaffRoles /> },
      { path: 'settings',   element: <AdminSettings /> },
    ],
  },
  {
    path: '/ops',
    element: (
      <RoleBasedRoute allowedRoles={['operator']}>
        <Layout role="operator" />
      </RoleBasedRoute>
    ),
    children: [
      { index: true,          element: <OpsDashboard /> },
      { path: 'dispatch',     element: <Dispatch /> },
      { path: 'live-map',     element: <LiveMap /> },
      { path: 'active-trips', element: <ActiveTrips /> },
      { path: 'drivers',      element: <OpsDrivers /> },
      { path: 'incidents',    element: <Incidents /> },
      { path: 'cancellations',element: <Cancellations /> },
      { path: 'demand-supply',element: <DemandSupply /> },
      { path: 'support-queue',element: <SupportQueue /> },
      { path: 'service-alerts',element: <ServiceAlerts /> },
      { path: 'fleet',        element: <OpsFleet /> },
      { path: 'earnings',     element: <Earnings /> },
      { path: 'reports',      element: <Reports /> },
      { path: 'settings',     element: <OpsSettings /> },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
  );
}

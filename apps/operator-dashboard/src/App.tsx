import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from 'react-router-dom';
import RequireAuth from './components/RequireAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Fleet from './pages/Fleet';
import Drivers from './pages/Drivers';
import Earnings from './pages/Earnings';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
// New operations pages
import Dispatch from './pages/Dispatch';
import LiveMap from './pages/LiveMap';
import ActiveTrips from './pages/ActiveTrips';
import Incidents from './pages/Incidents';
import Cancellations from './pages/Cancellations';
import DemandSupply from './pages/DemandSupply';
import SupportQueue from './pages/SupportQueue';
import ServiceAlerts from './pages/ServiceAlerts';

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <RequireAuth><Layout /></RequireAuth>,
    children: [
      { index: true,              element: <Dashboard /> },
      { path: 'dispatch',         element: <Dispatch /> },
      { path: 'live-map',         element: <LiveMap /> },
      { path: 'active-trips',     element: <ActiveTrips /> },
      { path: 'drivers',          element: <Drivers /> },
      { path: 'incidents',        element: <Incidents /> },
      { path: 'cancellations',    element: <Cancellations /> },
      { path: 'demand-supply',    element: <DemandSupply /> },
      { path: 'support-queue',    element: <SupportQueue /> },
      { path: 'service-alerts',   element: <ServiceAlerts /> },
      { path: 'fleet',            element: <Fleet /> },
      { path: 'earnings',         element: <Earnings /> },
      { path: 'reports',          element: <Reports /> },
      { path: 'settings',         element: <Settings /> },
      { path: '*',                element: <Navigate to="/" replace /> },
    ],
  },
]);

export default function App() {
  return <RouterProvider router={router} />;
}

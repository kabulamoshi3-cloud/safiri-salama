/**
 * Driver Dashboard Main App
 * Real-time stats, incentives, and fleet management
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Trips from './pages/Trips';
import Earnings from './pages/Earnings';
import Incentives from './pages/Incentives';
import Documents from './pages/Documents';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import { useAuthStore } from './store/auth';

const App: React.FC = () => {
  const { isAuthenticated, loading } = useAuthStore();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/trips" element={<Trips />} />
            <Route path="/earnings" element={<Earnings />} />
            <Route path="/incentives" element={<Incentives />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
};

export default App;

/**
 * Safiri Haraka Web Platform Main App
 * Responsive web app for booking rides, food delivery, and account management
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import InstallPrompt from './components/InstallPrompt';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import BookingPage from './pages/BookingPage';
import ActiveTripPage from './pages/ActiveTripPage';
import TripHistoryPage from './pages/TripHistoryPage';
import WalletPage from './pages/WalletPage';
import ProfilePage from './pages/ProfilePage';
import FoodPage from './pages/FoodPage';
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

  return (
    <BrowserRouter>
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated ? 'md:pt-20 pb-20' : ''}>
        {/* PWA Install Prompt - shows on all pages */}
        <div className="container mx-auto px-4 pt-4">
          <InstallPrompt />
        </div>
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/login" element={<LoginPage />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/book" element={<BookingPage />} />
              <Route path="/trip/:tripId" element={<ActiveTripPage />} />
              <Route path="/trips" element={<TripHistoryPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/food" element={<FoodPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </main>
    </BrowserRouter>
  );
};

export default App;

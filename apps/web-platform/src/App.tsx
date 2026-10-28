/**
 * Safiri Haraka Web Platform — SIMNOVA Redesign
 * Complete ride-hailing app with live Leaflet maps
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import { useAuthStore } from './store/auth';
import { useAppInit } from './hooks/useAppInit';

// Leaflet CSS is imported in individual map components

// New SIMNOVA screens
import SplashScreen from './pages/SplashScreen';
import SignUpLoginScreen from './pages/SignUpLoginScreen';
import HomeScreenNew from './pages/HomeScreenNew';
import BookingScreenNew from './pages/BookingScreenNew';
import SearchingDriverScreen from './pages/SearchingDriverScreen';
import ActiveTripScreenNew from './pages/ActiveTripScreenNew';
import RideCompleteScreen from './pages/RideCompleteScreen';
import ProfileScreenNew from './pages/ProfileScreenNew';
import NotificationsScreen from './pages/NotificationsScreen';

// Keep existing screens
import TripHistoryPage from './pages/TripHistoryPage';
import WalletPage from './pages/WalletPage';
import FoodPage from './pages/FoodPage';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { initialized, loading } = useAppInit();

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#2563EB] to-[#1e40af]">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mb-4 mx-auto">
            <div className="text-white font-black text-3xl">SH</div>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
      <main>
        <InstallPrompt />
        <Routes>
          {/* Public routes */}
          <Route path="/splash" element={<SplashScreen />} />
          <Route path="/login" element={<SignUpLoginScreen />} />

          {/* Protected routes */}
          {isAuthenticated ? (
            <>
              <Route path="/" element={<HomeScreenNew />} />
              <Route path="/book" element={<BookingScreenNew />} />
              <Route path="/searching" element={<SearchingDriverScreen />} />
              <Route path="/active-trip" element={<ActiveTripScreenNew />} />
              <Route path="/trip-complete" element={<RideCompleteScreen />} />
              <Route path="/profile" element={<ProfileScreenNew />} />
              <Route path="/notifications" element={<NotificationsScreen />} />
              <Route path="/trips" element={<TripHistoryPage />} />
              <Route path="/wallet" element={<WalletPage />} />
              <Route path="/food" element={<FoodPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route path="*" element={<Navigate to="/splash" replace />} />
          )}
        </Routes>

        {/* Bottom Navigation — show on all protected routes except splash/login */}
        {isAuthenticated && <BottomNav />}
      </main>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;

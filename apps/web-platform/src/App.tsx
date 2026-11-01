/**
 * SkyRex Web App
 * Passenger ride-hailing PWA — auth handled by skyrex-web.vercel.app
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import InstallPrompt from './components/InstallPrompt';
import { useAuthStore } from './store/auth';
import { useAppInit } from './hooks/useAppInit';

import SplashScreen        from './pages/SplashScreen';
import SignUpLoginScreen    from './pages/SignUpLoginScreen';
import AuthLanding         from './pages/AuthLanding';
import HomeScreenNew       from './pages/HomeScreenNew';
import BookingScreenNew    from './pages/BookingScreenNew';
import SearchingDriverScreen from './pages/SearchingDriverScreen';
import ActiveTripScreenNew from './pages/ActiveTripScreenNew';
import RideCompleteScreen  from './pages/RideCompleteScreen';
import ProfileScreenNew    from './pages/ProfileScreenNew';
import NotificationsScreen from './pages/NotificationsScreen';
import TripHistoryPage     from './pages/TripHistoryPage';
import WalletPage          from './pages/WalletPage';
import FoodPage            from './pages/FoodPage';

const AppContent: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  const { initialized, loading } = useAppInit();

  // /auth route must always be accessible — it handles the token handoff
  if (window.location.pathname === '/auth') {
    return <AuthLanding />;
  }

  if (!initialized || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-[#2563EB] to-[#1e40af]">
        <div className="text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur rounded-3xl flex items-center justify-center mb-4 mx-auto">
            <div className="text-white font-black text-3xl">SR</div>
          </div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto" />
        </div>
      </div>
    );
  }

  return (
    <main>
      <InstallPrompt />
      <Routes>
        {/* Token handoff from public website */}
        <Route path="/auth" element={<AuthLanding />} />

        {/* Splash — shown to unauthenticated users */}
        <Route path="/splash" element={<SplashScreen />} />

        {/* /login redirects to public website */}
        <Route path="/login" element={<SignUpLoginScreen />} />

        {/* Protected routes */}
        {isAuthenticated ? (
          <>
            <Route path="/"              element={<HomeScreenNew />} />
            <Route path="/book"          element={<BookingScreenNew />} />
            <Route path="/searching"     element={<SearchingDriverScreen />} />
            <Route path="/active-trip"   element={<ActiveTripScreenNew />} />
            <Route path="/trip-complete" element={<RideCompleteScreen />} />
            <Route path="/profile"       element={<ProfileScreenNew />} />
            <Route path="/notifications" element={<NotificationsScreen />} />
            <Route path="/trips"         element={<TripHistoryPage />} />
            <Route path="/wallet"        element={<WalletPage />} />
            <Route path="/food"          element={<FoodPage />} />
            <Route path="*"              element={<Navigate to="/" replace />} />
          </>
        ) : (
          <Route path="*" element={<Navigate to="/splash" replace />} />
        )}
      </Routes>

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

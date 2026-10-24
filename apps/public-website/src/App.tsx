import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ServicesPage from './pages/ServicesPage';
import TrafficPage from './pages/TrafficPage';
import BecomeDriverPage from './pages/BecomeDriverPage';
import AboutPage from './pages/AboutPage';
import HelpPage from './pages/HelpPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import StaffPortalApp from './staff/App';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Staff Portal Routes - No Navbar/Footer */}
        <Route path="/staff/*" element={<StaffPortalApp />} />

        {/* Public Website Routes - With Navbar/Footer */}
        <Route path="/*" element={
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-grow">
              <Routes>
                <Route path="/" element={<HomePage />} />
                <Route path="/services" element={<ServicesPage />} />
                <Route path="/traffic" element={<TrafficPage />} />
                <Route path="/become-a-driver" element={<BecomeDriverPage />} />
                <Route path="/about" element={<AboutPage />} />
                <Route path="/help" element={<HelpPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/register" element={<RegisterPage />} />
              </Routes>
            </main>
            <Footer />
          </div>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

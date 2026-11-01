import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaGooglePlay, FaApple, FaExternalLinkAlt } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">

          {/* Brand Column */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 bg-[#2563EB] rounded-xl flex items-center justify-center">
                <span className="text-white font-black text-sm">SR</span>
              </div>
              <span className="text-xl font-black text-white">Sky<span className="text-[#f59e0b]">Rex</span></span>
            </div>
            <p className="text-sm mb-4 leading-relaxed">Smart, safe & affordable transport in Tanzania</p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-[#2563EB] transition-colors"><FaFacebook size={20} /></a>
              <a href="#" className="hover:text-[#2563EB] transition-colors"><FaTwitter size={20} /></a>
              <a href="#" className="hover:text-[#2563EB] transition-colors"><FaInstagram size={20} /></a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
              <li><Link to="/traffic" className="hover:text-white transition-colors">Live Traffic</Link></li>
              <li><Link to="/become-a-driver" className="hover:text-white transition-colors">Become a Driver</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/help" className="hover:text-white transition-colors">Help & Support</Link></li>
              <li><a href="/terms" className="hover:text-white transition-colors">Terms of Service</a></li>
              <li><a href="/privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Portals Column */}
          <div>
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Portals</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <a
                  href="https://skyrex-admin.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors group"
                >
                  <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                  Admin Panel
                  <FaExternalLinkAlt size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://operator.skyrex.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors group"
                >
                  <span className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0" />
                  Operator Dashboard
                  <FaExternalLinkAlt size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://driver.skyrex.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors group"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                  Driver Dashboard
                  <FaExternalLinkAlt size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://track.skyrex.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors group"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-400 flex-shrink-0" />
                  Live Tracking
                  <FaExternalLinkAlt size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <a
                  href="https://skyrex-app.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors group"
                >
                  <span className="w-2 h-2 rounded-full bg-yellow-400 flex-shrink-0" />
                  Passenger App (Web)
                  <FaExternalLinkAlt size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
            </ul>
          </div>

          {/* Download Column */}
          <div className="lg:col-span-2">
            <h3 className="text-white text-sm font-bold uppercase tracking-wider mb-4">Download App</h3>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Passenger App</p>
            <div className="space-y-2 mb-5">
              <a
                href="https://play.google.com/store/apps/details?id=com.skyrex.passenger"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl transition-colors"
              >
                <FaGooglePlay size={18} className="text-green-400" />
                <div>
                  <p className="text-xs opacity-60">GET IT ON</p>
                  <p className="text-sm font-semibold text-white">Google Play</p>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/skyrex-passenger/id000000001"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl transition-colors"
              >
                <FaApple size={18} className="text-gray-300" />
                <div>
                  <p className="text-xs opacity-60">Download on the</p>
                  <p className="text-sm font-semibold text-white">App Store</p>
                </div>
              </a>
            </div>

            <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Driver App</p>
            <div className="space-y-2">
              <a
                href="https://play.google.com/store/apps/details?id=com.skyrex.driver"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl transition-colors"
              >
                <FaGooglePlay size={18} className="text-green-400" />
                <div>
                  <p className="text-xs opacity-60">GET IT ON</p>
                  <p className="text-sm font-semibold text-white">Google Play</p>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/skyrex-driver/id000000002"
                target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-xl transition-colors"
              >
                <FaApple size={18} className="text-gray-300" />
                <div>
                  <p className="text-xs opacity-60">Download on the</p>
                  <p className="text-sm font-semibold text-white">App Store</p>
                </div>
              </a>
            </div>
          </div>

        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <p className="text-gray-500">&copy; {new Date().getFullYear()} SkyRex. All rights reserved.</p>
          <p className="text-gray-600 text-xs">Morogoro & Dar es Salaam, Tanzania 🇹🇿</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

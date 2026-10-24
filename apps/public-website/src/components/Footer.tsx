import React from 'react';
import { Link } from 'react-router-dom';
import { FaFacebook, FaTwitter, FaInstagram, FaGooglePlay, FaApple } from 'react-icons/fa';

const Footer: React.FC = () => {
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Column */}
          <div>
            <h3 className="text-white text-xl font-bold mb-4">DalaSmart</h3>
            <p className="text-sm mb-4">Smart, safe & affordable transport in Tanzania</p>
            <div className="flex space-x-4">
              <a href="#" className="hover:text-primary transition-colors">
                <FaFacebook size={24} />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <FaTwitter size={24} />
              </a>
              <a href="#" className="hover:text-primary transition-colors">
                <FaInstagram size={24} />
              </a>
            </div>
          </div>

          {/* Links Column */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/services" className="hover:text-primary transition-colors">
                  Services
                </Link>
              </li>
              <li>
                <Link to="/traffic" className="hover:text-primary transition-colors">
                  Traffic
                </Link>
              </li>
              <li>
                <Link to="/become-a-driver" className="hover:text-primary transition-colors">
                  Become a Driver
                </Link>
              </li>
              <li>
                <Link to="/help" className="hover:text-primary transition-colors">
                  Help
                </Link>
              </li>
              <li>
                <Link to="/about" className="hover:text-primary transition-colors">
                  About
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal Column */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li>
                <a href="/terms" className="hover:text-primary transition-colors">
                  Terms
                </a>
              </li>
              <li>
                <a href="/privacy" className="hover:text-primary transition-colors">
                  Privacy
                </a>
              </li>
            </ul>
          </div>

          {/* Download Column */}
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Download App</h3>
            <div className="space-y-3">
              <a
                href="https://play.google.com/store/apps/details?id=com.dalasmart.passenger"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaGooglePlay size={18} />
                <div>
                  <p className="text-xs opacity-70">GET IT ON</p>
                  <p className="text-sm font-semibold">Google Play</p>
                </div>
              </a>
              <a
                href="https://apps.apple.com/app/dalasmart-passenger/id000000001"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-gray-800 px-4 py-3 rounded-lg hover:bg-gray-700 transition-colors"
              >
                <FaApple size={18} />
                <div>
                  <p className="text-xs opacity-70">Download on the</p>
                  <p className="text-sm font-semibold">App Store</p>
                </div>
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>&copy; 2024 DalaSmart. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

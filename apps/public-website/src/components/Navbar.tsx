import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBars, FaTimes, FaGlobe } from 'react-icons/fa';
import { pubI18n } from '../i18n';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

  useEffect(() => { return pubI18n.subscribe(() => forceUpdate()); }, []);

  const lang = pubI18n.getLanguage();

  const navLinks = [
    { name: pubI18n.t('nav_home'),     path: '/' },
    { name: pubI18n.t('nav_services'), path: '/services' },
    { name: pubI18n.t('nav_traffic'),  path: '/traffic' },
    { name: pubI18n.t('nav_driver'),   path: '/become-a-driver' },
    { name: pubI18n.t('nav_about'),    path: '/about' },
    { name: pubI18n.t('nav_help'),     path: '/help' },
  ];

  const LangMenu = () => (
    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
      <button
        onClick={() => { pubI18n.setLanguage('en'); setShowLangMenu(false); }}
        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 ${lang === 'en' ? 'bg-blue-50' : ''}`}
      >
        <span className="text-xl">🇬🇧</span>
        <span className="text-sm font-semibold text-gray-800">English</span>
        {lang === 'en' && <span className="ml-auto text-blue-500 font-bold">✓</span>}
      </button>
      <button
        onClick={() => { pubI18n.setLanguage('sw'); setShowLangMenu(false); }}
        className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 ${lang === 'sw' ? 'bg-blue-50' : ''}`}
      >
        <span className="text-xl">🇹🇿</span>
        <span className="text-sm font-semibold text-gray-800">Kiswahili</span>
        {lang === 'sw' && <span className="ml-auto text-blue-500 font-bold">✓</span>}
      </button>
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 bg-dark-900 shadow-lg border-b border-dark-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-secondary-500 rounded-lg flex items-center justify-center">
              <span className="text-dark-900 font-black text-sm">SH</span>
            </div>
            <span className="text-xl font-black text-white">Safiri <span className="text-secondary-400">Haraka</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-6">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}
                className="text-dark-300 hover:text-secondary-400 transition-colors text-sm font-medium">
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dark-600 hover:bg-dark-800 transition-colors text-sm text-dark-200 font-medium"
              >
                <FaGlobe className="text-secondary-400" />
                <span>{lang === 'en' ? '🇬🇧 EN' : '🇹🇿 SW'}</span>
              </button>
              {showLangMenu && <LangMenu />}
            </div>
            <Link to="/login">
              <button className="px-4 py-2 rounded-lg border border-dark-600 text-dark-200 hover:bg-dark-800 transition-colors text-sm font-semibold">
                {pubI18n.t('nav_sign_in')}
              </button>
            </Link>
            <Link to="/login?intent=book">
              <button className="px-4 py-2 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-dark-900 transition-colors text-sm font-black shadow-lg">
                {pubI18n.t('nav_book_ride')}
              </button>
            </Link>
          </div>

          {/* Mobile Right */}
          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-gray-600 text-sm text-white"
              >
                <FaGlobe className="text-xs" />
                <span>{lang === 'en' ? '🇬🇧' : '🇹🇿'}</span>
              </button>
              {showLangMenu && <LangMenu />}
            </div>
            <button className="text-white text-2xl" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-2 border-t border-dark-700">
            {navLinks.map((link) => (
              <Link key={link.path} to={link.path}
                className="block text-dark-300 hover:text-secondary-400 transition-colors py-2 font-medium"
                onClick={() => setMobileMenuOpen(false)}>
                {link.name}
              </Link>
            ))}
            <div className="space-y-2 pt-4 border-t border-dark-700">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full py-3 rounded-lg border border-dark-600 text-dark-200 hover:bg-dark-800 transition-colors font-semibold">
                  {pubI18n.t('nav_sign_in')}
                </button>
              </Link>
              <Link to="/login?intent=book" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full py-3 rounded-lg bg-secondary-500 hover:bg-secondary-600 text-dark-900 transition-colors font-black">
                  {pubI18n.t('nav_book_ride')}
                </button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;

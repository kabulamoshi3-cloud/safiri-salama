import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FaBars, FaTimes, FaGlobe } from 'react-icons/fa';
import { pubI18n } from '../i18n';

const Navbar: React.FC = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);
  const location = useLocation();

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

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  const LangMenu = () => (
    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50">
      {(['en', 'sw'] as const).map(l => (
        <button
          key={l}
          onClick={() => { pubI18n.setLanguage(l); setShowLangMenu(false); }}
          className={`w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 ${lang === l ? 'bg-blue-50' : ''}`}
        >
          <span className="text-xl">{l === 'en' ? '🇬🇧' : '🇹🇿'}</span>
          <span className="text-sm font-semibold text-gray-800">{l === 'en' ? 'English' : 'Kiswahili'}</span>
          {lang === l && <span className="ml-auto text-blue-500 font-bold">✓</span>}
        </button>
      ))}
    </div>
  );

  return (
    <nav className="sticky top-0 z-50 bg-[#0F172A] shadow-lg border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#2563EB] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">SR</span>
            </div>
            <span className="text-xl font-black text-white">Sky<span className="text-[#f59e0b]">Rex</span></span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center space-x-1">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-white bg-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            ))}
          </div>

          {/* Desktop Right */}
          <div className="hidden md:flex items-center gap-3">
            {/* Language */}
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/20 hover:bg-white/10 text-sm text-gray-300 font-medium transition-colors"
              >
                <FaGlobe className="text-[#f59e0b]" />
                <span>{lang === 'en' ? '🇬🇧 EN' : '🇹🇿 SW'}</span>
              </button>
              {showLangMenu && <LangMenu />}
            </div>

            {/* Sign In */}
            <Link to="/login">
              <button className="px-4 py-2 rounded-lg border border-white/20 text-gray-200 hover:bg-white/10 transition-colors text-sm font-semibold">
                {pubI18n.t('nav_sign_in')}
              </button>
            </Link>

            {/* Book a Ride */}
            <Link to="/login">
              <button className="px-4 py-2 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0F172A] transition-colors text-sm font-black shadow-lg">
                {pubI18n.t('nav_book_ride')}
              </button>
            </Link>
          </div>

          {/* Mobile Right */}
          <div className="md:hidden flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowLangMenu(!showLangMenu)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-white/20 text-sm text-white"
              >
                <FaGlobe className="text-xs" />
                <span>{lang === 'en' ? '🇬🇧' : '🇹🇿'}</span>
              </button>
              {showLangMenu && <LangMenu />}
            </div>
            <button
              className="text-white text-2xl p-1"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 space-y-1 border-t border-white/10">
            {navLinks.map(link => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2.5 rounded-lg font-medium transition-colors ${
                  isActive(link.path)
                    ? 'text-white bg-white/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.name}
              </Link>
            ))}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full py-3 rounded-lg border border-white/20 text-gray-200 hover:bg-white/10 transition-colors font-semibold">
                  {pubI18n.t('nav_sign_in')}
                </button>
              </Link>
              <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                <button className="w-full py-3 rounded-lg bg-[#f59e0b] hover:bg-[#d97706] text-[#0F172A] transition-colors font-black">
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

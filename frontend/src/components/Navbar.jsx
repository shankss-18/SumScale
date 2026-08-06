import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

import BrandIcon from './BrandIcon';

const Navbar = () => {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  const handleDemoLogin = async () => {
    try {
      await login('demo@omniaid.ai', 'DemoUserPass123!');
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
  };

  const handleLogout = () => {
    setDropdownOpen(false);
    setMobileMenuOpen(false);
    logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="w-full px-3 sm:px-4 pt-3 pb-1 sticky top-0 z-50">
      <header className="max-w-6xl mx-auto rounded-full bg-white/95 backdrop-blur-md border border-slate-200/80 shadow-xs px-4 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between">
        {/* Lowercase Bold Logo with Brand Icon */}
        <Link to="/" className="flex items-center space-x-2 shrink-0 group">
          <BrandIcon className="w-6 h-4 sm:w-7 sm:h-5 text-[#006D77] group-hover:scale-110 transition-transform" />
          <span className="text-lg sm:text-xl font-extrabold text-[#006D77] tracking-tight font-serif lowercase">
            sumscale
          </span>
        </Link>

        {/* Center Navigation Links (Desktop) */}
        <nav className="hidden md:flex items-center space-x-6 text-[11px] font-extrabold uppercase tracking-widest text-slate-600">
          <Link
            to="/"
            className={`hover:text-[#006D77] transition-colors ${
              location.pathname === '/' ? 'text-[#006D77] border-b-2 border-[#006D77] pb-0.5' : ''
            }`}
          >
            {t('nav.platform')}
          </Link>

          {user && (
            <Link
              to="/dashboard"
              className={`hover:text-[#006D77] transition-colors ${
                location.pathname === '/dashboard' ? 'text-[#006D77] border-b-2 border-[#006D77] pb-0.5' : ''
              }`}
            >
              {t('nav.dashboard')}
            </Link>
          )}

          {user && (
            <Link
              to="/new-case"
              className={`hover:text-[#006D77] transition-colors ${
                location.pathname === '/new-case' ? 'text-[#006D77] border-b-2 border-[#006D77] pb-0.5' : ''
              }`}
            >
              {t('nav.newCase')}
            </Link>
          )}
        </nav>

        {/* Right Controls */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Language Selector */}
          <select
            value={i18n.language?.split('-')[0] || 'en'}
            onChange={(e) => i18n.changeLanguage(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 text-[11px] sm:text-xs font-semibold rounded-full px-2.5 sm:px-3 py-1 sm:py-1.5 focus:outline-none focus:border-[#006D77] cursor-pointer"
          >
            <option value="en">English (US)</option>
            <option value="hi">हिन्दी (Hindi)</option>
            <option value="te">తెలుగు (Telugu)</option>
            <option value="ta">தமிழ் (Tamil)</option>
            <option value="kn">ಕನ್ನಡ (Kannada)</option>
          </select>

          {user ? (
            /* Account Dropdown Menu (Desktop) */
            <div className="relative hidden md:block" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="bg-slate-50 hover:bg-slate-100 border border-slate-200/90 text-slate-800 rounded-full px-3.5 py-1.5 text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all shadow-2xs"
              >
                <div className="w-5 h-5 rounded-full bg-[#006D77] text-white text-[10px] font-extrabold flex items-center justify-center">
                  {user.email?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="max-w-[110px] truncate font-semibold">
                  {user.email}
                </span>
                <span className="text-[10px] text-slate-500">▾</span>
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white border border-slate-200/90 rounded-2xl shadow-xl py-2 z-50">
                  <div className="px-4 py-2 border-b border-slate-100">
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Account</p>
                    <p className="text-xs font-bold text-slate-900 truncate mt-0.5">{user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link
                      to="/profile"
                      onClick={() => setDropdownOpen(false)}
                      className="px-4 py-2 text-xs text-slate-700 hover:bg-slate-50 font-bold flex items-center space-x-2 transition-colors"
                    >
                      <span>👤</span>
                      <span>Profile & Settings</span>
                    </Link>
                  </div>

                  <div className="pt-1 border-t border-slate-100 px-2">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center space-x-2 transition-colors"
                    >
                      <span>🚪</span>
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="hidden md:flex items-center space-x-2">
              <Link
                to="/login"
                className="bg-[#006D77] text-white hover:bg-[#005a63] rounded-full px-5 py-2 text-xs font-bold transition-all shadow-xs"
              >
                Sign In
              </Link>
              <button
                type="button"
                onClick={handleDemoLogin}
                className="bg-white border border-slate-200 text-[#006D77] hover:bg-[#EDF6F9] rounded-full px-4 py-2 text-xs font-bold transition-all cursor-pointer"
              >
                ⚡ Demo Account
              </button>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm flex items-center justify-center transition-all"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
      </header>

      {/* Mobile Navigation Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden max-w-6xl mx-auto mt-2 bg-white/95 backdrop-blur-xl border border-[#83C5BE]/50 rounded-3xl shadow-xl p-4 space-y-3 z-50 animate-in fade-in slide-in-from-top-2">
          <nav className="flex flex-col space-y-2 text-xs font-extrabold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-3">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className={`p-2.5 rounded-2xl flex items-center justify-between ${
                location.pathname === '/' ? 'bg-[#EDF6F9] text-[#006D77]' : 'hover:bg-slate-50'
              }`}
            >
              <span>{t('nav.platform')}</span>
              <span>→</span>
            </Link>

            {user && (
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-2xl flex items-center justify-between ${
                  location.pathname === '/dashboard' ? 'bg-[#EDF6F9] text-[#006D77]' : 'hover:bg-slate-50'
                }`}
              >
                <span>{t('nav.dashboard')}</span>
                <span>→</span>
              </Link>
            )}

            {user && (
              <Link
                to="/new-case"
                onClick={() => setMobileMenuOpen(false)}
                className={`p-2.5 rounded-2xl flex items-center justify-between ${
                  location.pathname === '/new-case' ? 'bg-[#EDF6F9] text-[#006D77]' : 'hover:bg-slate-50'
                }`}
              >
                <span>{t('nav.newCase')}</span>
                <span>+</span>
              </Link>
            )}
          </nav>

          {user ? (
            <div className="space-y-2 pt-1">
              <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2 truncate">
                  <div className="w-6 h-6 rounded-full bg-[#006D77] text-white text-[10px] font-extrabold flex items-center justify-center shrink-0">
                    {user.email?.[0]?.toUpperCase() || 'U'}
                  </div>
                  <span className="text-xs font-bold text-slate-800 truncate">{user.email}</span>
                </div>
                <Link
                  to="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-[11px] font-bold text-[#006D77] hover:underline"
                >
                  Profile
                </Link>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-full py-2.5 px-4 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center justify-center space-x-2 transition-colors"
              >
                <span>🚪 Sign Out</span>
              </button>
            </div>
          ) : (
            <div className="flex flex-col space-y-2 pt-1">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-2.5 rounded-2xl bg-[#006D77] text-white text-center font-bold text-xs shadow-xs"
              >
                Sign In
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleDemoLogin();
                }}
                className="w-full py-2.5 rounded-2xl bg-white border border-slate-200 text-[#006D77] font-bold text-xs"
              >
                ⚡ Quick Demo Account
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Navbar;

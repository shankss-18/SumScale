import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import FloatingChatbot from '../components/FloatingChatbot';
import { useAuth } from '../context/AuthContext';

const ProfilePage = () => {
  const { user, logout } = useAuth();
  const { i18n } = useTranslation();
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState(null);

  const handleSave = (e) => {
    e.preventDefault();
    if (password && password.length < 8) {
      setMsg('Password must be at least 8 characters long.');
      return;
    }
    setMsg('Profile settings updated!');
    setPassword('');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-[#EDF6F9] text-slate-800 flex flex-col font-sans antialiased sarvam-gradient-purple">
      <Navbar />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 py-12 flex flex-col justify-center">
        {/* Simple Single Profile Card */}
        <div className="bg-white p-8 rounded-3xl border border-[#83C5BE]/50 shadow-md space-y-6">
          {/* Avatar & User Header */}
          <div className="flex items-center space-x-4 pb-6 border-b border-slate-100">
            <div className="w-14 h-14 rounded-full bg-[#006D77] text-white font-extrabold text-xl flex items-center justify-center shadow-xs shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-lg font-bold text-slate-900 truncate">
                {user?.email}
              </h1>
              <span className="inline-block mt-0.5 text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-[#EDF6F9] text-[#006D77]">
                Active Account
              </span>
            </div>
          </div>

          {msg && (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center">
              {msg}
            </div>
          )}

          {/* Simple Settings Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                disabled
                value={user?.email || ''}
                className="w-full px-4 py-2.5 rounded-full bg-slate-100 border border-slate-200 text-slate-500 text-xs font-medium cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Language
              </label>
              <select
                value={i18n.language?.split('-')[0] || 'en'}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold rounded-full px-4 py-2.5 focus:outline-none focus:border-[#006D77] cursor-pointer"
              >
                <option value="en">English (US)</option>
                <option value="hi">हिन्दी (Hindi)</option>
                <option value="te">తెలుగు (Telugu)</option>
                <option value="ta">தமிழ் (Tamil)</option>
                <option value="kn">ಕನ್ನಡ (Kannada)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                New Password (Optional)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank to keep current password"
                className="w-full px-4 py-2.5 rounded-full bg-slate-50 border border-slate-200 text-xs text-slate-900 focus:outline-none focus:border-[#006D77]"
              />
            </div>

            <div className="pt-2 flex items-center justify-between gap-3">
              <button
                type="submit"
                className="flex-1 py-3 px-4 rounded-full bg-[#006D77] hover:bg-[#005a63] text-white font-bold text-xs shadow-xs transition-colors"
              >
                Save Settings
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="py-3 px-5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </form>
        </div>
      </main>

      <FloatingChatbot />
    </div>
  );
};

export default ProfilePage;

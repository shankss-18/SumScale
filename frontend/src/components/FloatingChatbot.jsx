import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../api/client';
import { useTranslation } from 'react-i18next';

const FloatingChatbot = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const { i18n, t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const initialHistory = [
    {
      sender: 'bot',
      text: 'Hello! Ask me any question about your uploaded documents for a quick summary.',
      cited_cases: [],
    },
  ];

  const [chatHistory, setChatHistory] = useState(initialHistory);

  const getStorageKey = () => {
    const keyId = user?.id || user?.email || 'default_user';
    return `sumscale_chat_history_${keyId}`;
  };

  // Load chat history from localStorage
  useEffect(() => {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setChatHistory(parsed);
          return;
        }
      } catch {}
    }
    // Fallback search across any stored chat key
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('sumscale_chat_history_')) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(parsed) && parsed.length > 0) {
            setChatHistory(parsed);
            return;
          }
        } catch {}
      }
    }
    setChatHistory(initialHistory);
  }, [user]);

  // Listen for open_floating_chat event triggered from dashboard previous chats
  useEffect(() => {
    const handleOpenEvent = (e) => {
      setIsOpen(true);
      if (e.detail?.text) {
        handleSendText(e.detail.text);
      }
    };
    window.addEventListener('open_floating_chat', handleOpenEvent);
    return () => window.removeEventListener('open_floating_chat', handleOpenEvent);
  }, []);

  // Save chat history to localStorage
  const saveHistory = (newHistory) => {
    setChatHistory(newHistory);
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(newHistory));
  };

  const clearChatHistory = () => {
    saveHistory(initialHistory);
  };

  if (!isAuthenticated || location.pathname.startsWith('/case/')) return null;

  const handleSendText = async (textToSend) => {
    if (!textToSend.trim() || loading) return;

    const userText = textToSend.trim();
    setMessage('');

    const updatedWithUser = [
      ...chatHistory,
      { sender: 'user', text: userText, cited_cases: [] },
    ];
    saveHistory(updatedWithUser);

    setLoading(true);
    try {
      const res = await apiClient.post('/chat', {
        message: `${userText} (Please provide a concise, short, simple answer)`,
        language: i18n.language ? i18n.language.split('-')[0] : 'en',
      });
      const { answer, cited_cases } = res.data;

      const updatedWithBot = [
        ...updatedWithUser,
        {
          sender: 'bot',
          text: answer,
          cited_cases: cited_cases || [],
        },
      ];
      saveHistory(updatedWithBot);
    } catch (err) {
      const updatedWithError = [
        ...updatedWithUser,
        {
          sender: 'bot',
          text: 'Sorry, I encountered an issue analyzing your document context. Please try again.',
          cited_cases: [],
        },
      ];
      saveHistory(updatedWithError);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendText(message);
  };

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 font-sans">
      {/* Compact Gemini Spark Pill Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="px-3.5 py-2 rounded-full bg-[#006D77] hover:bg-[#005a63] text-white font-bold text-xs shadow-lg border border-white/20 flex items-center space-x-2.5 transition-all duration-300 hover:scale-105 active:scale-95 group"
          title="Open AI Help"
        >
          {/* Gemini Spark Icon */}
          <div className="relative flex items-center justify-center">
            <svg className="w-4 h-4 text-amber-300 animate-pulse" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
            </svg>
          </div>

          {/* Short Label */}
          <span className="text-xs font-extrabold tracking-tight text-white pr-0.5">
            {t('chat.floatingBtn')}
          </span>
        </button>
      )}

      {/* Visually Stunning Ocean Breeze Glass Popup Window */}
      {isOpen && (
        <div className="w-76 sm:w-80 h-[400px] bg-white/85 backdrop-blur-2xl border border-[#83C5BE]/60 rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative">
          {/* Ambient Ocean Glow */}
          <div className="absolute inset-0 bg-gradient-to-tr from-[#83C5BE]/20 via-transparent to-[#006D77]/10 pointer-events-none" />

          {/* Header */}
          <div className="p-3 bg-[#006D77] text-white flex items-center justify-between border-b border-white/10 relative z-10">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-amber-300" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C12 6.627 6.627 12 0 12C6.627 12 12 17.373 12 24C12 17.373 17.373 12 24 12C17.373 12 12 6.627 12 0Z" />
              </svg>
              <div>
                <h3 className="text-xs font-extrabold text-white flex items-center gap-1">
                  Gemini AI Guide
                  <span className="w-1.5 h-1.5 rounded-full bg-[#83C5BE] animate-pulse" />
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                type="button"
                onClick={clearChatHistory}
                className="text-[10px] text-[#83C5BE] hover:text-white px-2 py-0.5 rounded-full bg-white/10 hover:bg-white/20 transition-colors border border-white/10 font-bold"
                title="Clear History"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-6 h-6 rounded-full hover:bg-white/10 text-slate-200 hover:text-white font-bold text-xs flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Translucent Chat Feed */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2.5 bg-[#EDF6F9]/40 backdrop-blur-xs relative z-10">
            {chatHistory.map((item, idx) => (
              <div
                key={idx}
                className={`flex flex-col ${
                  item.sender === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[88%] p-2.5 rounded-2xl text-[11px] leading-relaxed transition-all ${
                    item.sender === 'user'
                      ? 'bg-[#006D77] text-white font-medium rounded-tr-none shadow-2xs border border-[#006D77]/80'
                      : 'bg-white/90 backdrop-blur-md border border-[#83C5BE]/40 text-slate-800 font-normal rounded-tl-none shadow-2xs'
                  }`}
                >
                  {item.text}

                  {/* Citations block */}
                  {item.cited_cases && item.cited_cases.length > 0 && (
                    <div className="mt-1.5 pt-1.5 border-t border-slate-200/50 space-y-1">
                      <p className="text-[9px] uppercase font-bold text-[#006D77] tracking-wider">
                        Sources ({item.cited_cases.length}):
                      </p>
                      {item.cited_cases.map((cite, cIdx) => (
                        <div
                          key={cIdx}
                          className="text-[9px] text-slate-700 bg-[#EDF6F9] p-1 rounded-lg border border-[#83C5BE]/30"
                        >
                          {cite.summary}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex items-center space-x-2 text-[11px] text-[#006D77] font-semibold p-2 bg-white/70 backdrop-blur-xs rounded-xl border border-[#83C5BE]/40">
                <span className="w-2 h-2 rounded-full bg-[#006D77] animate-ping" />
                <span>Searching document context...</span>
              </div>
            )}
          </div>

          {/* Translucent Input Bar */}
          <form onSubmit={handleSubmit} className="p-2 bg-white/80 backdrop-blur-md border-t border-[#83C5BE]/40 flex items-center space-x-1.5 relative z-10">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ask a quick question..."
              className="flex-1 px-3 py-1.5 rounded-full bg-white border border-[#83C5BE]/50 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#006D77] focus:ring-1 focus:ring-[#006D77]/30 font-medium transition-all"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="px-3 py-1.5 rounded-full bg-[#006D77] hover:bg-[#005a63] text-white font-bold text-xs shadow-2xs disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default FloatingChatbot;

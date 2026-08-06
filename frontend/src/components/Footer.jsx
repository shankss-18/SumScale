import React from 'react';
import { Link } from 'react-router-dom';
import BrandIcon from './BrandIcon';

const Footer = () => {
  return (
    <footer className="w-full bg-[#003840] text-white pt-16 pb-8 border-t border-[#006D77]/40 font-sans mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Top Grid (4 Columns) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Col 1: Brand & Description (Cols 4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="flex items-center space-x-2.5">
              <span className="w-3 h-3 rounded-full bg-[#83C5BE] animate-ping" />
              <div className="flex items-center space-x-2">
                <BrandIcon className="w-7 h-5 text-[#83C5BE]" color="#83C5BE" secondaryColor="#EDF6F9" />
                <span className="text-2xl font-extrabold text-white tracking-tight font-serif lowercase">
                  sumscale
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-normal max-w-sm">
              Multimodal AI platform for decision support. Smart document digitisation, multilingual audio transcription, RAG Copilot chat, and fraud security shield — all in one unified workspace.
            </p>

            {/* Social Icons Row */}
            <div className="flex items-center space-x-3 pt-2">
              {[
                { name: 'Instagram', label: 'IG', icon: '📷', url: 'https://instagram.com' },
                { name: 'Facebook', label: 'FB', icon: '🌐', url: 'https://facebook.com' },
                { name: 'X / Twitter', label: 'X', icon: '🐦', url: 'https://x.com' },
                { name: 'LinkedIn', label: 'IN', icon: '💼', url: 'https://linkedin.com' },
                { name: 'YouTube', label: 'YT', icon: '▶️', url: 'https://youtube.com' },
                { name: 'WhatsApp', label: 'WA', icon: '💬', url: 'https://whatsapp.com' },
              ].map((item, idx) => (
                <a
                  key={idx}
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  title={item.name}
                  className="w-8 h-8 rounded-xl bg-white/10 hover:bg-[#006D77] border border-white/15 flex items-center justify-center text-xs transition-all hover:scale-110 active:scale-95"
                >
                  <span>{item.icon}</span>
                </a>
              ))}
            </div>
          </div>

          {/* Col 2: Quick Links (Cols 2) */}
          <div className="lg:col-span-2 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#83C5BE]">
              Quick Links
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>
                <Link to="/" className="hover:text-white transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/new-case" className="hover:text-white transition-colors">Upload Docs</Link>
              </li>
              <li>
                <Link to="/dashboard" className="hover:text-white transition-colors">Dashboard</Link>
              </li>
              <li>
                <a href="#about-us" className="hover:text-white transition-colors">About Us</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Services & Capabilities (Cols 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#83C5BE]">
              Capabilities
            </h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li>Multilingual Speech & Voice Notes</li>
              <li>Document & PDF Digitisation</li>
              <li>RAG Copilot Chat Assistant</li>
              <li>Fraud & Security Risk Shield</li>
              <li>Smart Action Plan & Reminders</li>
              <li>Indian Languages (HI, TE, TA, KN)</li>
            </ul>
          </div>

          {/* Col 4: Contact Us (Cols 3) */}
          <div className="lg:col-span-3 space-y-3">
            <h4 className="text-xs font-extrabold uppercase tracking-widest text-[#83C5BE]">
              Contact Us
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-300 font-medium">
              <li className="flex items-start space-x-2">
                <span className="text-rose-400">📍</span>
                <span>12, Tech Park Road, Bengaluru – 560066, Karnataka</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-emerald-400">📞</span>
                <span>+91 95509 60744</span>
              </li>
              <li className="flex items-center space-x-2">
                <span className="text-sky-400">✉️</span>
                <span>hello@sumscale.ai</span>
              </li>
              <li className="flex items-start space-x-2 text-[11px] text-slate-400 pt-1">
                <span>🕒</span>
                <span>Mon – Fri: 9:00 AM – 6:00 PM<br />Sat: 9:00 AM – 1:00 PM</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Copyright & Policy Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <p>© 2026 SumScale Platform. All rights reserved.</p>
          <div className="flex items-center space-x-6">
            <a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#terms" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#cookies" className="hover:text-white transition-colors">Cookie Policy</a>
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;

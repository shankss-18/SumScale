import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BrandIcon from '../components/BrandIcon';
import Footer from '../components/Footer';
import Hero3DCanvas from '../components/Hero3DCanvas';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const LandingPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#EDF6F9] text-slate-800 flex flex-col font-sans antialiased sarvam-gradient-bg">
      <Navbar />

      <style>{`
        @keyframes hero-float-1 {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(-12px) rotate(1.5deg) scale(1.02); }
        }
        @keyframes hero-float-2 {
          0%, 100% { transform: translateY(0px) rotate(0deg) scale(1); }
          50% { transform: translateY(14px) rotate(-1.5deg) scale(1.02); }
        }
        .hero-glass-badge-1 {
          animation: hero-float-1 5s ease-in-out infinite;
        }
        .hero-glass-badge-2 {
          animation: hero-float-2 6s ease-in-out infinite 0.5s;
        }
      `}</style>

      {/* ── 3D Interactive Primary Hero Section ── */}
      <section className="relative py-20 sm:py-32 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full text-center flex flex-col items-center justify-center min-h-[560px] overflow-hidden">
        {/* 3D WebGL Particle Neural Canvas Background */}
        <Hero3DCanvas />

        {/* Ambient Gradient Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-to-tr from-[#83C5BE]/30 to-[#006D77]/15 rounded-full blur-3xl pointer-events-none" />

        {/* 3D Floating Interactive Glass Card — Left */}
        <div className="hidden lg:flex hero-glass-badge-1 absolute left-4 top-1/4 bg-white/75 backdrop-blur-xl border border-[#83C5BE]/60 rounded-2xl p-3.5 shadow-xl items-center space-x-3 text-left pointer-events-auto hover:scale-108 transition-transform cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#006D77] text-white flex items-center justify-center text-lg shadow-xs">
            🎙️
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase text-[#006D77] tracking-wider">Voice Intelligence</p>
            <p className="text-xs font-extrabold text-slate-800">Regional Speech-to-Text</p>
          </div>
        </div>

        {/* 3D Floating Interactive Glass Card — Right */}
        <div className="hidden lg:flex hero-glass-badge-2 absolute right-4 bottom-1/4 bg-white/75 backdrop-blur-xl border border-[#83C5BE]/60 rounded-2xl p-3.5 shadow-xl items-center space-x-3 text-left pointer-events-auto hover:scale-108 transition-transform cursor-pointer">
          <div className="w-10 h-10 rounded-xl bg-[#83C5BE] text-[#006D77] flex items-center justify-center text-lg shadow-xs font-bold">
            📄
          </div>
          <div>
            <p className="text-[10px] font-extrabold uppercase text-[#006D77] tracking-wider">Document OCR</p>
            <p className="text-xs font-extrabold text-slate-800">Structured Fact Extraction</p>
          </div>
        </div>

        {/* Foreground Content */}
        <div className="relative z-10 space-y-8 max-w-4xl mx-auto">
          {/* Brand Icon Ornament with Animated Pulse Ring */}
          <div className="flex flex-col items-center space-y-3">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-16 h-16 rounded-full bg-[#83C5BE]/30 animate-ping" />
              <BrandIcon className="w-16 h-10 text-[#006D77] relative z-10 drop-shadow-sm" />
            </div>
            <span className="text-xs font-extrabold tracking-wider uppercase text-[#006D77] bg-white/80 backdrop-blur-md border border-[#83C5BE]/40 px-4 py-1 rounded-full shadow-2xs">
              {t('home.badge')}
            </span>
          </div>

          {/* Hero Heading */}
          <h1 className="text-5xl sm:text-7xl font-normal font-serif text-[#006D77] tracking-tight leading-tight max-w-4xl mx-auto drop-shadow-2xs">
            {t('home.heroTitle')}
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-medium bg-white/40 backdrop-blur-xs p-3 rounded-2xl border border-white/60">
            {t('home.card1Desc')}
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            {user ? (
              <>
                <Link
                  to="/new-case"
                  className="bg-[#006D77] text-white hover:bg-[#005a63] rounded-full px-8 py-4 text-xs sm:text-sm font-extrabold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                  <span>{t('nav.uploadBtn')}</span>
                  <span>→</span>
                </Link>
                <Link
                  to="/dashboard"
                  className="bg-white/90 border border-[#83C5BE] text-[#006D77] hover:bg-[#EDF6F9] rounded-full px-8 py-4 text-xs sm:text-sm font-extrabold transition-all shadow-xs hover:scale-105 active:scale-95"
                >
                  {t('nav.dashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="bg-[#006D77] text-white hover:bg-[#005a63] rounded-full px-8 py-4 text-xs sm:text-sm font-extrabold transition-all shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 flex items-center space-x-2"
                >
                  <span>{t('nav.signIn')}</span>
                  <span>→</span>
                </Link>
                <Link
                  to="/signup"
                  className="bg-white/90 border border-[#83C5BE] text-[#006D77] hover:bg-[#EDF6F9] rounded-full px-8 py-4 text-xs sm:text-sm font-extrabold transition-all shadow-xs hover:scale-105 active:scale-95"
                >
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>
        </div>
      </section>

      {/* ── About Us & Real-World Solutions Section ── */}
      <section id="about-us" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12 scroll-mt-24">
        {/* Section Header */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#EDF6F9] border border-[#83C5BE]/40">
            <BrandIcon className="w-5 h-3.5 text-[#006D77]" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#006D77]">
              {t('home.aboutBadge', 'About SumScale AI')}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-normal font-serif text-[#006D77] tracking-tight leading-tight">
            {t('home.aboutTitle', 'Solving Real-World Challenges with Multimodal Intelligence')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            {t('home.aboutDesc', "SumScale AI was engineered to solve one of modern society's biggest bottlenecks: converting complex, unstructured real-world data—medical lab reports, handwritten records, and regional voice notes—into instant, reliable decision support.")}
          </p>
        </div>

        {/* Real-World Solutions Grid (Exact Reference Card UI) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Card 1 — Speech & Voice Notes (Light Card) */}
          <Link
            to="/new-case"
            className="capability-card bg-white border border-[#83C5BE]/30 p-8 flex flex-col justify-between space-y-6 group no-underline relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            style={{ borderRadius: '2.5rem 1.5rem 2.5rem 1.5rem' }}
          >
            {/* Top Right Organic Soft Blob Overlay */}
            <div
              className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125"
              style={{ background: 'rgba(131, 197, 190, 0.18)' }}
            />

            <div className="relative z-10 space-y-5">
              {/* Badges Row */}
              <div className="flex flex-wrap gap-2">
                {['Voice', 'Audio', 'Live'].map((badge) => (
                  <span
                    key={badge}
                    className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/40"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Title & Underline */}
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900 leading-tight group-hover:text-[#006D77] transition-colors">
                  {t('home.card1Title')}
                </h3>
                <div className="w-12 h-0.5 bg-[#83C5BE]" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                {t('home.card1Desc')}
              </p>

              {/* Bullets */}
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>{t('home.card1b1')}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>{t('home.card1b2')}</span>
                </li>
              </ul>
            </div>

            {/* CTA Arrow Link */}
            <div className="relative z-10 pt-2 text-xs font-extrabold text-[#006D77] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>{t('home.card1Cta')}</span>
            </div>
          </Link>

          {/* Card 2 — Document Digitisation (Featured Ocean Teal Dark Card) */}
          <Link
            to="/new-case"
            className="capability-card bg-[#006D77] text-white border border-[#006D77] p-8 flex flex-col justify-between space-y-6 group no-underline relative overflow-hidden shadow-xl transition-all duration-300 hover:shadow-2xl hover:-translate-y-1"
            style={{ borderRadius: '1.5rem 2.5rem 1.5rem 2.5rem' }}
          >
            {/* Bottom Left Organic Blob Accent */}
            <div
              className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none opacity-20 transition-transform duration-500 group-hover:scale-125"
              style={{ background: '#83C5BE' }}
            />

            <div className="relative z-10 space-y-5">
              {/* Badges Row */}
              <div className="flex flex-wrap gap-2">
                {['PDF', 'Images', 'CSV'].map((badge) => (
                  <span
                    key={badge}
                    className="px-3.5 py-1 rounded-full text-xs font-semibold bg-white/15 text-white border border-white/20"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Title & Underline */}
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-white leading-tight">
                  {t('home.card2Title')}
                </h3>
                <div className="w-12 h-0.5 bg-white/40" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                {t('home.card2Desc')}
              </p>

              {/* Bullets */}
              <ul className="space-y-2 pt-2 text-xs font-semibold text-white">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>{t('home.card2b1')}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>{t('home.card2b2')}</span>
                </li>
              </ul>
            </div>

            {/* CTA Arrow Link */}
            <div className="relative z-10 pt-2 text-xs font-extrabold text-white flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>{t('home.card2Cta')}</span>
            </div>
          </Link>

          {/* Card 3 — Fraud & Security Shield (Light Card) */}
          <Link
            to="/new-case"
            className="capability-card bg-white border border-[#83C5BE]/30 p-8 flex flex-col justify-between space-y-6 group no-underline relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
            style={{ borderRadius: '2.5rem 1.5rem 2.5rem 1.5rem' }}
          >
            {/* Top Left Organic Soft Blob Overlay */}
            <div
              className="absolute -top-6 -left-6 w-32 h-32 rounded-full pointer-events-none transition-transform duration-500 group-hover:scale-125"
              style={{ background: 'rgba(131, 197, 190, 0.18)' }}
            />

            <div className="relative z-10 space-y-5">
              {/* Badges Row */}
              <div className="flex flex-wrap gap-2">
                {['Phishing', 'Scams', 'Fraud'].map((badge) => (
                  <span
                    key={badge}
                    className="px-3.5 py-1 rounded-full text-xs font-semibold bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/40"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              {/* Title & Underline */}
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900 leading-tight group-hover:text-[#006D77] transition-colors">
                  {t('home.card3Title')}
                </h3>
                <div className="w-12 h-0.5 bg-[#83C5BE]" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                {t('home.card3Desc')}
              </p>

              {/* Bullets */}
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>{t('home.card3b1')}</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>{t('home.card3b2')}</span>
                </li>
              </ul>
            </div>

            {/* CTA Arrow Link */}
            <div className="relative z-10 pt-2 text-xs font-extrabold text-[#006D77] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>{t('home.card3Cta')}</span>
            </div>
          </Link>

        </div>

        {/* Real-World Impact Metrics Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#003840] via-[#006D77] to-[#005A63] text-white p-8 sm:p-10 shadow-lg grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">90%</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{t('home.stat1', 'Faster Case Analysis')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">5+</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{t('home.stat2', 'Indian Vernaculars')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">100%</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{t('home.stat3', 'OTP Verified Access')}</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">&lt; 3s</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">{t('home.stat4', 'Real-Time AI Response')}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;

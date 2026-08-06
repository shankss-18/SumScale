import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BrandIcon from '../components/BrandIcon';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

const LandingPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-[#EDF6F9] text-slate-800 flex flex-col font-sans antialiased sarvam-gradient-bg">
      <Navbar />

      {/* Hero Section */}
      <section className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
        {/* Brand Icon Ornament */}
        <div className="flex flex-col items-center space-y-3">
          <BrandIcon className="w-16 h-10 text-[#006D77]" />
          <span className="text-xs font-semibold tracking-wide text-[#006D77]">
            {t('home.badge')}
          </span>
        </div>

        {/* Hero Heading */}
        <h1 className="text-5xl sm:text-7xl font-normal font-serif text-[#006D77] tracking-tight leading-tight max-w-4xl mx-auto">
          {t('home.heroTitle')}
        </h1>

        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
          {t('home.card1Desc')}
        </p>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          {user ? (
            <>
              <Link
                to="/new-case"
                className="bg-[#006D77] text-white hover:bg-[#005a63] rounded-full px-7 py-3.5 text-xs font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                {t('nav.uploadBtn')}
              </Link>
              <Link
                to="/dashboard"
                className="bg-white border border-[#83C5BE]/60 text-[#006D77] hover:bg-[#EDF6F9] rounded-full px-7 py-3.5 text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95"
              >
                {t('nav.dashboard')}
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="bg-[#006D77] text-white hover:bg-[#005a63] rounded-full px-7 py-3.5 text-xs font-bold transition-all shadow-md hover:shadow-lg hover:scale-105 active:scale-95"
              >
                {t('nav.signIn')}
              </Link>
              <Link
                to="/signup"
                className="bg-white border border-[#83C5BE]/60 text-[#006D77] hover:bg-[#EDF6F9] rounded-full px-7 py-3.5 text-xs font-bold transition-all shadow-2xs hover:scale-105 active:scale-95"
              >
                {t('nav.register')}
              </Link>
            </>
          )}
        </div>
      </section>

      {/* ── About Us & Real-World Solutions Section ── */}
      <section id="about-us" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-12 scroll-mt-24">
        {/* Section Header */}
        <div className="space-y-4 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1 rounded-full bg-[#EDF6F9] border border-[#83C5BE]/40">
            <BrandIcon className="w-5 h-3.5 text-[#006D77]" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#006D77]">About SumScale AI</span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-normal font-serif text-[#006D77] tracking-tight leading-tight">
            Solving Real-World Challenges with Multimodal Intelligence
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            SumScale AI was engineered to solve one of modern society's biggest bottlenecks: converting complex, unstructured real-world data—medical lab reports, handwritten records, and regional voice notes—into instant, reliable decision support.
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
                  Speech & Voice Notes
                </h3>
                <div className="w-12 h-0.5 bg-[#83C5BE]" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Record voice notes live from your browser or upload audio files for instant transcription and AI analysis.
              </p>

              {/* Bullets */}
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>HTML5 Live Microphone Capture</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>Multilingual Speech-to-Text</span>
                </li>
              </ul>
            </div>

            {/* CTA Arrow Link */}
            <div className="relative z-10 pt-2 text-xs font-extrabold text-[#006D77] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>Start Recording</span>
              <span>→</span>
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
                  Document Digitisation
                </h3>
                <div className="w-12 h-0.5 bg-white/40" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-normal">
                Extract text, key metrics, and facts from scanned report PDFs, images, lab results, and financial CSV datasets.
              </p>

              {/* Bullets */}
              <ul className="space-y-2 pt-2 text-xs font-semibold text-white">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>PDF, Image & CSV Processing</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>Structured Fact Extraction</span>
                </li>
              </ul>
            </div>

            {/* CTA Arrow Link */}
            <div className="relative z-10 pt-2 text-xs font-extrabold text-white flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>Scan Document</span>
              <span>→</span>
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
                  Fraud & Security Shield
                </h3>
                <div className="w-12 h-0.5 bg-[#83C5BE]" />
              </div>

              {/* Description */}
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed font-normal">
                Detect phishing anomalies, fake invoice screenshots, and urgent impersonation language in messages.
              </p>

              {/* Bullets */}
              <ul className="space-y-2 pt-2 text-xs font-semibold text-slate-700">
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>Phishing & Scam Pattern Spotting</span>
                </li>
                <li className="flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-[#83C5BE]" />
                  <span>Remediation & Escalation Steps</span>
                </li>
              </ul>
            </div>

            {/* CTA Arrow Link */}
            <div className="relative z-10 pt-2 text-xs font-extrabold text-[#006D77] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>Verify Security Risk</span>
              <span>→</span>
            </div>
          </Link>

        </div>

        {/* Real-World Impact Metrics Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-[#003840] via-[#006D77] to-[#005A63] text-white p-8 sm:p-10 shadow-lg grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">90%</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Faster Case Analysis</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">5+</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Indian Vernaculars</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">100%</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">OTP Verified Access</p>
          </div>
          <div className="space-y-1">
            <p className="text-3xl sm:text-4xl font-extrabold text-[#83C5BE]">&lt; 3s</p>
            <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Real-Time AI Response</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
};

export default LandingPage;

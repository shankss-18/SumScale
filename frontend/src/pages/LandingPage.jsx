import React, { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import BrandIcon from '../components/BrandIcon';
import Footer from '../components/Footer';
import Hero3DCanvas from '../components/Hero3DCanvas';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

/* ─── Staggered entrance helper (hero) ──────────────────────────── */
function useHeroEntrance() {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const children = Array.from(el.querySelectorAll('[data-hero]'));
    children.forEach((child, i) => {
      child.style.opacity = '0';
      child.style.transform = 'translateY(28px)';
      child.style.transition = `opacity 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 0.12 + 0.1}s,
                                transform 0.7s cubic-bezier(0.22,1,0.36,1) ${i * 0.12 + 0.1}s`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        child.style.opacity = '1';
        child.style.transform = 'translateY(0)';
      }));
    });
  }, []);
  return ref;
}

/* ─── Scroll-reveal hook (IntersectionObserver) ─────────────────── */
function useScrollReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll('[data-reveal]');
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target;
            const delay = el.dataset.revealDelay || '0';
            el.style.transitionDelay = `${delay}s`;
            el.classList.add('revealed');
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12 }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
}

const LandingPage = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const heroRef = useHeroEntrance();
  const scrollHintRef = useRef(null);
  useScrollReveal();

  // Fade 'scroll to explore' out as user scrolls down
  useEffect(() => {
    const el = scrollHintRef.current;
    if (!el) return;
    const onScroll = () => {
      const y = window.scrollY;
      // fully visible at 0px, fully invisible at 120px
      const op = Math.max(0, 1 - y / 120);
      el.style.opacity  = op;
      el.style.transform = `translateY(${y * 0.25}px)`;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#EDF6F9] text-slate-800 flex flex-col font-sans antialiased">

      <style>{`
        /* ── Scroll-reveal base state (IntersectionObserver driven) ── */
        [data-reveal] {
          opacity: 0;
          transform: translateY(32px);
          transition:
            opacity  0.72s cubic-bezier(0.22,1,0.36,1),
            transform 0.72s cubic-bezier(0.22,1,0.36,1);
        }
        [data-reveal].revealed {
          opacity: 1;
          transform: translateY(0);
        }

        /* ── Capability card pop & shining light sweep ── */
        .cap-card {
          opacity: 0;
          transform: translateY(40px) scale(0.97);
          transition:
            opacity   0.4s ease-out,
            transform 0.15s ease-out,
            box-shadow 0.15s ease-out,
            border-color 0.15s ease-out;
          position: relative;
          overflow: hidden;
        }
        .cap-card.revealed {
          opacity: 1;
          transform: translateY(0) scale(1);
          transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
        }
        .cap-card:hover {
          transform: translateY(-8px) scale(1.015) !important;
          box-shadow: 0 22px 50px -6px rgba(0,109,119,0.26);
          border-color: rgba(131,197,190,0.8);
          transition: transform 0.15s ease-out, box-shadow 0.15s ease-out;
        }

        /* ── Card Shining Reflection Sweep Effect ── */
        .cap-card::after {
          content: '';
          position: absolute;
          top: -50%;
          left: -70%;
          width: 50%;
          height: 200%;
          background: linear-gradient(
            115deg,
            transparent 0%,
            rgba(255, 255, 255, 0.08) 25%,
            rgba(255, 255, 255, 0.55) 50%,
            rgba(255, 255, 255, 0.08) 75%,
            transparent 100%
          );
          transform: rotate(22deg);
          pointer-events: none;
          opacity: 0;
          z-index: 20;
        }

        .cap-card:hover::after {
          opacity: 1;
          animation: card-shine-sweep 0.7s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
        }

        @keyframes card-shine-sweep {
          0% { left: -70%; }
          100% { left: 150%; }
        }

        /* ── Capability cards hover lift ── */
        .capability-card {
          transition: transform 0.15s ease-out,
                      box-shadow 0.15s ease-out;
        }
        .capability-card:hover { transform: translateY(-8px); }

        /* ── Stat counter pulse ── */
        @keyframes stat-pop {
          0%  { transform: scale(0.88); opacity: 0; }
          60% { transform: scale(1.06); }
          100%{ transform: scale(1);   opacity: 1; }
        }
        .stat-val { animation: stat-pop 0.6s cubic-bezier(0.22,1,0.36,1) both; }
        .stat-val-d1 { animation-delay: 0.1s; }
        .stat-val-d2 { animation-delay: 0.22s; }
        .stat-val-d3 { animation-delay: 0.34s; }
        .stat-val-d4 { animation-delay: 0.46s; }

        /* ── Ping ring for brand icon ── */
        @keyframes hero-ping {
          0%   { transform: scale(1);   opacity: 0.6; }
          100% { transform: scale(1.9); opacity: 0; }
        }
        .hero-ping {
          animation: hero-ping 2s cubic-bezier(0,0,0.2,1) infinite;
        }

        /* ── Smooth CTA button hover ── */
        .btn-shimmer {
          background: linear-gradient(
            90deg,
            #005a63 0%, #006D77 40%, #83C5BE 50%, #006D77 60%, #005a63 100%
          );
          background-size: 200% auto;
          animation: btn-shimmer 3.5s linear infinite;
          transition: transform 0.28s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.28s ease,
                      filter 0.28s ease;
        }
        .btn-shimmer:hover {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 12px 36px -6px rgba(0,109,119,0.40);
          filter: brightness(1.08);
        }
        .btn-shimmer:active { transform: scale(0.97); }

        .btn-outline {
          transition: transform 0.28s cubic-bezier(0.22,1,0.36,1),
                      box-shadow 0.28s ease,
                      background-color 0.22s ease;
        }
        .btn-outline:hover {
          transform: translateY(-3px) scale(1.04);
          box-shadow: 0 10px 30px -6px rgba(0,109,119,0.20);
        }
        .btn-outline:active { transform: scale(0.97); }

        /* ── Scroll hint ── */
        .scroll-hint {
          will-change: opacity, transform;
          transition: opacity 0.1s linear;
        }
      `}</style>

      <Navbar />

      {/* ═══════════════════════════════════════════════════════════
          HERO — full-viewport 3D interactive section
      ═══════════════════════════════════════════════════════════ */}
      <section className="relative flex flex-col items-center justify-center text-center
                          min-h-[92vh] h-[92vh] px-4 sm:px-6 lg:px-8 overflow-hidden">

        {/* ── 3D Canvas ── */}
        <Hero3DCanvas />

        {/* ── Subtle top & bottom edge fades only — NO centre blob ── */}
        <div className="absolute inset-0 pointer-events-none"
             style={{
               background:
                 'linear-gradient(to bottom, rgba(237,246,249,0.55) 0%, transparent 18%, transparent 80%, rgba(237,246,249,0.65) 100%)',
             }} />

        {/* ── Hero content (staggered entrance) ── */}
        <div ref={heroRef} className="relative z-10 flex flex-col items-center space-y-7 max-w-4xl mx-auto py-24">

          {/* Headline */}
          <h1 data-hero
              className="text-5xl sm:text-6xl lg:text-7xl font-normal font-serif
                         text-[#006D77] tracking-tight leading-[1.1]">
            {t('home.heroTitle')}
          </h1>

          {/* Sub-copy */}
          <p data-hero
             className="text-base sm:text-lg text-slate-600 max-w-2xl leading-relaxed font-medium
                        bg-white/50 backdrop-blur-sm px-5 py-3.5 rounded-2xl border border-white/70 shadow-sm">
            {t('home.card1Desc')}
          </p>

          {/* CTA row */}
          <div data-hero className="flex flex-wrap items-center justify-center gap-4 pt-1">
            {user ? (
              <>
                <Link to="/new-case"
                      className="btn-shimmer text-white rounded-full px-9 py-4
                                 text-sm font-extrabold shadow-lg hover:shadow-xl
                                 hover:scale-105 active:scale-95 transition-transform
                                 flex items-center gap-2">
                  {t('nav.uploadBtn')} <span className="text-base">→</span>
                </Link>
                <Link to="/dashboard"
                      className="btn-outline bg-white/90 border border-[#83C5BE] text-[#006D77]
                                 hover:bg-[#EDF6F9] rounded-full px-9 py-4 text-sm
                                 font-extrabold shadow-sm">
                  {t('nav.dashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link to="/login"
                      className="btn-shimmer text-white rounded-full px-9 py-4
                                 text-sm font-extrabold shadow-lg hover:shadow-xl
                                 hover:scale-105 active:scale-95 transition-transform
                                 flex items-center gap-2">
                  {t('nav.signIn')} <span className="text-base">→</span>
                </Link>
                <Link to="/signup"
                      className="btn-outline bg-white/90 border border-[#83C5BE] text-[#006D77]
                                 hover:bg-[#EDF6F9] rounded-full px-9 py-4 text-sm
                                 font-extrabold shadow-sm">
                  {t('nav.register')}
                </Link>
              </>
            )}
          </div>

          {/* Scroll hint — fades out on scroll via ref */}
          <div
            ref={scrollHintRef}
            className="scroll-hint flex flex-col items-center gap-1.5 pt-2"
            style={{ opacity: 0.5 }}
          >
            <span className="text-[10px] font-semibold text-[#006D77] uppercase tracking-widest">
              Scroll to explore
            </span>
            <svg width="16" height="24" viewBox="0 0 16 24" fill="none"
                 className="text-[#006D77] animate-bounce">
              <rect x="5" y="1" width="6" height="14" rx="3"
                    stroke="currentColor" strokeWidth="1.5" />
              <circle cx="8" cy="5" r="1.5" fill="currentColor" />
              <path d="M8 18l-3 5h6l-3-5z" fill="currentColor" opacity="0.5" />
            </svg>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════
          ABOUT — Real-world solutions
      ═══════════════════════════════════════════════════════════ */}
      <section id="about-us"
               className="py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto w-full space-y-14 scroll-mt-24">

        {/* Section header */}
        <div data-reveal data-reveal-delay="0" className="space-y-5 text-center max-w-3xl mx-auto">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full
                          bg-[#EDF6F9] border border-[#83C5BE]/40">
            <BrandIcon className="w-5 h-3.5 text-[#006D77]" />
            <span className="text-xs font-extrabold uppercase tracking-widest text-[#006D77]">
              {t('home.aboutBadge', 'About SumScale AI')}
            </span>
          </div>
          <h2 className="text-4xl sm:text-5xl font-normal font-serif text-[#006D77] tracking-tight leading-tight">
            {t('home.aboutTitle', 'Solving Real-World Challenges with Multimodal Intelligence')}
          </h2>
          <p className="text-sm sm:text-base text-slate-600 font-medium leading-relaxed">
            {t('home.aboutDesc',
              "SumScale AI was engineered to solve one of modern society's biggest bottlenecks: " +
              "converting complex, unstructured real-world data—medical lab reports, handwritten records, " +
              "and regional voice notes—into instant, reliable decision support.")}
          </p>
        </div>

        {/* Capability cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* Card 1 — Voice */}
          <Link to="/new-case"
                data-reveal data-reveal-delay="0.06"
                className="cap-card bg-white border border-[#83C5BE]/30 p-8
                           flex flex-col justify-between space-y-6 no-underline relative
                           overflow-hidden shadow-sm"
                style={{ borderRadius: '2.5rem 1.5rem 2.5rem 1.5rem' }}>
            <div className="absolute -top-6 -right-6 w-32 h-32 rounded-full pointer-events-none
                            transition-transform duration-150 group-hover:scale-125"
                 style={{ background: 'rgba(131,197,190,0.18)' }} />
            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap gap-2">
                {['Voice', 'Audio', 'Live'].map(b => (
                  <span key={b} className="px-3.5 py-1 rounded-full text-xs font-semibold
                                           bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/40">
                    {b}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900 leading-tight
                               group-hover:text-[#006D77] transition-colors">
                  {t('home.card1Title')}
                </h3>
                <div className="w-12 h-0.5 bg-[#83C5BE]" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {t('home.card1Desc')}
              </p>
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
            <div className="relative z-10 pt-2 text-xs font-extrabold text-[#006D77]
                            flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>{t('home.card1Cta')}</span>
            </div>
          </Link>

          {/* Card 2 — Documents (dark featured) */}
          <Link to="/new-case"
                data-reveal data-reveal-delay="0.18"
                className="cap-card bg-[#006D77] text-white border border-[#006D77]
                           p-8 flex flex-col justify-between space-y-6 no-underline relative
                           overflow-hidden shadow-xl"
                style={{ borderRadius: '1.5rem 2.5rem 1.5rem 2.5rem' }}>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full pointer-events-none
                            opacity-20 transition-transform duration-150 group-hover:scale-125"
                 style={{ background: '#83C5BE' }} />
            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap gap-2">
                {['PDF', 'Images', 'CSV'].map(b => (
                  <span key={b} className="px-3.5 py-1 rounded-full text-xs font-semibold
                                           bg-white/15 text-white border border-white/20">
                    {b}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-white leading-tight">
                  {t('home.card2Title')}
                </h3>
                <div className="w-12 h-0.5 bg-white/40" />
              </div>
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {t('home.card2Desc')}
              </p>
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
            <div className="relative z-10 pt-2 text-xs font-extrabold text-white
                            flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>{t('home.card2Cta')}</span>
            </div>
          </Link>

          {/* Card 3 — Fraud */}
          <Link to="/new-case"
                data-reveal data-reveal-delay="0.30"
                className="cap-card bg-white border border-[#83C5BE]/30 p-8
                           flex flex-col justify-between space-y-6 no-underline relative
                           overflow-hidden shadow-sm"
                style={{ borderRadius: '2.5rem 1.5rem 2.5rem 1.5rem' }}>
            <div className="absolute -top-6 -left-6 w-32 h-32 rounded-full pointer-events-none
                            transition-transform duration-150 group-hover:scale-125"
                 style={{ background: 'rgba(131,197,190,0.18)' }} />
            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap gap-2">
                {['Phishing', 'Scams', 'Fraud'].map(b => (
                  <span key={b} className="px-3.5 py-1 rounded-full text-xs font-semibold
                                           bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/40">
                    {b}
                  </span>
                ))}
              </div>
              <div className="space-y-2">
                <h3 className="text-2xl font-extrabold text-slate-900 leading-tight
                               group-hover:text-[#006D77] transition-colors">
                  {t('home.card3Title')}
                </h3>
                <div className="w-12 h-0.5 bg-[#83C5BE]" />
              </div>
              <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                {t('home.card3Desc')}
              </p>
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
            <div className="relative z-10 pt-2 text-xs font-extrabold text-[#006D77]
                            flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
              <span>{t('home.card3Cta')}</span>
            </div>
          </Link>

        </div>

        {/* ── Impact metrics banner ── */}
        <div data-reveal data-reveal-delay="0.1"
             className="rounded-3xl
                        bg-gradient-to-r from-[#003840] via-[#006D77] to-[#005A63]
                        text-white p-8 sm:p-10 shadow-xl
                        grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { val: '90%',  key: 'home.stat1', fb: 'Faster Case Analysis',  d: 'stat-val-d1' },
            { val: '5+',   key: 'home.stat2', fb: 'Indian Vernaculars',     d: 'stat-val-d2' },
            { val: '100%', key: 'home.stat3', fb: 'OTP Verified Access',    d: 'stat-val-d3' },
            { val: '< 3s', key: 'home.stat4', fb: 'Real-Time AI Response',  d: 'stat-val-d4' },
          ].map(({ val, key, fb, d }) => (
            <div key={key} className="space-y-1">
              <p className={`text-3xl sm:text-4xl font-extrabold text-[#83C5BE] stat-val ${d}`}>
                {val}
              </p>
              <p className="text-xs font-semibold text-slate-200 uppercase tracking-wider">
                {t(key, fb)}
              </p>
            </div>
          ))}
        </div>

      </section>

      <Footer />
    </div>
  );
};

export default LandingPage;

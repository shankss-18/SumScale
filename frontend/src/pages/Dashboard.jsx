import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import FloatingChatbot from '../components/FloatingChatbot';
import { apiListCases } from '../api/client';
import { useAuth } from '../context/AuthContext';

/* ─── Radial Ring Chart — concentric animated arcs per severity ─── */
const RadialRingsChart = ({ slices }) => {
  const [animated, setAnimated] = useState(false);
  const [hovered, setHovered] = useState(null);
  useEffect(() => { const t = setTimeout(() => setAnimated(true), 200); return () => clearTimeout(t); }, []);

  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  const cx = 110; const cy = 110;
  const rings = slices.map((sl, i) => ({
    ...sl,
    radius: 80 - i * 18,
    strokeWidth: 12,
    pct: sl.value / total,
  }));
  const circumference = (r) => 2 * Math.PI * r;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-5 w-full">
      <svg width="220" height="220" viewBox="0 0 220 220" className="flex-shrink-0">
        <defs>
          {rings.map((r, i) => (
            <linearGradient key={i} id={`rg-${i}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={r.colorLight} />
              <stop offset="100%" stopColor={r.color} />
            </linearGradient>
          ))}
        </defs>
        {/* Track rings */}
        {rings.map((ring, i) => (
          <circle key={`track-${i}`} cx={cx} cy={cy} r={ring.radius}
            fill="none" stroke="#EDF6F9" strokeWidth={ring.strokeWidth}
            strokeLinecap="round"
          />
        ))}
        {/* Animated fill arcs */}
        {rings.map((ring, i) => {
          const c = circumference(ring.radius);
          const dash = animated ? c * ring.pct : 0;
          const isHov = hovered === i;
          return (
            <g key={`arc-${i}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            >
              <circle cx={cx} cy={cy} r={ring.radius}
                fill="none"
                stroke={`url(#rg-${i})`}
                strokeWidth={isHov ? ring.strokeWidth + 3 : ring.strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${dash} ${c}`}
                strokeDashoffset={c * 0.25}
                style={{
                  transition: `stroke-dasharray 1.1s cubic-bezier(0.4,0,0.2,1) ${i * 150}ms, stroke-width 0.2s ease`,
                  transformOrigin: `${cx}px ${cy}px`,
                  transform: isHov ? 'scale(1.04)' : 'scale(1)',
                }}
              />
            </g>
          );
        })}
        {/* Centre */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize="26" fontWeight="900" fill="#006D77">
          {hovered !== null ? rings[hovered]?.value : total}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#83C5BE" letterSpacing="1">
          {hovered !== null ? rings[hovered]?.label.toUpperCase() : 'TOTAL DOCS'}
        </text>
      </svg>

      {/* Legend stacked */}
      <div className="space-y-2.5 flex-1">
        {slices.map((sl, i) => {
          const pct = Math.round((sl.value / total) * 100);
          return (
            <div key={sl.label}
              className="group cursor-default"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: sl.color }} />
                  <span className="text-[11px] font-bold text-slate-600 group-hover:text-slate-900 transition-colors">{sl.label}</span>
                </div>
                <span className="text-[11px] font-extrabold" style={{ color: sl.color }}>{sl.value}</span>
              </div>
              <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: animated ? `${pct}%` : '0%', background: `linear-gradient(90deg,${sl.colorLight},${sl.color})` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

/* ─── PLACEHOLDER so old DonutChart ref is gone ─── */
const DonutChart = ({ slices }) => {
  const size = 180;
  const cx = size / 2;
  const cy = size / 2;
  const r = 68;
  const inner = 40;
  const [hovered, setHovered] = useState(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 300);
    return () => clearTimeout(t);
  }, []);

  const total = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  let cumulative = 0;

  const paths = slices.map((sl, i) => {
    const startAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;
    cumulative += sl.value;
    const endAngle = (cumulative / total) * 2 * Math.PI - Math.PI / 2;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + inner * Math.cos(startAngle);
    const yi1 = cy + inner * Math.sin(startAngle);
    const xi2 = cx + inner * Math.cos(endAngle);
    const yi2 = cy + inner * Math.sin(endAngle);
    const large = sl.value / total > 0.5 ? 1 : 0;

    const d = `M ${xi1} ${yi1} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${inner} ${inner} 0 ${large} 0 ${xi1} ${yi1} Z`;
    const scale = hovered === i ? 1.06 : 1;
    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const tx = cx + (r + 10) * Math.cos(midAngle) - cx;
    const ty = cy + (r + 10) * Math.sin(midAngle) - cy;

    return { d, sl, scale, tx, ty, i };
  });

  const hoveredSlice = hovered !== null ? slices[hovered] : null;

  return null;
};

/* ─── Animated progress bar ─── */
const ProgressBar = ({ label, count, total, color, delay }) => {
  const [width, setWidth] = useState(0);
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), delay || 200);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-slate-700">{label}</span>
        <span className="text-xs font-extrabold" style={{ color }}>{count} <span className="text-slate-400 font-normal">docs</span></span>
      </div>
      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{
            width: `${width}%`,
            background: `linear-gradient(90deg, ${color}99, ${color})`,
            boxShadow: `0 0 8px ${color}55`,
          }}
        />
      </div>
      <div className="text-[10px] text-slate-400 font-medium">{pct}% of total</div>
    </div>
  );
};

/* ─── Dashboard ─── */
const Dashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [savedChats, setSavedChats] = useState([]);

  const fetchCases = async () => {
    setLoading(true);
    setError(null);
    const local = JSON.parse(localStorage.getItem('sumscale_local_cases') || '[]');
    try {
      const res = await apiListCases();
      const remote = res.data || [];
      // Combine remote and local cases, avoiding duplicates
      const remoteIds = new Set(remote.map(c => c._id || c.id));
      const combined = [...remote, ...local.filter(l => !remoteIds.has(l._id || l.id))];
      setCases(combined);
    } catch (err) {
      if (local.length > 0) {
        setCases(local);
      } else {
        setError(err.response?.data?.detail || 'Failed to load documents.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCases(); }, []);

  useEffect(() => {
    const userId = user?.id || user?.email || 'default_user';
    const allChats = [];
    const mainKey = `sumscale_chat_history_${userId}`;
    const mainSaved = localStorage.getItem(mainKey);
    if (mainSaved) {
      try {
        const parsed = JSON.parse(mainSaved);
        parsed.filter((item) => item.sender === 'user').forEach(item => allChats.push(item));
      } catch {}
    }
    // Scan all keys in localStorage for chat histories
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('sumscale_chat_history_') || k.startsWith('sumscale_case_chat_'))) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(parsed)) {
            parsed.filter((item) => item.sender === 'user').forEach(item => {
              if (!allChats.some(c => c.text === item.text)) {
                allChats.push(item);
              }
            });
          }
        } catch {}
      }
    }
    setSavedChats(allChats);
  }, [user]);

  /* ─── Stats ─── */
  const total = cases.length;
  const completed = cases.filter(c => c.status === 'completed').length;
  const clarifying = cases.filter(c => c.status === 'clarifying').length;
  const draft = cases.filter(c => c.status === 'draft').length;

  const highRisk = cases.filter(c => (c.findings?.escalation_flag || c.findings?.severity) === 'high').length;
  const medRisk  = cases.filter(c => (c.findings?.escalation_flag || c.findings?.severity) === 'medium').length;
  const lowRisk  = cases.filter(c => {
    const f = c.findings?.escalation_flag || c.findings?.severity;
    return f === 'low' || (!f && c.findings);
  }).length;
  const noFindings = total - highRisk - medRisk - lowRisk;

  const pieSlices = [
    { label: 'High Risk',  value: highRisk || 0,  color: '#e11d48', colorLight: '#fb7185' },
    { label: 'Medium',     value: medRisk  || 0,  color: '#d97706', colorLight: '#fbbf24' },
    { label: 'Low Risk',   value: lowRisk  || 0,  color: '#006D77', colorLight: '#83C5BE' },
    { label: 'Pending',    value: noFindings > 0 ? noFindings : (total === 0 ? 1 : 0), color: '#94a3b8', colorLight: '#cbd5e1' },
  ].filter(s => s.value > 0);

  /* ─── Filtered docs ─── */
  const filteredCases = cases.filter(c => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return (
      c.status.toLowerCase().includes(term) ||
      (c.findings?.summary && c.findings.summary.toLowerCase().includes(term)) ||
      (c.findings?.pattern_classification && c.findings.pattern_classification.toLowerCase().includes(term)) ||
      (c.evidence?.[0]?.original_name && c.evidence[0].original_name.toLowerCase().includes(term))
    );
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case 'completed':  return <span className="px-2.5 py-0.5 rounded-full bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/50 text-[10px] font-bold">Analyzed</span>;
      case 'clarifying': return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold animate-pulse">Clarifying</span>;
      case 'draft':      return <span className="px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-bold">Collecting</span>;
      default:           return <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold">{status}</span>;
    }
  };

  const getSeverityBadge = (findings) => {
    if (!findings) return null;
    const flag = findings.escalation_flag || findings.severity;
    if (!flag) return null;
    if (flag === 'high')   return <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold uppercase">HIGH ALERT</span>;
    if (flag === 'medium') return <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase">MEDIUM</span>;
    return <span className="px-2.5 py-0.5 rounded-full bg-[#EDF6F9] text-[#006D77] border border-[#83C5BE]/40 text-[10px] font-bold uppercase">LOW RISK</span>;
  };

  return (
    <div className="min-h-screen bg-[#EDF6F9] text-slate-800 flex flex-col font-sans antialiased sarvam-gradient-bg">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ── Top Action Bar ── */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-normal font-serif text-[#006D77]">{t('dashboard.title')}</h1>
            <p className="text-xs text-slate-500 mt-0.5">{t('dashboard.subtitle')}</p>
          </div>
          <Link
            to="/new-case"
            className="inline-flex items-center space-x-2 bg-[#006D77] hover:bg-[#005a63] text-white font-bold text-xs rounded-full px-6 py-3 transition-all duration-300 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 shrink-0"
          >
            <span>{t('dashboard.uploadDocsBtn')}</span>
          </Link>
        </div>

        {/* ── Analytics Row: Tracker + Pie Chart ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Status Tracker Card */}
          <div className="bg-white rounded-3xl border border-[#83C5BE]/40 shadow-sm p-7 space-y-6 relative overflow-hidden group hover:shadow-lg transition-shadow duration-300">
            {/* Ambient blob */}
            <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-[#83C5BE]/10 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#006D77]">{t('dashboard.trackerTitle')}</p>
                <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{t('dashboard.docProgress')}</h2>
              </div>
              <div className="text-right">
                <p className="text-3xl font-black text-[#006D77]">{total}</p>
                <p className="text-[10px] text-slate-400 font-semibold">{t('dashboard.totalUploads')}</p>
              </div>
            </div>

            <div className="space-y-4 relative z-10">
              <ProgressBar label={`✅ ${t('dashboard.fullyAnalyzed')}`}   count={completed}  total={total} color="#006D77" delay={200} />
              <ProgressBar label={`💬 ${t('dashboard.needsClarification')}`} count={clarifying} total={total} color="#d97706" delay={350} />
              <ProgressBar label={`📋 ${t('dashboard.draftCollecting')}`}  count={draft}      total={total} color="#83C5BE" delay={500} />
            </div>

            {/* Completion rate ring text */}
            <div className="relative z-10 pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                {t('dashboard.completionRate')}
              </span>
              <span className="text-sm font-extrabold text-[#006D77]">
                {total > 0 ? Math.round((completed / total) * 100) : 0}%
              </span>
            </div>
          </div>

          {/* Severity Pie Chart Card */}
          <div className="bg-white rounded-3xl border border-[#83C5BE]/40 shadow-sm p-7 space-y-5 relative overflow-hidden hover:shadow-lg transition-shadow duration-300">
            <div className="absolute bottom-0 left-0 w-28 h-28 rounded-full bg-rose-50/60 blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-[#006D77]">{t('dashboard.severityTitle')}</p>
              <h2 className="text-lg font-extrabold text-slate-900 mt-0.5">{t('dashboard.riskPrioritisation')}</h2>
            </div>

            <div className="relative z-10">
              <RadialRingsChart slices={[
                { label: t('dashboard.highRisk'), value: highRisk, color: '#e11d48', colorLight: '#fb7185' },
                { label: t('dashboard.mediumRisk'), value: medRisk,  color: '#d97706', colorLight: '#fbbf24' },
                { label: t('dashboard.lowRisk'),  value: lowRisk,  color: '#006D77', colorLight: '#83C5BE' },
                { label: 'Pending',   value: noFindings > 0 ? noFindings : (total === 0 ? 1 : 0), color: '#94a3b8', colorLight: '#cbd5e1' },
              ].filter(s => s.value > 0)} />
            </div>
          </div>

        </div>

        {/* ── Document Records — Organic Fluid Layout ── */}
        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-[#006D77]">
              {t('dashboard.allDocs')} ({filteredCases.length})
            </h2>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={t('dashboard.searchPlaceholder')}
              className="w-full sm:w-72 px-4 py-2 rounded-full bg-white border border-[#83C5BE]/50 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#006D77] focus:ring-2 focus:ring-[#006D77]/20 transition-all font-medium"
            />
          </div>

          <style>{`
            @keyframes doc-shimmer {
              0%   { transform: translateX(-100%) skewX(-12deg); }
              100% { transform: translateX(220%) skewX(-12deg); }
            }
            @keyframes doc-enter {
              from { opacity: 0; transform: translateY(14px) scale(0.97); }
              to   { opacity: 1; transform: translateY(0) scale(1); }
            }
            .doc-item { position: relative; overflow: hidden; }
            .doc-item::after {
              content: '';
              position: absolute;
              inset: 0;
              background: linear-gradient(105deg, transparent 38%, rgba(255,255,255,0.52) 50%, transparent 62%);
              transform: translateX(-100%) skewX(-12deg);
              pointer-events: none;
              transition: none;
            }
            .doc-item:hover::after {
              animation: doc-shimmer 0.65s ease forwards;
            }
            .doc-item:hover {
              transform: translateY(-5px) scale(1.012);
            }
          `}</style>

          {loading ? (
            <div className="py-20 text-center text-[#006D77] text-sm font-bold animate-pulse">Loading your documents...</div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center font-medium">{error}</div>
          ) : filteredCases.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-[#83C5BE]/40 shadow-sm">
              <p className="text-slate-500 text-sm">{t('dashboard.noCases')}</p>
              <Link to="/new-case" className="inline-block text-xs text-[#006D77] hover:underline font-bold">
                {t('dashboard.uploadFirst')}
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
              {(() => {
                let prevId = null;
                return filteredCases.map((c, idx) => {
                  const caseId = c._id || c.id;
                  const flag = c.findings?.escalation_flag || c.findings?.severity;

                  // Organic shapes — no two items look the same
                  const shapes = [
                    '2.5rem 1.2rem 2.5rem 1.2rem',
                    '1.2rem 2.5rem 1.2rem 2.5rem',
                    '2rem 1rem 3rem 1rem',
                    '1rem 3rem 1rem 2rem',
                    '2.2rem',
                  ];
                  const shape = shapes[idx % shapes.length];

                  // Palette strictly restricted to Green and Bluish White variants
                  const greenThemes = [
                    { id: 'deep_teal', bg: 'linear-gradient(135deg,#006D77 0%,#005a63 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)', glow: '#006D7740', tagBg: 'rgba(255,255,255,0.2)', tagText: 'white', tagBorder: 'rgba(255,255,255,0.3)', divider: 'rgba(255,255,255,0.15)', dateTxt: 'rgba(255,255,255,0.6)', arrow: 'white' },
                    { id: 'emerald', bg: 'linear-gradient(135deg,#0f766e 0%,#115e59 100%)', text: 'white', sub: 'rgba(255,255,255,0.75)', glow: '#0f766e40', tagBg: 'rgba(255,255,255,0.2)', tagText: 'white', tagBorder: 'rgba(255,255,255,0.3)', divider: 'rgba(255,255,255,0.15)', dateTxt: 'rgba(255,255,255,0.6)', arrow: 'white' },
                  ];

                  const bluishWhiteThemes = [
                    { id: 'bluish_white', bg: 'linear-gradient(135deg,#EDF6F9 0%,#e0f2f5 100%)', text: '#006D77', sub: '#006D77b0', glow: '#83C5BE40', tagBg: '#006D77', tagText: 'white', tagBorder: 'transparent', divider: '#83C5BE50', dateTxt: '#006D77', arrow: '#006D77' },
                    { id: 'frost_cyan', bg: 'linear-gradient(135deg,#f0fdfa 0%,#e0f2fe 100%)', text: '#0f766e', sub: '#115e59c0', glow: '#38bdf830', tagBg: '#0f766e', tagText: 'white', tagBorder: 'transparent', divider: '#99f6e4', dateTxt: '#0f766e', arrow: '#0f766e' },
                    { id: 'pure_white', bg: 'white', text: '#1e293b', sub: '#64748b', glow: '#83C5BE30', tagBg: '#EDF6F9', tagText: '#006D77', tagBorder: '#83C5BE50', divider: '#e2e8f0', dateTxt: '#94a3b8', arrow: '#006D77' },
                  ];

                  // Alternate between Green and Bluish White across adjacent cards
                  const pool = idx % 2 === 1 ? greenThemes : bluishWhiteThemes;
                  const config = pool.find(t => t.id !== prevId) || pool[idx % pool.length];
                  prevId = config.id;

                  return (
                    <Link
                      key={caseId}
                      to={c.status === 'clarifying' ? `/case/${caseId}/clarify` : `/case/${caseId}`}
                      className="doc-item no-underline group cursor-pointer"
                      style={{
                        borderRadius: shape,
                        background: config.bg,
                        border: flag === 'high' && config.id !== 'rose' ? 'none' : `1px solid ${config.glow}`,
                        boxShadow: `0 4px 20px ${config.glow}`,
                        transition: 'transform 0.35s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.35s ease',
                        animation: `doc-enter 0.45s ease both`,
                        animationDelay: `${idx * 55}ms`,
                        padding: '1.5rem',
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100%',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 16px 40px ${config.glow}, 0 4px 12px ${config.glow}`; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = `0 4px 20px ${config.glow}`; }}
                    >
                      {/* Ambient blob accent */}
                      <div style={{
                        position: 'absolute',
                        width: '90px', height: '80px',
                        top: '-25px', right: '-20px',
                        borderRadius: '60% 40% 55% 45% / 50% 60% 40% 50%',
                        background: flag === 'high' ? 'rgba(131,197,190,0.18)' : `${config.glow}`,
                        pointerEvents: 'none',
                      }} />

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1.5 mb-3 relative z-10">
                      {flag && (
                        <span style={{
                          padding: '2px 10px', borderRadius: '999px',
                          fontSize: '9px', fontWeight: 800, letterSpacing: '0.06em', textTransform: 'uppercase',
                          background: config.tagBg, color: config.tagText, border: `1px solid ${config.tagBorder}`,
                        }}>
                          {flag === 'high' ? t('severity.high') : flag === 'medium' ? t('severity.medium') : t('severity.low')}
                        </span>
                      )}
                      <span style={{
                        padding: '2px 10px', borderRadius: '999px',
                        fontSize: '9px', fontWeight: 700, letterSpacing: '0.05em',
                        background: config.tagBg, color: config.tagText, border: `1px solid ${config.tagBorder}`,
                      }}>
                        {c.status === 'completed' ? t('dashboard.fullyAnalyzed') : c.status === 'clarifying' ? t('dashboard.needsClarification') : t('dashboard.draftCollecting')}
                      </span>
                    </div>

                    {/* Growable content area */}
                    <div style={{ flex: 1 }} className="relative z-10">
                      {/* Main Title (Custom Title or AI Summary Heading) */}
                      <h3 style={{ fontSize: '14px', fontWeight: 800, color: config.text, lineHeight: 1.35, marginBottom: '6px' }} className="line-clamp-2">
                        {c.title || c.findings?.summary || c.findings?.pattern_classification || 'Document Analysis'}
                      </h3>

                      {/* Description / Summary Body */}
                      <p style={{ fontSize: '11px', color: config.sub, lineHeight: 1.45 }} className="line-clamp-2">
                        {(() => {
                          if (c.title) {
                            return c.findings?.summary || c.findings?.pattern_classification || c.findings?.remediation_checklist?.[0] || 'Document processed and grounded for copilot chat.';
                          }
                          // If no custom title yet, show remediation checklist, pattern classification, or clean text (>15 chars)
                          const textSnippet = c.evidence?.[0]?.extracted_text;
                          const cleanSnippet = (textSnippet && textSnippet.trim().length > 15 && textSnippet.toLowerCase() !== 'analyze')
                            ? textSnippet
                            : null;
                          return c.findings?.remediation_checklist?.[0] || c.findings?.pattern_classification || cleanSnippet || 'Grounding complete — ready for questions.';
                        })()}
                      </p>
                    </div>

                    {/* Footer — always at bottom */}
                    <div style={{ borderTop: `1px solid ${config.divider}`, paddingTop: '10px', marginTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }} className="relative z-10">
                      <span style={{ fontSize: '10px', color: config.dateTxt, fontWeight: 500 }}>
                        {new Date(c.created_at).toLocaleDateString()}
                      </span>
                      <span style={{ fontSize: '11px', fontWeight: 800, color: config.arrow, transition: 'transform 0.25s ease', display: 'inline-block' }}
                        className="group-hover:translate-x-1.5">
                        {t('dashboard.viewReport')}
                      </span>
                    </div>
                  </Link>
                );
              });
            })()}
            </div>
          )}
        </div>


      </main>

      <FloatingChatbot />
    </div>
  );
};

export default Dashboard;

import React, { useState } from 'react';
import { apiSendEmailAlert, apiGetGoogleCalendarLink } from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function CaseReminderCard({ caseData }) {
  const { user } = useAuth();
  const [dueDate, setDueDate] = useState('');
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const caseTitle = caseData?.title || 'Case Follow-Up';
  const findings = caseData?.findings || {};
  const summary = findings.summary || findings.pattern_classification || 'Follow-up on recent document analysis';
  const checklist = findings.remediation_checklist || [];

  // Generate 1-click Google Calendar URL
  const handleOpenGoogleCalendar = async () => {
    try {
      let startIso = null;
      if (dueDate) {
        startIso = new Date(dueDate).toISOString();
      }
      const res = await apiGetGoogleCalendarLink({
        title: caseTitle,
        details: `${summary}\n\nKey Actions:\n${checklist.join('\n')}`,
        start_dt: startIso,
      });

      if (res.data?.google_calendar_url) {
        window.open(res.data.google_calendar_url, '_blank');
      }
    } catch (err) {
      // Fallback client-side 1-click Google Calendar URL format
      const text = encodeURIComponent(`SumScale Reminder: ${caseTitle}`);
      const details = encodeURIComponent(`${summary}\n\nActions:\n${checklist.join('\n')}`);
      const fallbackUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${text}&details=${details}`;
      window.open(fallbackUrl, '_blank');
    }
  };

  // Send free email notification via Gmail SMTP
  const handleSendEmailAlert = async () => {
    setSendingEmail(true);
    setEmailSent(false);
    setErrorMsg('');
    try {
      let startIso = null;
      if (dueDate) {
        startIso = new Date(dueDate).toISOString();
      }
      await apiSendEmailAlert({
        title: caseTitle,
        summary: summary,
        checklist: checklist,
        recipient_email: user?.email,
        due_date: startIso,
      });
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      setErrorMsg('Failed to send email alert. Check SMTP configuration.');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#83C5BE]/40 shadow-sm p-5 space-y-4">
      <div className="flex items-center space-x-3">
        <span className="text-2xl">🔔</span>
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 leading-snug">
            Constant Notifications &amp; Reminders
          </h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Set free Gmail email alerts or 1-click Google Calendar reminders.
          </p>
        </div>
      </div>

      {/* Date & Time Picker */}
      <div>
        <label className="block text-[10px] font-extrabold uppercase tracking-widest text-[#006D77] mb-1.5">
          SCHEDULE FOLLOW-UP DATE &amp; TIME (OPTIONAL)
        </label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="w-full bg-[#EDF6F9] border border-[#83C5BE]/50 text-slate-800 text-xs font-semibold rounded-2xl px-3.5 py-2.5 focus:outline-none focus:border-[#006D77] cursor-pointer"
        />
      </div>

      {errorMsg && (
        <div className="p-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
          ⚠️ {errorMsg}
        </div>
      )}

      {emailSent && (
        <div className="p-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold text-center">
          ✅ Free Email Alert sent to {user?.email}!
        </div>
      )}

      {/* 1-Click Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-2 pt-1">
        <button
          type="button"
          onClick={handleOpenGoogleCalendar}
          className="flex-1 py-2.5 px-3.5 rounded-full bg-[#006D77] hover:bg-[#005a63] text-white font-extrabold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          📅 Add to Google Calendar
        </button>

        <button
          type="button"
          onClick={handleSendEmailAlert}
          disabled={sendingEmail}
          className="flex-1 py-2.5 px-3.5 rounded-full bg-[#EDF6F9] hover:bg-[#83C5BE]/30 text-[#006D77] border border-[#83C5BE]/50 font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
        >
          {sendingEmail ? '⏳ Sending…' : '📧 Send Email Alert'}
        </button>
      </div>

      <div className="text-[10px] text-slate-400 font-medium text-center pt-1">
        ⚡ 100% Free • Delivered via Gmail SMTP to {user?.email}
      </div>
    </div>
  );
}

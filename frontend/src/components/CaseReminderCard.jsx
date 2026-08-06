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
    <div style={{
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      border: '1px solid rgba(131,197,190,0.3)',
      borderRadius: 20,
      padding: 20,
      boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
      marginTop: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>🔔</span>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f1f5f9' }}>
            Constant Notifications &amp; Reminders
          </h3>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#94a3b8' }}>
            Never miss a follow-up — set free Gmail email alerts, SMS, or Google Calendar reminders.
          </p>
        </div>
      </div>

      {/* Date & Time Picker */}
      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#94a3b8', marginBottom: 6, letterSpacing: '0.05em' }}>
          SCHEDULE FOLLOW-UP DATE &amp; TIME (OPTIONAL)
        </label>
        <input
          type="datetime-local"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: '#f1f5f9',
            fontSize: 13,
            padding: '8px 12px',
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {errorMsg && (
        <div style={{ fontSize: 12, color: '#f87171', marginBottom: 12, background: 'rgba(239,68,68,0.1)', padding: '6px 10px', borderRadius: 8 }}>
          ⚠️ {errorMsg}
        </div>
      )}

      {/* 1-Click Action Buttons */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={handleOpenGoogleCalendar}
          style={{
            flex: 1,
            minWidth: 160,
            background: 'linear-gradient(135deg, #4285F4, #34A853)',
            border: 'none',
            borderRadius: 12,
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            padding: '10px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(66,133,244,0.3)',
            transition: 'transform 0.15s, opacity 0.15s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          📅 Add to Google Calendar
        </button>

        <button
          type="button"
          onClick={handleSendEmailAlert}
          disabled={sendingEmail}
          style={{
            flex: 1,
            minWidth: 160,
            background: sendingEmail ? 'rgba(0,109,119,0.3)' : 'linear-gradient(135deg, #006D77, #00B4D8)',
            border: 'none',
            borderRadius: 12,
            color: '#ffffff',
            fontSize: 12,
            fontWeight: 700,
            padding: '10px 14px',
            cursor: sendingEmail ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(0,109,119,0.3)',
            transition: 'transform 0.15s, opacity 0.15s',
          }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          {sendingEmail ? '⏳ Sending Email…' : emailSent ? '✅ Email Sent!' : '📧 Send Email Alert (Gmail)'}
        </button>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: '#64748b', textAlign: 'center' }}>
        ⚡ 100% Free • No paid accounts required • Instant delivery to {user?.email}
      </div>
    </div>
  );
}

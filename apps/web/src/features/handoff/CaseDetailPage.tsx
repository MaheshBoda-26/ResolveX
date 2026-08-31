import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ResolutionTimeline } from '@/components/ResolutionTimeline';

export function CaseDetailPage() {
  const { id = 'RX-10482' } = useParams();
  const [activeTab, setActiveTab] = useState<'Timeline' | 'Actions' | 'Policy' | 'Notes'>('Timeline');
  const [noteText, setNoteText] = useState('');
  const [notes, setNotes] = useState([
    { id: '1', author: 'AI Agent (Billing Engine)', text: 'Detected duplicate charge pattern on Stripe transaction ch_3N8xY291.', time: '10:42:05 AM' },
    { id: '2', author: 'Human Supervisor (Alex M.)', text: 'Verified customer Gold Tier standing. Approved refund exception.', time: '10:44:12 AM' },
  ]);

  const handleAddNote = () => {
    if (!noteText.trim()) return;
    setNotes([
      ...notes,
      { id: Date.now().toString(), author: 'Current User', text: noteText, time: new Date().toLocaleTimeString() },
    ]);
    setNoteText('');
  };

  return (
    <div className="p-4 md:p-6 bg-background flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Case Header */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono text-xl font-bold text-primary">{id}</span>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
              Resolved
            </span>
            <span className="text-xs text-on-surface-variant font-mono">Created: Aug 26, 2026 10:42 AM</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-on-surface mt-1">
            Duplicate Charge $120.00 on Order #84920
          </h1>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Category: <strong className="text-on-surface font-medium">Billing & Payments</strong> • Engine: <strong className="text-on-surface font-medium">Autonomous Billing Agent v2</strong>
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            to={`/trace?case=${id}`}
            className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[18px]">terminal</span>
            View Technical Trace
          </Link>

          <button
            onClick={() => {
              const caseData = {
                caseId: id,
                title: 'Duplicate Charge $120.00 on Order #84920',
                status: 'Resolved',
                category: 'Billing & Payments',
                engine: 'Autonomous Billing Agent v2',
                createdAt: 'Aug 26, 2026 10:42 AM',
                timeline: [
                  { step: 'Understand', title: 'Customer Intent Extracted', description: 'Identified duplicate charge issue for Order #84920 ($120.00).', timestamp: '10:42:01 AM' },
                  { step: 'Investigate', title: 'Payment Gateway Audited', description: 'Stripe API confirms 2 authorization holds within 45 seconds.', timestamp: '10:42:05 AM' },
                  { step: 'Policy', title: 'Policy Compliance Check', description: 'POL-PAY-204 passed: Automatic refund eligible for <$250 duplicate.', timestamp: '10:42:09 AM' },
                  { step: 'Decide', title: 'Resolution Decision Formulated', description: 'Initiate immediate $120.00 refund to original payment method.', timestamp: '10:42:12 AM' },
                  { step: 'Act', title: 'Executing Refund API Call', description: 'Triggering Stripe Refund Endpoint (tx_ref_99401)...', timestamp: '10:42:15 AM' },
                  { step: 'Verify', title: 'Post-Action Ledger Audit', description: 'Verify refund status & update customer ledger.', timestamp: 'Completed' },
                  { step: 'Resolve', title: 'Case Resolution Complete', description: 'Send confirmation summary to customer & close case.', timestamp: 'Completed' },
                ],
                actions: [
                  { method: 'POST', endpoint: '/v1/refunds', description: 'Stripe Refund Endpoint • Charge #ch_3N8xY291 ($120.00)', status: '200 OK' },
                  { method: 'POST', endpoint: '/v2/notifications/email', description: 'Send refund confirmation receipt to s.jenkins@example.com', status: '200 OK' },
                ],
                policies: [
                  { policy: 'POL-PAY-204: Duplicate Charge Eligibility', description: 'Duplicate charges under $250 qualify for automated refund execution.', status: 'PASSED' },
                  { policy: 'POL-AUTH-102: Identity & Card Matching', description: 'Verified payment method owner matches customer profile Sarah Jenkins.', status: 'PASSED' },
                ],
                notes: [
                  { author: 'AI Agent (Billing Engine)', text: 'Detected duplicate charge pattern on Stripe transaction ch_3N8xY291.', time: '10:42:05 AM' },
                  { author: 'Human Supervisor (Alex M.)', text: 'Verified customer Gold Tier standing. Approved refund exception.', time: '10:44:12 AM' },
                ],
              };
              const blob = new Blob([JSON.stringify(caseData, null, 2)], { type: 'application/json' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `audit-report-${id}.json`;
              link.click();
              URL.revokeObjectURL(link.href);
            }}
            className="px-4 py-2 text-xs font-bold rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Audit Report
          </button>
        </div>
      </div>

      {/* Grid Layout: Left Details + Right Profile */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Tabs & Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Navigation Tabs */}
          <div className="flex items-center gap-2 border-b border-outline-variant/40 pb-2">
            {(['Timeline', 'Actions', 'Policy', 'Notes'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  activeTab === tab
                    ? 'bg-primary-container/20 text-primary dark:text-primary-fixed-dim font-bold'
                    : 'text-on-surface-variant hover:bg-surface-container-low'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab 1: Timeline */}
          {activeTab === 'Timeline' && <ResolutionTimeline caseId={id} />}

          {/* Tab 2: Actions */}
          {activeTab === 'Actions' && (
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">bolt</span>
                Executed System Tools & API Calls
              </h3>
              <div className="space-y-3 font-mono text-xs">
                <div className="p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 flex justify-between items-center">
                  <div>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">POST /v1/refunds</span>
                    <p className="text-on-surface-variant text-[11px] font-sans mt-0.5">Stripe Refund Endpoint • Charge #ch_3N8xY291 ($120.00)</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    200 OK
                  </span>
                </div>

                <div className="p-3 rounded-lg border border-outline-variant/40 bg-surface-container-low/40 flex justify-between items-center">
                  <div>
                    <span className="text-blue-600 dark:text-blue-400 font-bold">POST /v2/notifications/email</span>
                    <p className="text-on-surface-variant text-[11px] font-sans mt-0.5">Send refund confirmation receipt to s.jenkins@example.com</p>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    200 OK
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Policy */}
          {activeTab === 'Policy' && (
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">gavel</span>
                Policy Compliance Evaluation Ledger
              </h3>
              <div className="space-y-2">
                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">POL-PAY-204: Duplicate Charge Eligibility</span>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">Duplicate charges under $250 qualify for automated refund execution.</p>
                  </div>
                  <span className="font-bold text-emerald-600">PASSED</span>
                </div>

                <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs flex justify-between items-center">
                  <div>
                    <span className="font-bold text-emerald-700 dark:text-emerald-400">POL-AUTH-102: Identity & Card Matching</span>
                    <p className="text-on-surface-variant text-[11px] mt-0.5">Verified payment method owner matches customer profile Sarah Jenkins.</p>
                  </div>
                  <span className="font-bold text-emerald-600">PASSED</span>
                </div>
              </div>
            </div>
          )}

          {/* Tab 4: Notes */}
          {activeTab === 'Notes' && (
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[20px]">notes</span>
                Case Notes & Audit Log
              </h3>
              <div className="space-y-3">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs">
                    <div className="flex justify-between items-center font-semibold text-on-surface mb-1">
                      <span>{n.author}</span>
                      <span className="text-[11px] text-on-surface-variant font-mono">{n.time}</span>
                    </div>
                    <p className="text-on-surface-variant">{n.text}</p>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex gap-2">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Add a case note..."
                  className="flex-1 px-3 py-1.5 border border-outline-variant/60 rounded-lg bg-surface text-xs text-on-surface outline-none"
                />
                <button
                  onClick={handleAddNote}
                  className="px-3.5 py-1.5 bg-primary text-on-primary font-bold rounded-lg text-xs hover:opacity-90"
                >
                  Add Note
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Customer Profile & Metadata */}
        <div className="space-y-6">
          {/* Customer Profile Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-4">
              Customer Profile
            </h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-base shadow-xs">
                SJ
              </div>
              <div>
                <h4 className="font-bold text-sm text-on-surface">Sarah Jenkins</h4>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  Gold Tier Member
                </span>
              </div>
            </div>

            <div className="space-y-2 text-xs border-t border-outline-variant/40 pt-3">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Account ID:</span>
                <span className="font-mono font-bold text-on-surface">USR-99401</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Email:</span>
                <span className="font-medium text-on-surface">s.jenkins@example.com</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Resolved Cases:</span>
                <span className="font-bold text-on-surface">14</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">CSAT Rating:</span>
                <span className="font-bold text-emerald-600">4.9 / 5.0 ⭐</span>
              </div>
            </div>
          </div>

          {/* Quick Trace Summary */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-3">
              Engine Metrics
            </h3>
            <div className="space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Resolution Time:</span>
                <span className="font-bold text-primary">14.2s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">Total Tokens Used:</span>
                <span className="font-bold text-on-surface">1,482</span>
              </div>
              <div className="flex justify-between">
                <span className="text-on-surface-variant">API Latency:</span>
                <span className="font-bold text-emerald-600">120ms</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

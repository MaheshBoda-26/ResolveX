import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useHandoffs, Handoff, HandoffStatus } from '@/lib/api';

interface CaseItem {
  id: string;
  customer: string;
  issue: string;
  status: 'Handoff Required' | 'Autonomous Resolved' | 'Policy Verified' | 'Investigating';
  priority: 'High' | 'Medium' | 'Low';
  confidence: number;
  time: string;
  category: string;
}

function mapHandoffToCaseItem(handoff: Handoff): CaseItem {
  const statusMap: Record<HandoffStatus, CaseItem['status']> = {
    pending: 'Handoff Required',
    accepted: 'Investigating',
    completed: 'Autonomous Resolved',
  };

  const priorityMap: Record<Handoff['priority'], CaseItem['priority']> = {
    critical: 'High',
    high: 'High',
    medium: 'Medium',
    low: 'Low',
  };

  const confidence = Math.min(100, Math.max(0, Math.round(
    handoff.evidence.filter(e => e.verified).length / Math.max(1, handoff.evidence.length) * 100
  )));

  const timeAgo = new Date(handoff.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - timeAgo.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const time = diffMins < 60 ? `${diffMins} mins ago` : `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;

  return {
    id: handoff.id,
    customer: `${handoff.customer.name} (${handoff.customer.plan})`,
    issue: handoff.issueSummary,
    status: statusMap[handoff.status],
    priority: priorityMap[handoff.priority],
    confidence,
    time,
    category: handoff.policyExcerpts[0]?.policyId || 'General',
  };
}

export function OperationsDashboardPage() {
  const [filter, setFilter] = useState<'All' | 'Handoff' | 'Resolved'>('All');
  const [timeRange, setTimeRange] = useState('Last 24 Hours');

  const { data: handoffs } = useHandoffs();

  const cases = handoffs?.map(mapHandoffToCaseItem) || [];
  const filteredCases = cases.filter((c) => {
    if (filter === 'Handoff') return c.status === 'Handoff Required';
    if (filter === 'Resolved') return c.status === 'Autonomous Resolved' || c.status === 'Policy Verified';
    return true;
  });

  return (
    <div className="p-4 md:p-6 bg-background flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-outline-variant/40">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-on-surface tracking-tight">
            Resolution Overview
          </h1>
          <p className="text-xs md:text-sm text-on-surface-variant mt-1">
            Real-time operations dashboard & autonomous AI agent metrics.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-1.5 border border-outline-variant/60 rounded-lg bg-surface text-on-surface text-xs font-medium focus:border-primary outline-none"
          >
            <option>Last 24 Hours</option>
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
          </select>

          <button
            onClick={() => {
              const csv = [
                ['Case ID', 'Customer', 'Issue', 'Status', 'Confidence', 'Priority', 'Time'].join(','),
                ...filteredCases.map(c => [
                  c.id,
                  c.customer,
                  `"${c.issue.replace(/"/g, '""')}"`,
                  c.status,
                  `${c.confidence}%`,
                  c.priority,
                  c.time
                ].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const link = document.createElement('a');
              link.href = URL.createObjectURL(blob);
              link.download = `operations-cases-${new Date().toISOString().split('T')[0]}.csv`;
              link.click();
              URL.revokeObjectURL(link.href);
            }}
            className="flex items-center gap-1 px-3 py-1.5 border border-outline-variant/60 rounded-lg bg-surface text-on-surface hover:bg-surface-container-low text-xs font-medium transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export
          </button>

          <Link
            to="/support"
            className="flex items-center gap-1 px-3.5 py-1.5 bg-primary-container text-on-primary-container font-semibold rounded-lg text-xs hover:opacity-90 transition-opacity shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            New Customer Case
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Active Cases</span>
            <span className="material-symbols-outlined text-primary text-[22px]">pending_actions</span>
          </div>
          <div className="text-3xl font-bold text-on-surface">24</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+2 since last hour</span>
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-primary-container"></div>
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Autonomous Res</span>
            <span className="material-symbols-outlined text-primary text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              smart_toy
            </span>
          </div>
          <div className="text-3xl font-bold text-on-surface">82%</div>
          <div className="text-xs text-primary font-medium mt-2 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">trending_up</span>
            <span>+1.2% this week</span>
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Handoff Rate</span>
            <span className="material-symbols-outlined text-amber-600 text-[22px]">front_hand</span>
          </div>
          <div className="text-3xl font-bold text-on-surface">18%</div>
          <div className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 flex items-center gap-1 font-medium">
            <span className="material-symbols-outlined text-[14px]">trending_down</span>
            <span>-0.8% this week (Improved)</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 flex flex-col justify-between shadow-xs">
          <div className="flex justify-between items-center text-on-surface-variant mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Avg Res Time</span>
            <span className="material-symbols-outlined text-tertiary text-[22px]">timer</span>
          </div>
          <div className="text-3xl font-bold text-on-surface">4.2m</div>
          <div className="text-xs text-on-surface-variant mt-2 flex items-center gap-1 font-mono">
            <span>1.1m AI vs 14.5m Human</span>
          </div>
        </div>
      </div>

      {/* Active AI Agent Swarm */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 md:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-on-surface flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-[20px]">hub</span>
              Active AI Agent Swarm
            </h2>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Specialized domain agents processing cases autonomously.
            </p>
          </div>
          <Link
            to="/evaluations"
            className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
          >
            View Evals <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Agent 1 */}
          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low/40 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-primary-container/30 text-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">alt_route</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Triage & Intent Agent</h4>
                  <p className="text-[11px] text-on-surface-variant">Intent extraction & routing</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/30 flex justify-between text-xs font-mono">
              <span className="text-on-surface-variant">Confidence: <strong className="text-on-surface font-bold">99.4%</strong></span>
              <span className="text-on-surface-variant">Handled: <strong className="text-on-surface font-bold">142</strong></span>
            </div>
          </div>

          {/* Agent 2 */}
          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low/40 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-secondary/10 text-secondary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">payments</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Billing & Refund Policy</h4>
                  <p className="text-[11px] text-on-surface-variant">POL-PAY-204 grounding</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/30 flex justify-between text-xs font-mono">
              <span className="text-on-surface-variant">Confidence: <strong className="text-on-surface font-bold">96.2%</strong></span>
              <span className="text-on-surface-variant">Handled: <strong className="text-on-surface font-bold">89</strong></span>
            </div>
          </div>

          {/* Agent 3 */}
          <div className="p-4 rounded-xl border border-outline-variant/50 bg-surface-container-low/40 flex flex-col justify-between">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-tertiary/10 text-tertiary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[20px]">card_membership</span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-on-surface">Subscription & Tier Agent</h4>
                  <p className="text-[11px] text-on-surface-variant">Seat upgrades & billing cycles</p>
                </div>
              </div>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Active
              </span>
            </div>
            <div className="mt-3 pt-3 border-t border-outline-variant/30 flex justify-between text-xs font-mono">
              <span className="text-on-surface-variant">Confidence: <strong className="text-on-surface font-bold">94.8%</strong></span>
              <span className="text-on-surface-variant">Handled: <strong className="text-on-surface font-bold">61</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* Cases Table Section */}
      <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-xs">
        <div className="p-4 md:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-outline-variant/40">
          <div>
            <h3 className="text-base font-bold text-on-surface">Recent Operations Cases</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">
              Live case feed with AI confidence scores and resolution status.
            </p>
          </div>

          {/* Table Filter Tabs */}
          <div className="flex items-center gap-1 bg-surface-container-low p-1 rounded-lg">
            {(['All', 'Handoff', 'Resolved'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setFilter(tab)}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  filter === tab
                    ? 'bg-surface text-primary shadow-xs'
                    : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {tab === 'Handoff' ? 'Handoff Required' : tab === 'Resolved' ? 'Autonomous' : 'All Cases'}
              </button>
            ))}
          </div>
        </div>

        {/* Table View */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surface-container-low text-on-surface-variant font-semibold uppercase tracking-wider text-[11px] border-b border-outline-variant/40">
              <tr>
                <th className="py-3 px-4">Case ID</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Issue Description</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Confidence</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {filteredCases.map((c) => (
                <tr key={c.id} className="hover:bg-surface-container-low/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-primary">
                    <Link to={`/cases/${c.id}`} className="hover:underline">
                      {c.id}
                    </Link>
                  </td>
                  <td className="py-3 px-4 font-medium text-on-surface">{c.customer}</td>
                  <td className="py-3 px-4 text-on-surface-variant max-w-xs truncate">{c.issue}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                        c.status === 'Handoff Required'
                          ? 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300 border border-amber-300'
                          : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {c.status === 'Handoff Required' ? 'front_hand' : 'verified'}
                      </span>
                      {c.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-12 bg-surface-container-high rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full ${
                            c.confidence >= 85
                              ? 'bg-emerald-500'
                              : c.confidence >= 70
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${c.confidence}%` }}
                        />
                      </div>
                      <span className="font-semibold text-on-surface">{c.confidence}%</span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`font-semibold text-[11px] ${
                        c.priority === 'High'
                          ? 'text-rose-600 dark:text-rose-400'
                          : c.priority === 'Medium'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {c.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    {c.status === 'Handoff Required' ? (
                      <Link
                        to={`/handoffs/${c.id}`}
                        className="px-2.5 py-1 bg-primary text-on-primary font-semibold rounded text-[11px] hover:opacity-90 transition-opacity inline-flex items-center gap-1"
                      >
                        Review <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </Link>
                    ) : (
                      <Link
                        to={`/cases/${c.id}`}
                        className="px-2 py-1 text-on-surface-variant hover:text-primary transition-colors text-[11px] font-medium inline-flex items-center gap-0.5"
                      >
                        View Audit <span className="material-symbols-outlined text-[14px]">visibility</span>
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

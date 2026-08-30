import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ResolutionTimeline } from '@/components/ResolutionTimeline';
import { useHandoffs, useHandoff, useAcceptHandoff, useCompleteHandoff, useExecuteRefund, useRequestDocumentation, Handoff } from '@/lib/api';

interface HandoffItem {
  id: string;
  customerName: string;
  customerTier: string;
  issue: string;
  category: string;
  confidence: number;
  priority: 'Urgent' | 'High' | 'Medium';
  reason: string;
  policy: string;
  recommendedAction: string;
  amount: string;
  time: string;
  status: 'Pending Review' | 'In Progress' | 'Resolved';
}

function mapHandoffToItem(handoff: Handoff): HandoffItem {
  const statusMap: Record<Handoff['status'], HandoffItem['status']> = {
    pending: 'Pending Review',
    accepted: 'In Progress',
    completed: 'Resolved',
  };

  const priorityMap: Record<Handoff['priority'], HandoffItem['priority']> = {
    critical: 'Urgent',
    high: 'High',
    medium: 'Medium',
    low: 'Medium',
  };

  const confidence = Math.min(100, Math.max(0, Math.round(
    handoff.evidence.filter(e => e.verified).length / Math.max(1, handoff.evidence.length) * 100
  )));

  const timeAgo = new Date(handoff.createdAt);
  const now = new Date();
  const diffMs = now.getTime() - timeAgo.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const time = diffMins < 60 ? `${diffMins}m ago` : `${diffHours}h ago`;

  return {
    id: handoff.id,
    customerName: handoff.customer.name,
    customerTier: handoff.customer.plan,
    issue: handoff.issueSummary,
    category: handoff.policyExcerpts[0]?.policyId || 'General',
    confidence,
    priority: priorityMap[handoff.priority],
    reason: handoff.escalationReason,
    policy: handoff.policyExcerpts.map(p => p.policyId).join(', ') || 'N/A',
    recommendedAction: handoff.recommendedNextAction,
    amount: handoff.evidence.find(e => e.type === 'transaction')?.data?.amount as string || 'N/A',
    time,
    status: statusMap[handoff.status],
  };
}

export function HandoffPage() {
  const { id: paramId } = useParams();
  const [selectedId, setSelectedId] = useState<string>(paramId || 'RX-10482');
  const [takeoverActive, setTakeoverActive] = useState(false);
  const [actionDone, setActionDone] = useState<string | null>(null);

  const { data: handoffs } = useHandoffs();
  const { data: selectedHandoff, isLoading } = useHandoff(selectedId);
  const acceptHandoff = useAcceptHandoff();
  const completeHandoff = useCompleteHandoff();
  const executeRefund = useExecuteRefund();
  const requestDocumentation = useRequestDocumentation();

  const handoffItems = handoffs?.map(mapHandoffToItem) || [];
  const selectedItem = selectedHandoff ? mapHandoffToItem(selectedHandoff) : handoffItems.find(item => item.id === selectedId) ?? handoffItems[0];

  // Handle case when no handoffs exist
  if (!selectedItem) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-48px)] bg-background">
        <div className="text-center text-on-surface-variant">
          <h2 className="text-lg font-semibold mb-2">No handoff cases available</h2>
          <p className="text-sm">All cases have been resolved or no data available.</p>
        </div>
      </div>
    );
  }

  const handleApproveAction = async () => {
    try {
      await acceptHandoff.mutateAsync(selectedId);
      setActionDone('AI Recommendation Approved: Handoff accepted successfully.');
    } catch (error) {
      setActionDone('Failed to approve action. Please try again.');
    }
  };

  const handleCompleteHandoff = async () => {
    try {
      await completeHandoff.mutateAsync(selectedId);
      setActionDone('Handoff marked as complete successfully.');
    } catch (error) {
      setActionDone('Failed to complete handoff. Please try again.');
    }
  };

  const handleExecuteRefund = async () => {
    try {
      await executeRefund.mutateAsync({ handoffId: selectedId, amount: selectedItem.amount });
      setActionDone('Refund executed successfully.');
    } catch (error) {
      setActionDone('Failed to execute refund. Please try again.');
    }
  };

  const handleRequestDocumentation = async () => {
    try {
      await requestDocumentation.mutateAsync(selectedId);
      setActionDone('Documentation requested from customer.');
    } catch (error) {
      setActionDone('Failed to request documentation. Please try again.');
    }
  };

  const handleTakeover = () => {
    setTakeoverActive(!takeoverActive);
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center h-[calc(100vh-48px)]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-48px)] overflow-hidden bg-background">
      {/* Top Banner */}
      <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/30 flex items-center justify-between text-xs text-amber-900 dark:text-amber-300">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">front_hand</span>
          <span className="font-bold">Human-in-the-Loop Supervision Queue:</span>
          <span>{handoffItems.length} cases require human authorization or intervention.</span>
        </div>
        <span className="font-mono text-[11px] bg-amber-200 dark:bg-amber-900/60 px-2 py-0.5 rounded font-semibold">
          Policy Safety Guard Active
        </span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Handoff Queue List */}
        <div className="w-80 md:w-96 border-r border-outline-variant/40 flex flex-col bg-surface-bright/40 h-full overflow-hidden">
          <div className="p-3 border-b border-outline-variant/40 flex items-center justify-between bg-surface-container-lowest">
            <h3 className="font-bold text-xs text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-[18px]">rule</span>
              Pending Handoffs ({handoffItems.length})
            </h3>
            <span className="text-[11px] text-on-surface-variant font-mono">Sorted by Priority</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2 scrollbar-thin">
            {handoffItems.map((item) => {
              const active = item.id === selectedId;
              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    active
                      ? 'bg-surface-container-lowest border-primary shadow-xs ring-1 ring-primary/30'
                      : 'bg-surface border-outline-variant/50 hover:bg-surface-container-low'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-mono font-bold text-xs text-primary">{item.id}</span>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                        item.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                          : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                      }`}
                    >
                      {item.priority}
                    </span>
                  </div>

                  <h4 className="font-semibold text-xs text-on-surface line-clamp-1">{item.issue}</h4>
                  <p className="text-[11px] text-on-surface-variant mt-0.5">{item.customerName} • {item.customerTier}</p>

                  <div className="mt-2.5 pt-2 border-t border-outline-variant/30 flex items-center justify-between text-[11px] font-mono">
                    <span className="text-rose-600 dark:text-rose-400 font-bold">
                      Confidence: {item.confidence}%
                    </span>
                    <span className="text-on-surface-variant">{item.time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Handoff Detailed Review */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-6 scrollbar-thin">
          {/* Action Success Alert */}
          {actionDone && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-900 dark:text-emerald-300 text-xs font-semibold flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {actionDone}
              </span>
              <button onClick={() => setActionDone(null)} className="text-xs hover:underline">
                Dismiss
              </button>
            </div>
          )}

          {/* Case Review Header */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-lg font-bold text-primary">{selectedItem.id}</span>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300">
                  {selectedItem.status}
                </span>
                <span className="text-xs text-on-surface-variant font-medium">Category: {selectedItem.category}</span>
              </div>
              <h2 className="text-lg font-bold text-on-surface mt-1">{selectedItem.issue}</h2>
              <p className="text-xs text-on-surface-variant mt-0.5">
                Customer: <strong className="text-on-surface font-semibold">{selectedItem.customerName}</strong> ({selectedItem.customerTier})
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleTakeover}
                className={`px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 ${
                  takeoverActive
                    ? 'bg-rose-600 text-white border-rose-700'
                    : 'border-outline-variant text-on-surface hover:bg-surface-container-low'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {takeoverActive ? 'lock' : 'front_hand'}
                </span>
                {takeoverActive ? 'Human Takeover Active' : 'Take Over Case'}
              </button>

              <button
                onClick={handleApproveAction}
                disabled={acceptHandoff.isPending}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-primary-container text-on-primary-container hover:opacity-90 transition-opacity flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">verified</span>
                {acceptHandoff.isPending ? 'Accepting...' : 'Approve AI Action'}
              </button>

              <button
                onClick={handleCompleteHandoff}
                disabled={completeHandoff.isPending}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                {completeHandoff.isPending ? 'Completing...' : 'Mark Complete'}
              </button>

              <Link
                to={`/trace?case=${selectedItem.id}`}
                className="px-3.5 py-2 text-xs font-semibold rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[18px]">terminal</span>
                Trace Log
              </Link>
            </div>
          </div>

          {/* AI Reason & Confidence Warning Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2 bg-amber-500/5 border border-amber-500/30 rounded-xl p-5 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold text-xs uppercase tracking-wider mb-2">
                  <span className="material-symbols-outlined text-[20px]">warning</span>
                  Handoff Escalation Triggered
                </div>
                <p className="text-xs text-on-surface font-medium leading-relaxed">
                  {selectedItem.reason}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-500/20 text-xs">
                <span className="font-bold text-on-surface">Policy Checked: </span>
                <code className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950 font-mono text-[11px] text-amber-900 dark:text-amber-200">
                  {selectedItem.policy}
                </code>
              </div>
            </div>

            {/* Confidence Gauge Card */}
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">
                AI Confidence Score
              </span>
              <div className="text-4xl font-extrabold font-mono text-rose-600 dark:text-rose-400 my-1">
                {selectedItem.confidence}%
              </div>
              <span className="px-2.5 py-0.5 text-[10px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                Below Auto-Approve Threshold (75%)
              </span>
            </div>
          </div>

          {/* Recommended Action Card */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 shadow-xs">
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
              AI Recommended Human Resolution
            </h3>
            <div className="p-3.5 rounded-lg bg-surface-container-low border border-outline-variant/40 text-xs font-medium text-on-surface leading-relaxed">
              {selectedItem.recommendedAction}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleApproveAction}
                disabled={acceptHandoff.isPending}
                className="px-3.5 py-1.5 text-xs font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                {acceptHandoff.isPending ? 'Accepting...' : `Execute Refund ${selectedItem.amount}`}
              </button>
              <button
                onClick={handleCompleteHandoff}
                disabled={completeHandoff.isPending}
                className="px-3.5 py-1.5 text-xs font-semibold rounded-md border border-outline-variant text-on-surface hover:bg-surface-container-low disabled:opacity-50"
              >
                {completeHandoff.isPending ? 'Completing...' : 'Request Additional Documentation'}
              </button>
            </div>
          </div>

          {/* Timeline View */}
          <ResolutionTimeline caseId={selectedItem.id} />
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';

export interface TimelineStep {
  id: string;
  name: 'Understand' | 'Investigate' | 'Policy' | 'Decide' | 'Act' | 'Verify' | 'Resolve';
  status: 'done' | 'active' | 'pending' | 'error';
  title: string;
  description: string;
  timestamp?: string;
  details?: Record<string, unknown>;
}

interface ResolutionTimelineProps {
  steps?: TimelineStep[];
  currentStepIndex?: number;
  caseId?: string;
  compact?: boolean;
}

const DEFAULT_STEPS: TimelineStep[] = [
  {
    id: 'step-1',
    name: 'Understand',
    status: 'done',
    title: 'Customer Intent Extracted',
    description: 'Identified duplicate charge issue for Order #84920 ($120.00).',
    timestamp: '10:42:01 AM',
    details: { intent: 'duplicate_charge', confidence: 0.98, customerTier: 'Gold' },
  },
  {
    id: 'step-2',
    name: 'Investigate',
    status: 'done',
    title: 'Payment Gateway Audited',
    description: 'Stripe API confirms 2 authorization holds within 45 seconds.',
    timestamp: '10:42:05 AM',
    details: { gateway: 'Stripe', chargeId: 'ch_3N8xY291', duplicateFound: true },
  },
  {
    id: 'step-3',
    name: 'Policy',
    status: 'done',
    title: 'Policy Compliance Check',
    description: 'POL-PAY-204 passed: Automatic refund eligible for <$250 duplicate.',
    timestamp: '10:42:09 AM',
    details: { policyId: 'POL-PAY-204', autoRefundLimit: 250, result: 'PASSED' },
  },
  {
    id: 'step-4',
    name: 'Decide',
    status: 'done',
    title: 'Resolution Decision Formulated',
    description: 'Initiate immediate $120.00 refund to original payment method.',
    timestamp: '10:42:12 AM',
    details: { action: 'issue_refund', amount: 120.0, currency: 'USD' },
  },
  {
    id: 'step-5',
    name: 'Act',
    status: 'active',
    title: 'Executing Refund API Call',
    description: 'Triggering Stripe Refund Endpoint (tx_ref_99401)...',
    timestamp: '10:42:15 AM',
    details: { apiEndpoint: 'POST /v1/refunds', status: 'IN_PROGRESS' },
  },
  {
    id: 'step-6',
    name: 'Verify',
    status: 'pending',
    title: 'Post-Action Ledger Audit',
    description: 'Verify refund status & update customer ledger.',
    timestamp: 'Pending',
  },
  {
    id: 'step-7',
    name: 'Resolve',
    status: 'pending',
    title: 'Case Resolution Complete',
    description: 'Send confirmation summary to customer & close case.',
    timestamp: 'Pending',
  },
];

function handleKeyDown(
  event: React.KeyboardEvent,
  step: TimelineStep,
  steps: TimelineStep[],
  idx: number,
  setSelectedStep: React.Dispatch<React.SetStateAction<TimelineStep | null>>,
  selectedStep: TimelineStep | null
) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    setSelectedStep(selectedStep?.id === step.id ? null : step);
  } else if (event.key === 'ArrowDown' && idx < steps.length - 1) {
    event.preventDefault();
    // Focus next step - handled by browser focus
  } else if (event.key === 'ArrowUp' && idx > 0) {
    event.preventDefault();
    // Focus previous step - handled by browser focus
  }
}

export function ResolutionTimeline({
  steps = DEFAULT_STEPS,
  caseId = 'RX-10482',
  compact = false,
}: ResolutionTimelineProps) {
  const [selectedStep, setSelectedStep] = useState<TimelineStep | null>(null);

  const getStepIcon = (name: TimelineStep['name']) => {
    switch (name) {
      case 'Understand': return 'psychology';
      case 'Investigate': return 'search';
      case 'Policy': return 'gavel';
      case 'Decide': return 'alt_route';
      case 'Act': return 'bolt';
      case 'Verify': return 'verified';
      case 'Resolve': return 'check_circle';
      default: return 'radio_button_checked';
    }
  };

  const getStatusLabel = (status: TimelineStep['status']) => {
    switch (status) {
      case 'done': return 'Completed';
      case 'active': return 'In Progress';
      case 'pending': return 'Pending';
      case 'error': return 'Error';
      default: return '';
    }
  };

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-4 md:p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4 border-b border-outline-variant/40 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              timeline
            </span>
            <h3 className="font-semibold text-sm text-on-surface">Resolution Timeline</h3>
          </div>
          <p className="text-xs text-on-surface-variant mt-0.5 font-mono">Case ID: {caseId}</p>
        </div>
        <span className="px-2.5 py-1 text-[11px] font-semibold rounded-full bg-primary-container text-on-primary-container">
          Autonomous AI Flow
        </span>
      </div>

      {/* Timeline Steps */}
      <div className="space-y-4 relative" role="list" aria-label="Resolution timeline steps">
        {steps.map((step, idx) => {
          const isLast = idx === steps.length - 1;
          const isDone = step.status === 'done';
          const isActive = step.status === 'active';
          const isSelected = selectedStep?.id === step.id;

          return (
            <div key={step.id} className="flex items-start gap-3 group relative" role="listitem">
              {/* Connector line */}
              {!isLast && (
                <div
                  className={`absolute left-[15px] top-[30px] w-[2px] h-[calc(100%+8px)] ${
                    isDone ? 'timeline-line-done' : 'timeline-line-pending'
                  }`}
                  aria-hidden="true"
                />
              )}

              {/* Node Icon - Keyboard accessible */}
              <div
                tabIndex={0}
                role="button"
                aria-label={`${step.name} step, ${getStatusLabel(step.status)}. Press Enter to view details.`}
                aria-expanded={isSelected}
                aria-controls={isSelected ? `${step.id}-details` : undefined}
                onClick={() => setSelectedStep(isSelected ? null : step)}
                onKeyDown={(e) => handleKeyDown(e, step, steps, idx, setSelectedStep, selectedStep)}
                className={`relative z-10 w-[32px] h-[32px] rounded-full flex items-center justify-center cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isDone
                    ? 'bg-primary-container text-on-primary-container shadow-xs'
                    : isActive
                    ? 'bg-primary text-on-primary pulse-ring ring-4 ring-primary/20'
                    : 'bg-surface-container-high text-on-surface-variant border border-outline-variant/60'
                }`}
                title={`Click to view ${step.name} details`}
              >
                <span className="material-symbols-outlined text-[18px]" aria-hidden="true">
                  {getStepIcon(step.name)}
                </span>
              </div>

              {/* Step Info */}
              <div
                tabIndex={0}
                role="button"
                aria-label={`${step.name}: ${step.title}. ${step.description}. Press Enter to expand details.`}
                aria-expanded={isSelected}
                aria-controls={isSelected ? `${step.id}-details` : undefined}
                onClick={() => setSelectedStep(isSelected ? null : step)}
                onKeyDown={(e) => handleKeyDown(e, step, steps, idx, setSelectedStep, selectedStep)}
                className={`flex-1 min-w-0 p-2.5 rounded-lg transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                  isSelected
                    ? 'bg-surface-container'
                    : 'hover:bg-surface-container-low/60'
                }`}
              >
                <div className="flex items-center justify-between flex-wrap gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase tracking-wider text-primary">
                      {step.name}
                    </span>
                    <span className="text-xs font-semibold text-on-surface">
                      {step.title}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded-full ${
                      isDone ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' :
                      isActive ? 'bg-primary-container text-on-primary-container' :
                      'bg-surface-container-high text-on-surface-variant'
                    }`}>
                      {getStatusLabel(step.status)}
                    </span>
                  </div>
                  {step.timestamp && (
                    <span className="text-[11px] text-on-surface-variant font-mono">
                      {step.timestamp}
                    </span>
                  )}
                </div>

                {!compact && (
                  <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">
                    {step.description}
                  </p>
                )}

                {/* Expanded Details */}
                {isSelected && step.details && (
                  <div
                    id={`${step.id}-details`}
                    className="mt-2.5 p-2.5 bg-inverse-surface text-inverse-on-surface rounded-md text-[11px] font-mono border border-outline/30"
                    role="region"
                    aria-label={`${step.name} execution details`}
                  >
                    <div className="text-primary-fixed-dim font-bold mb-1 uppercase tracking-wide">
                      {step.name} Execution State
                    </div>
                    <pre className="overflow-x-auto text-[11px] leading-tight">
                      {JSON.stringify(step.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

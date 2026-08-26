import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Trace } from '@/components/Trace';

interface TraceStepDetail {
  id: string;
  stepName: string;
  agent: string;
  timestamp: string;
  durationMs: number;
  tokensUsed: number;
  status: 'SUCCESS' | 'FAILED' | 'WARNING';
  promptSnippet: string;
  completionSnippet: string;
  toolCall?: {
    name: string;
    params: Record<string, unknown>;
    response: Record<string, unknown>;
  };
  policyCheck?: {
    id: string;
    description: string;
    passed: boolean;
  };
}

const SAMPLE_TRACE_STEPS: TraceStepDetail[] = [
  {
    id: 'step-01',
    stepName: '01. UNDERSTAND',
    agent: 'triage-agent-v2',
    timestamp: '10:42:01.120',
    durationMs: 310,
    tokensUsed: 420,
    status: 'SUCCESS',
    promptSnippet: `System: You are an enterprise customer triage agent.\nUser message: "I was charged $120.00 twice for Order #84920 on my statement."`,
    completionSnippet: `{\n  "intent": "duplicate_charge_refund",\n  "orderId": "84920",\n  "amount": 120.00,\n  "confidence": 0.98\n}`,
  },
  {
    id: 'step-02',
    stepName: '02. INVESTIGATE',
    agent: 'billing-investigator',
    timestamp: '10:42:05.430',
    durationMs: 840,
    tokensUsed: 610,
    status: 'SUCCESS',
    promptSnippet: `System: Execute gateway audit tool for orderId 84920. Query authorization holds.`,
    completionSnippet: `Found 2 authorization charges:\n1) ch_3N8xY290 ($120.00) @ 10:41:15 AM\n2) ch_3N8xY291 ($120.00) @ 10:41:58 AM\nConclusion: Duplicate charge confirmed.`,
    toolCall: {
      name: 'StripeAPI.listCharges',
      params: { orderId: '84920', customerId: 'USR-99401' },
      response: { count: 2, chargeIds: ['ch_3N8xY290', 'ch_3N8xY291'] },
    },
  },
  {
    id: 'step-03',
    stepName: '03. POLICY CHECK',
    agent: 'policy-validator-v1',
    timestamp: '10:42:09.890',
    durationMs: 180,
    tokensUsed: 210,
    status: 'SUCCESS',
    promptSnippet: `Evaluate POL-PAY-204: Auto refund allowed for duplicate charge <= $250.00.`,
    completionSnippet: `Rule POL-PAY-204 evaluated to TRUE. Maximum limit: $250.00. Amount: $120.00.`,
    policyCheck: {
      id: 'POL-PAY-204',
      description: 'Duplicate charge automatic refund policy',
      passed: true,
    },
  },
  {
    id: 'step-04',
    stepName: '04. DECIDE & ACT',
    agent: 'execution-engine',
    timestamp: '10:42:12.300',
    durationMs: 450,
    tokensUsed: 242,
    status: 'SUCCESS',
    promptSnippet: `Trigger Stripe refund for charge ch_3N8xY291. Amount: $120.00.`,
    completionSnippet: `Stripe Refund API returned 200 OK. Refund ID: re_9940182.`,
    toolCall: {
      name: 'StripeAPI.issueRefund',
      params: { chargeId: 'ch_3N8xY291', amount: 12000, currency: 'usd' },
      response: { status: 'succeeded', refundId: 're_9940182' },
    },
  },
];

export function TracePage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId') || searchParams.get('case');
  const [selectedStepId, setSelectedStepId] = useState('step-02');
  const [activeInspectorTab, setActiveInspectorTab] = useState<'LLM' | 'Tool' | 'Policy'>('LLM');

  const selectedStep = SAMPLE_TRACE_STEPS.find((s) => s.id === selectedStepId) || SAMPLE_TRACE_STEPS[0]!;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-48px)] bg-inverse-surface text-inverse-on-surface font-mono overflow-hidden">
      {/* Header Inspector Toolbar */}
      <div className="p-3 md:p-4 border-b border-outline/40 bg-surface-bright/5 dark:bg-black/40 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-primary-fixed-dim hover:underline flex items-center gap-1 font-sans font-bold">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <span className="text-outline">/</span>
          <span className="text-primary-fixed-dim font-bold">Agent Trace Log</span>
          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary-fixed-dim border border-primary/30">
            Case: {runId || 'RX-10482'}
          </span>
        </div>

        <div className="flex items-center gap-4 text-[11px] text-surface-variant font-sans">
          <span>Total Latency: <strong className="text-inverse-on-surface font-mono">1.78s</strong></span>
          <span>Tokens: <strong className="text-inverse-on-surface font-mono">1,482</strong></span>
          <span>Status: <strong className="text-emerald-400 font-mono">PASS</strong></span>
        </div>
      </div>

      {/* Main Split Inspector View */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Step Navigator */}
        <div className="w-full lg:w-80 border-r border-outline/40 bg-black/20 flex flex-col h-full overflow-hidden">
          <div className="p-3 border-b border-outline/40 font-sans text-xs font-bold text-surface-variant uppercase tracking-wider flex items-center gap-2">
            <span className="material-symbols-outlined text-primary-fixed-dim text-[18px]">account_tree</span>
            Execution Pipeline Steps
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin">
            {SAMPLE_TRACE_STEPS.map((step) => {
              const active = step.id === selectedStepId;
              return (
                <div
                  key={step.id}
                  onClick={() => setSelectedStepId(step.id)}
                  className={`p-3 rounded-lg border transition-all cursor-pointer ${
                    active
                      ? 'bg-primary/20 border-primary text-primary-fixed-dim font-bold shadow-xs'
                      : 'bg-black/20 border-outline/30 hover:bg-black/40 text-surface-variant'
                  }`}
                >
                  <div className="flex justify-between items-center text-[11px] mb-1">
                    <span className="text-primary-fixed-dim">{step.stepName}</span>
                    <span className="text-[10px] text-emerald-400 font-mono">{step.durationMs}ms</span>
                  </div>
                  <div className="text-xs font-sans text-inverse-on-surface truncate">{step.agent}</div>
                  <div className="text-[10px] text-outline mt-1 font-mono">{step.timestamp}</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Code Inspector Canvas */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-black/40 p-4 md:p-6 space-y-4 scrollbar-thin">
          {/* Step Metadata Card */}
          <div className="p-4 rounded-xl border border-outline/40 bg-inverse-surface/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="text-xs text-primary-fixed-dim font-bold uppercase tracking-wide">
                {selectedStep.stepName} • {selectedStep.agent}
              </div>
              <p className="text-xs text-surface-variant font-sans mt-0.5">
                Executed at {selectedStep.timestamp} • Duration: {selectedStep.durationMs}ms • Token count: {selectedStep.tokensUsed}
              </p>
            </div>

            <div className="flex items-center gap-2 font-sans">
              {(['LLM', 'Tool', 'Policy'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveInspectorTab(tab)}
                  className={`px-3 py-1 text-xs font-bold rounded transition-colors ${
                    activeInspectorTab === tab
                      ? 'bg-primary-container text-on-primary-container'
                      : 'bg-black/30 border border-outline/40 text-surface-variant hover:text-inverse-on-surface'
                  }`}
                >
                  {tab === 'LLM' ? 'LLM Prompt / Response' : tab === 'Tool' ? 'Tool Payload' : 'Policy Check'}
                </button>
              ))}
            </div>
          </div>

          {/* Inspector Content */}
          <div className="flex-1 flex flex-col border border-outline/40 rounded-xl overflow-hidden bg-black/60 p-4 font-mono text-xs">
            {activeInspectorTab === 'LLM' && (
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto scrollbar-thin">
                <div>
                  <span className="text-primary-fixed-dim font-bold uppercase tracking-wider text-[11px] block mb-2">
                    System / User Prompt Input:
                  </span>
                  <pre className="p-3 bg-inverse-surface/60 rounded-lg text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-outline/30">
                    {selectedStep.promptSnippet}
                  </pre>
                </div>

                <div>
                  <span className="text-primary-fixed-dim font-bold uppercase tracking-wider text-[11px] block mb-2">
                    LLM Model Response Output:
                  </span>
                  <pre className="p-3 bg-inverse-surface/60 rounded-lg text-blue-300 overflow-x-auto whitespace-pre-wrap leading-relaxed border border-outline/30">
                    {selectedStep.completionSnippet}
                  </pre>
                </div>
              </div>
            )}

            {activeInspectorTab === 'Tool' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin space-y-4">
                {selectedStep.toolCall ? (
                  <div>
                    <span className="text-primary-fixed-dim font-bold uppercase tracking-wider text-[11px] block mb-2">
                      Tool Call Invocation: <span className="text-amber-400 font-mono">{selectedStep.toolCall.name}</span>
                    </span>
                    <pre className="p-3 bg-inverse-surface/60 rounded-lg text-amber-200 overflow-x-auto border border-outline/30 mb-4">
                      {JSON.stringify(selectedStep.toolCall.params, null, 2)}
                    </pre>

                    <span className="text-primary-fixed-dim font-bold uppercase tracking-wider text-[11px] block mb-2">
                      Tool Execution Result:
                    </span>
                    <pre className="p-3 bg-inverse-surface/60 rounded-lg text-emerald-300 overflow-x-auto border border-outline/30">
                      {JSON.stringify(selectedStep.toolCall.response, null, 2)}
                    </pre>
                  </div>
                ) : (
                  <div className="text-outline text-center py-12">No tool invocation recorded for this step.</div>
                )}
              </div>
            )}

            {activeInspectorTab === 'Policy' && (
              <div className="flex-1 overflow-y-auto scrollbar-thin">
                {selectedStep.policyCheck ? (
                  <div className="p-4 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-xs">
                    <div className="flex justify-between items-center text-emerald-400 font-bold mb-2">
                      <span>{selectedStep.policyCheck.id}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-500 text-black font-extrabold text-[10px]">
                        PASSED
                      </span>
                    </div>
                    <p className="text-inverse-on-surface font-sans">{selectedStep.policyCheck.description}</p>
                  </div>
                ) : (
                  <div className="text-outline text-center py-12">Policy check passed automatically.</div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Backend Fallback if runId is supplied */}
      {runId && (
        <div className="p-4 border-t border-outline/40 bg-black/40 hidden">
          <Trace runId={runId} />
        </div>
      )}
    </div>
  );
}
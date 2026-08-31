import { useSearchParams, Link } from 'react-router-dom';
import { TraceTimeline } from '@/features/trace/components/TraceTimeline';

export function TracePage() {
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId') ?? searchParams.get('case') ?? undefined;

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-48px)] bg-background">
      {/* Header */}
      <div className="p-3 md:p-4 border-b border-outline-variant/40 bg-surface-bright/5 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-3">
          <Link to="/" className="text-primary hover:underline flex items-center gap-1 font-sans font-bold">
            <span className="material-symbols-outlined text-[16px]">arrow_back</span> Dashboard
          </Link>
          <span className="text-on-surface-variant">/</span>
          <span className="text-primary font-bold">Agent Trace Log</span>
          <span className="px-2 py-0.5 rounded bg-primary/20 text-primary border border-primary/30">
            Case: {runId || 'RX-10482'}
          </span>
        </div>
      </div>

      {/* Trace Timeline */}
      <div className="flex-1 overflow-hidden">
        <TraceTimeline runId={runId} conversationId={runId} />
      </div>
    </div>
  );
}
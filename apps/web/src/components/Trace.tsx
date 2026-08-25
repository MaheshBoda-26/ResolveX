'use client';

import { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, CheckCircle, XCircle, AlertCircle, Loader2, Clock, Zap, FileText } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTrace, AgentTrace } from '@/lib/api';
import { cn } from '@/lib/utils';

interface TraceProps {
  runId: string | undefined;
}

const statusIcons = {
  pending: Clock,
  running: Loader2,
  success: CheckCircle,
  failed: XCircle,
  escalated: AlertCircle,
};

const statusColors = {
  pending: 'text-text-muted',
  running: 'text-brand-primary animate-spin',
  success: 'text-success-default',
  failed: 'text-error-default',
  escalated: 'text-warning-default',
};

const agentIcons = {
  triage: Zap,
  billing: FileText,
  subscription: FileText,
};

export function Trace({ runId }: TraceProps) {
  const { data: traces, isLoading, refetch } = useTrace(runId);

  useEffect(() => {
    if (runId) {
      refetch();
    }
  }, [runId, refetch]);

  if (!runId) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p className="text-body">Select a conversation to view the agent trace</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!traces || traces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p className="text-body">No trace data available for this conversation</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-default">
        <h2 className="text-h3 font-semibold">Agent Trace</h2>
        <p className="text-body text-text-secondary mt-1">
          {traces.length} step{traces.length !== 1 ? 's' : ''} •{' '}
          {traces.some((t) => t.status === 'running' || t.status === 'pending')
            ? 'Running...'
            : 'Completed'}
        </p>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-3">
        {traces.map((trace, index) => (
          <TraceItem key={trace.id} trace={trace} index={index} total={traces.length} />
        ))}
      </ScrollArea>
    </div>
  );
}

interface TraceItemProps {
  trace: AgentTrace;
  index: number;
  total: number;
}

function TraceItem({ trace, index, total }: TraceItemProps) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = statusIcons[trace.status];
  const AgentIcon = agentIcons[trace.agent as keyof typeof agentIcons] ?? Zap;

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'failed': return 'error';
      case 'escalated': return 'warning';
      case 'running': return 'info';
      default: return 'default';
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center',
                trace.status === 'success' && 'bg-success-soft',
                trace.status === 'failed' && 'bg-error-soft',
                trace.status === 'escalated' && 'bg-warning-soft',
                trace.status === 'running' && 'bg-brand-primary-soft animate-pulse',
                trace.status === 'pending' && 'bg-secondary-soft'
              )}
            >
              <StatusIcon className={cn('h-4 w-4', statusColors[trace.status])} />
            </div>
            {index < total - 1 && (
              <div className="w-px h-full bg-border-default mt-1" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <AgentIcon className="h-4 w-4 text-text-muted" />
                <span className="text-body-medium font-medium capitalize">{trace.agent}</span>
              </div>
              <Badge variant={getBadgeVariant(trace.status)}>{trace.status}</Badge>
              {trace.duration && (
                <span className="text-caption text-text-muted ml-auto">
                  {trace.duration}ms
                </span>
              )}
            </div>

            <p className="mt-1 text-body text-text-secondary font-mono text-trace-mono">
              {trace.action}
            </p>

            {(trace.input !== undefined || trace.output !== undefined) && (
              <div className="mt-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-body-medium text-text-secondary hover:text-text-primary transition-colors"
                  aria-expanded={expanded}
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>{expanded ? 'Hide' : 'Show'} details</span>
                </button>

                {expanded && (
                  <div className="mt-3 space-y-3 border-t border-border-default pt-3">
                    {trace.input !== undefined && (
                      <div>
                        <p className="text-small font-medium text-text-secondary mb-1">Input</p>
                        <pre className="bg-secondary-soft dark:bg-secondary-default p-3 rounded-lg overflow-x-auto text-trace-mono font-mono text-text-primary">
                          {JSON.stringify(trace.input, null, 2)}
                        </pre>
                      </div>
                    )}
                    {trace.output !== undefined && (
                      <div>
                        <p className="text-small font-medium text-text-secondary mb-1">Output</p>
                        <pre className="bg-secondary-soft dark:bg-secondary-default p-3 rounded-lg overflow-x-auto text-trace-mono font-mono text-text-primary">
                          {JSON.stringify(trace.output, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <p className="mt-2 text-caption text-text-muted">
              {new Date(trace.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
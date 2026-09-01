"use client";

import { useState, useEffect } from "react";
import {
  ChevronRight,
  ChevronDown,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Clock,
  Zap,
  FileText,
  ShieldCheck,
  ShieldAlert,
  GitBranch,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { ScrollArea } from "@/shared/components/ui/scroll-area";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Badge } from "@/shared/components/ui/badge";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/shared/components/ui/collapsible";
import {
  useTrace,
  useAgentRunTrace,
  useConversationTraces,
} from "@/shared/hooks/useTrace";
import type { AgentTrace } from "@/shared/lib/api";
import { cn } from "@/shared/utils/utils";

interface TraceTimelineProps {
  runId: string | undefined;
  conversationId?: string;
}

const statusIcons = {
  pending: Clock,
  running: Loader2,
  success: CheckCircle,
  failed: XCircle,
  escalated: AlertCircle,
  warning: AlertCircle,
};

const statusColors = {
  pending: "text-text-muted",
  running: "text-brand-primary animate-spin",
  success: "text-success-default",
  failed: "text-error-default",
  escalated: "text-warning-default",
  warning: "text-warning-default",
};

const agentIcons = {
  triage: Zap,
  billing: FileText,
  subscription: FileText,
};

const eventTypeIcons = {
  agent_start: Zap,
  agent_decision: FileText,
  tool_call: ExternalLink,
  tool_result: CheckCircle,
  verification: ShieldCheck,
  handoff: GitBranch,
  error: AlertCircle,
};

const eventTypeLabels = {
  agent_start: "Agent Started",
  agent_decision: "Decision Made",
  tool_call: "Tool Called",
  tool_result: "Tool Completed",
  verification: "Verification",
  handoff: "Handoff",
  error: "Error",
};

function formatJson(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-1 text-xs text-text-secondary hover:text-text-primary transition-colors rounded border border-border-default hover:border-brand-primary"
            aria-label={label}
          >
            {copied ? (
              <Check className="h-3 w-3 text-success-default" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
            <span>{copied ? "Copied" : label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{label}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function VerificationBadge({
  status,
  onClick,
}: {
  status: "pending" | "passed" | "failed";
  onClick?: () => void;
}) {
  const icons = {
    pending: <Clock className="h-3 w-3 animate-spin text-text-muted" />,
    passed: <ShieldCheck className="h-3 w-3 text-success-default" />,
    failed: <ShieldAlert className="h-3 w-3 text-error-default" />,
  };
  const labels = { pending: "Pending", passed: "Passed", failed: "Failed" };
  const colors = {
    pending: "border-border-default text-text-muted",
    passed: "border-success-default bg-success-soft text-success-default",
    failed: "border-error-default bg-error-soft text-error-default",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full border",
        colors[status],
      )}
      disabled={!onClick}
    >
      {icons[status]}
      <span>{labels[status]}</span>
    </button>
  );
}

function HandoffCard({
  handoff,
}: {
  handoff: {
    id: string;
    reason: string;
    evidence: Record<string, unknown>;
    recommendedAction: string;
    status: string;
    createdAt: string;
  };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="border-warning-default bg-warning-soft/20">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 text-body-medium font-medium">
              <GitBranch className="h-4 w-4 text-warning-default" />
              <span>Handoff Required</span>
              <Badge variant="warning">{handoff.status}</Badge>
            </div>
            <p className="mt-2 text-body text-text-secondary">
              {handoff.reason}
            </p>
            <p className="mt-1 text-body text-text-primary font-medium">
              Recommended: {handoff.recommendedAction}
            </p>
          </div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-body-medium text-text-secondary hover:text-text-primary transition-colors flex-shrink-0"
            aria-expanded={expanded}
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
            <span>{expanded ? "Hide" : "Show"} evidence</span>
          </button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t border-warning-default/30 pt-4">
            <div>
              <p className="text-small font-medium text-text-secondary mb-1">
                Evidence
              </p>
              <div className="flex items-center justify-between">
                <pre className="bg-secondary-soft dark:bg-secondary-default p-3 rounded-lg overflow-x-auto text-trace-mono font-mono text-text-primary flex-1">
                  {formatJson(handoff.evidence)}
                </pre>
                <CopyButton
                  value={formatJson(handoff.evidence)}
                  label="Copy evidence"
                />
              </div>
            </div>
            <p className="text-caption text-text-muted">
              Created: {new Date(handoff.createdAt).toLocaleString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

type TraceEventStatus = "pending" | "success" | "failed" | "warning";
function TraceEventItem({
  event,
  index,
  total,
}: {
  event: {
    id: string;
    timestamp: string;
    type: string;
    label: string;
    data: Record<string, unknown>;
    status: TraceEventStatus;
  };
  index: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const EventIcon =
    eventTypeIcons[event.type as keyof typeof eventTypeIcons] ?? Zap;
  const eventLabel =
    eventTypeLabels[event.type as keyof typeof eventTypeLabels] ?? event.type;

  const statusVariant =
    {
      pending: "default",
      success: "success",
      failed: "error",
      warning: "warning",
    }[event.status] ?? "default";

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                event.status === "success" && "bg-success-soft",
                event.status === "failed" && "bg-error-soft",
                event.status === "warning" && "bg-warning-soft",
                event.status === "pending" && "bg-secondary-soft",
              )}
            >
              <EventIcon
                className={cn(
                  "h-4 w-4",
                  statusColors[event.status as keyof typeof statusColors] ??
                    "text-text-muted",
                )}
              />
            </div>
            {index < total - 1 && (
              <div className="w-px h-full bg-border-default mt-1" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <EventIcon className="h-4 w-4 text-text-muted" />
                <span className="text-body-medium font-medium">
                  {eventLabel}
                </span>
              </div>
              <Badge
                variant={
                  statusVariant as
                    | "primary"
                    | "secondary"
                    | "default"
                    | "error"
                    | "success"
                    | "warning"
                    | "info"
                }
              >
                {event.status}
              </Badge>
              {(typeof event.data?.duration === "number" ||
                typeof event.data?.duration === "string") && (
                <span className="text-caption text-text-muted ml-auto">
                  {event.data.duration}ms
                </span>
              )}
            </div>

            <p className="mt-1 text-body text-text-secondary font-mono text-trace-mono">
              {event.label}
            </p>

            {Object.keys(event.data).length > 0 && (
              <div className="mt-3">
                <Collapsible open={expanded} onOpenChange={setExpanded}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-body-medium text-text-secondary hover:text-text-primary transition-colors w-fit">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>{expanded ? "Hide" : "Show"} details</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 border-t border-border-default pt-3">
                    <div className="flex items-center justify-between">
                      <p className="text-small font-medium text-text-secondary">
                        Data
                      </p>
                      <CopyButton
                        value={formatJson(event.data)}
                        label="Copy JSON"
                      />
                    </div>
                    <pre className="bg-secondary-soft dark:bg-secondary-default p-3 rounded-lg overflow-x-auto text-trace-mono font-mono text-text-primary">
                      {formatJson(event.data)}
                    </pre>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            <p className="mt-2 text-caption text-text-muted">
              {new Date(event.timestamp).toLocaleString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AgentTraceItem({
  trace,
  index,
  total,
}: {
  trace: AgentTrace;
  index: number;
  total: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = statusIcons[trace.status];
  const AgentIcon = agentIcons[trace.agent as keyof typeof agentIcons] ?? Zap;

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case "success":
        return "success";
      case "failed":
        return "error";
      case "escalated":
        return "warning";
      case "running":
        return "info";
      default:
        return "default";
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-start gap-4 p-4">
          <div className="flex flex-col items-center flex-shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                trace.status === "success" && "bg-success-soft",
                trace.status === "failed" && "bg-error-soft",
                trace.status === "escalated" && "bg-warning-soft",
                trace.status === "running" &&
                  "bg-brand-primary-soft animate-pulse",
                trace.status === "pending" && "bg-secondary-soft",
              )}
            >
              <StatusIcon
                className={cn(
                  "h-4 w-4",
                  statusColors[trace.status as keyof typeof statusColors],
                )}
              />
            </div>
            {index < total - 1 && (
              <div className="w-px h-full bg-border-default mt-1" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <AgentIcon className="h-4 w-4 text-text-muted" />
                <span className="text-body-medium font-medium capitalize">
                  {trace.agent}
                </span>
              </div>
              <Badge variant={getBadgeVariant(trace.status)}>
                {trace.status}
              </Badge>
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
                <Collapsible open={expanded} onOpenChange={setExpanded}>
                  <CollapsibleTrigger className="flex items-center gap-1 text-body-medium text-text-secondary hover:text-text-primary transition-colors w-fit">
                    {expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <span>{expanded ? "Hide" : "Show"} details</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3 border-t border-border-default pt-3">
                    {trace.input !== undefined && (
                      <div className="flex items-center justify-between">
                        <p className="text-small font-medium text-text-secondary">
                          Input
                        </p>
                        <CopyButton
                          value={formatJson(trace.input)}
                          label="Copy input"
                        />
                      </div>
                    )}
                    {trace.input !== undefined && (
                      <pre className="bg-secondary-soft dark:bg-secondary-default p-3 rounded-lg overflow-x-auto text-trace-mono font-mono text-text-primary">
                        {formatJson(trace.input)}
                      </pre>
                    )}
                    {trace.output !== undefined && (
                      <div className="flex items-center justify-between">
                        <p className="text-small font-medium text-text-secondary">
                          Output
                        </p>
                        <CopyButton
                          value={formatJson(trace.output)}
                          label="Copy output"
                        />
                      </div>
                    )}
                    {trace.output !== undefined && (
                      <pre className="bg-secondary-soft dark:bg-secondary-default p-3 rounded-lg overflow-x-auto text-trace-mono font-mono text-text-primary">
                        {formatJson(trace.output)}
                      </pre>
                    )}
                  </CollapsibleContent>
                </Collapsible>
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

export function TraceTimeline({ runId, conversationId }: TraceTimelineProps) {
  const { data: traces, isLoading, error, refetch } = useTrace(runId);
  const { data: agentRunTrace } = useAgentRunTrace(runId);
  const { data: conversationTraces } = useConversationTraces(conversationId);

  useEffect(() => {
    if (runId) {
      refetch();
    }
  }, [runId, refetch]);

  if (!runId && !conversationId) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p className="text-body">
          Select a conversation to view the agent trace
        </p>
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-full text-error-default">
        <AlertCircle className="h-8 w-8 mr-2" />
        <p className="text-body">Failed to load trace: {error.message}</p>
      </div>
    );
  }

  const displayTraces = traces ?? conversationTraces ?? [];

  if (!displayTraces || displayTraces.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-muted">
        <p className="text-body">No trace data available</p>
      </div>
    );
  }

  const hasRunning = displayTraces.some(
    (t) => t.status === "running" || t.status === "pending",
  );
  const overallStatus = displayTraces.some((t) => t.status === "failed")
    ? "failed"
    : displayTraces.some((t) => t.status === "escalated")
      ? "escalated"
      : hasRunning
        ? "running"
        : "success";

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b border-border-default">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-h3 font-semibold">Agent Trace</h2>
            <p className="text-body text-text-secondary mt-1">
              {displayTraces.length} step{displayTraces.length !== 1 ? "s" : ""}{" "}
              •
              <span
                className={cn(
                  "ml-1 font-medium",
                  statusColors[overallStatus as keyof typeof statusColors] ??
                    "",
                )}
              >
                {hasRunning
                  ? "Running..."
                  : overallStatus.charAt(0).toUpperCase() +
                    overallStatus.slice(1)}
              </span>
            </p>
          </div>
          {agentRunTrace && (
            <div className="flex items-center gap-2">
              <Badge
                variant={
                  agentRunTrace.status === "running"
                    ? "info"
                    : agentRunTrace.status === "completed"
                      ? "success"
                      : "error"
                }
              >
                {agentRunTrace.status}
              </Badge>
            </div>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 p-4 space-y-3">
        {displayTraces.map((trace, index) => (
          <AgentTraceItem
            key={trace.id}
            trace={trace}
            index={index}
            total={displayTraces.length}
          />
        ))}

        {agentRunTrace?.events && agentRunTrace.events.length > 0 && (
          <>
            <Separator className="my-4" />
            <h3 className="text-body-medium font-semibold text-text-secondary px-2 mb-2">
              Detailed Events
            </h3>
            {agentRunTrace.events.map((event, index) => (
              <TraceEventItem
                key={event.id}
                event={event}
                index={index}
                total={agentRunTrace.events.length}
              />
            ))}
          </>
        )}

        {agentRunTrace?.handoffs && agentRunTrace.handoffs.length > 0 && (
          <>
            <Separator className="my-4" />
            <h3 className="text-body-medium font-semibold text-text-secondary px-2 mb-2">
              Handoffs
            </h3>
            {agentRunTrace.handoffs.map((handoff) => (
              <HandoffCard key={handoff.id} handoff={handoff} />
            ))}
          </>
        )}

        {agentRunTrace?.verifications &&
          agentRunTrace.verifications.length > 0 && (
            <>
              <Separator className="my-4" />
              <h3 className="text-body-medium font-semibold text-text-secondary px-2 mb-2">
                Verifications
              </h3>
              <div className="space-y-2">
                {agentRunTrace.verifications.map((verification) => (
                  <Card key={verification.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4 text-text-muted" />
                          <span className="text-body-medium font-medium capitalize">
                            {verification.actionType}
                          </span>
                        </div>
                        <VerificationBadge status={verification.status} />
                      </div>
                      <p className="mt-2 text-caption text-text-muted">
                        Expected:{" "}
                        {String(formatJson(verification.expectedState)).slice(
                          0,
                          100,
                        )}
                        {String(formatJson(verification.expectedState)).length >
                        100
                          ? "..."
                          : ""}
                      </p>
                      {verification.observedState && (
                        <p className="mt-1 text-caption text-text-muted">
                          Observed:{" "}
                          {String(formatJson(verification.observedState)).slice(
                            0,
                            100,
                          )}
                          {String(formatJson(verification.observedState))
                            .length > 100
                            ? "..."
                            : ""}
                        </p>
                      )}
                      <p className="mt-2 text-caption text-text-muted">
                        {new Date(verification.createdAt).toLocaleString()}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}
      </ScrollArea>
    </div>
  );
}

import { useQuery } from "@tanstack/react-query";
import { AgentTrace } from "@/shared/lib/api";
import { env } from "@/lib/env";

const API_URL = env.VITE_API_URL ?? "http://localhost:3000";

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(error || res.statusText);
  }

  return res.json();
}

export interface TraceEvent {
  id: string;
  agentRunId: string;
  timestamp: string;
  type:
    | "agent_start"
    | "agent_decision"
    | "tool_call"
    | "tool_result"
    | "verification"
    | "handoff"
    | "error";
  label: string;
  data: Record<string, unknown>;
  status: "pending" | "success" | "failed" | "warning";
}

export interface AgentRunTrace {
  conversationId: string;
  events: TraceEvent[];
  status: "running" | "completed" | "escalated" | "error";
  startedAt: string;
  completedAt: string | null;
  handoffs: Array<{
    id: string;
    conversationId: string;
    reason: string;
    evidence: Record<string, unknown>;
    recommendedAction: string;
    status: string;
    createdAt: string;
  }>;
  verifications: Array<{
    id: string;
    conversationId: string;
    actionType: string;
    expectedState: Record<string, unknown>;
    observedState: Record<string, unknown> | null;
    status: "pending" | "passed" | "failed";
    createdAt: string;
  }>;
}

export function useTrace(runId: string | undefined) {
  return useQuery<AgentTrace[]>({
    queryKey: ["trace", runId],
    queryFn: () => fetchJson<AgentTrace[]>(`/api/traces/${runId}`),
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      const hasRunning = data.some(
        (t) => t.status === "running" || t.status === "pending",
      );
      return hasRunning ? 1000 : false;
    },
  });
}

export function useAgentRunTrace(runId: string | undefined) {
  return useQuery<AgentRunTrace>({
    queryKey: ["agentRunTrace", runId],
    queryFn: () => fetchJson<AgentRunTrace>(`/api/traces/${runId}`),
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      return data.status === "running" ? 1000 : false;
    },
  });
}

export function useConversationTraces(conversationId: string | undefined) {
  return useQuery<AgentTrace[]>({
    queryKey: ["conversationTraces", conversationId],
    queryFn: () =>
      fetchJson<AgentTrace[]>(`/api/conversations/${conversationId}/trace`),
    enabled: !!conversationId,
  });
}

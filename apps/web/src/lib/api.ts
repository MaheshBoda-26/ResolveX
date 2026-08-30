import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

export async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...options?.headers as Record<string, string>,
  };

  // Add auth token if available
  const token = localStorage.getItem('auth_token');
  if (token) {
    requestHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: requestHeaders,
  });

  // Log API calls in development
  if (import.meta.env.DEV) {
    console.log(`[API] ${options?.method || 'GET'} ${path}`, {
      status: res.status,
      ok: res.ok,
    });
  }

  if (!res.ok) {
    const error = await res.text();
    throw new ApiError(error || res.statusText, res.status);
  }

  return res.json();
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  runId?: string;
}

export interface AgentTrace {
  id: string;
  agent: string;
  action: string;
  status: 'pending' | 'running' | 'success' | 'failed' | 'escalated';
  duration?: number;
  input?: unknown;
  output?: unknown;
  timestamp: string;
}

export interface Conversation {
  id: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: Message;
  conversationId: string;
  runId: string;
}

export type HandoffStatus = 'pending' | 'accepted' | 'completed';

export interface Handoff {
  id: string;
  customer: {
    id: string;
    name: string;
    email: string;
    plan: string;
    status: string;
  };
  issueSummary: string;
  originalRequest: string;
  reason: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
  status: HandoffStatus;
  evidence: Evidence[];
  policyExcerpts: PolicyExcerpt[];
  completedActions: CompletedAction[];
  escalationReason: string;
  recommendedNextAction: string;
}

export interface Evidence {
  id: string;
  type: 'transaction' | 'policy' | 'communication' | 'document';
  description: string;
  data: Record<string, unknown>;
  collectedAt: string;
  verified: boolean;
}

export interface PolicyExcerpt {
  id: string;
  policyId: string;
  title: string;
  excerpt: string;
  relevantSection: string;
}

export interface CompletedAction {
  id: string;
  action: string;
  description: string;
  performedAt: string;
  verificationStatus: 'verified' | 'pending' | 'failed';
  verificationDetails?: string;
}

export interface HandoffFilters {
  status?: HandoffStatus;
  priority?: Handoff['priority'];
  search?: string;
}

export interface HandoffSort {
  field: 'createdAt' | 'priority' | 'customer';
  direction: 'asc' | 'desc';
}

export type { HandoffStatus as HandoffStatusExport };

export function useConversation(conversationId: string | undefined) {
  return useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: () => fetchJson<Conversation>(`/api/conversations/${conversationId}`),
    enabled: !!conversationId,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (req: ChatRequest) =>
      fetchJson<ChatResponse>('/api/agent/process', {
        method: 'POST',
        body: JSON.stringify(req),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', data.conversationId] });
      queryClient.invalidateQueries({ queryKey: ['trace', data.runId] });
    },
  });
}

export function useTrace(runId: string | undefined) {
  return useQuery({
    queryKey: ['trace', runId],
    queryFn: () => fetchJson<AgentTrace[]>(`/api/traces/${runId}`),
    enabled: !!runId,
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return 1000;
      const hasRunning = data.some((t) => t.status === 'running' || t.status === 'pending');
      return hasRunning ? 1000 : false;
    },
  });
}

export function useConversations() {
  return useQuery({
    queryKey: ['conversations'],
    queryFn: () => fetchJson<Conversation[]>('/api/conversations'),
  });
}

function serializeFilters(filters?: HandoffFilters, sort?: HandoffSort): string {
  const parts: string[] = [];
  if (filters?.status) parts.push(`status=${filters.status}`);
  if (filters?.priority) parts.push(`priority=${filters.priority}`);
  if (filters?.search) parts.push(`search=${filters.search}`);
  if (sort?.field) parts.push(`sortField=${sort.field}`);
  if (sort?.direction) parts.push(`sortDirection=${sort.direction}`);
  return parts.join('&');
}

export function useHandoffs(filters?: HandoffFilters, sort?: HandoffSort) {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.priority) params.set('priority', filters.priority);
  if (filters?.search) params.set('search', filters.search);
  if (sort?.field) params.set('sortField', sort.field);
  if (sort?.direction) params.set('sortDirection', sort.direction);

  return useQuery({
    queryKey: ['handoffs', serializeFilters(filters, sort)],
    queryFn: () => fetchJson<Handoff[]>(`/api/handoffs?${params.toString()}`),
    refetchInterval: 10000,
  });
}

export function useHandoff(handoffId: string | undefined) {
  return useQuery({
    queryKey: ['handoff', handoffId],
    queryFn: () => fetchJson<Handoff>(`/api/handoffs/${handoffId}`),
    enabled: !!handoffId,
    refetchInterval: 5000,
  });
}

export function useAcceptHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handoffId: string) =>
      fetchJson<Handoff>(`/api/handoffs/${handoffId}/accept`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff', data.id] });
    },
  });
}

export function useCompleteHandoff() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handoffId: string) =>
      fetchJson<Handoff>(`/api/handoffs/${handoffId}/complete`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff', data.id] });
    },
  });
}

export function useExecuteRefund() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ handoffId, amount }: { handoffId: string; amount: string }) =>
      fetchJson<Handoff>(`/api/handoffs/${handoffId}/execute-refund`, {
        method: 'POST',
        body: JSON.stringify({ amount }),
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff', data.id] });
    },
  });
}

export function useRequestDocumentation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (handoffId: string) =>
      fetchJson<Handoff>(`/api/handoffs/${handoffId}/request-docs`, {
        method: 'POST',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['handoffs'] });
      queryClient.invalidateQueries({ queryKey: ['handoff', data.id] });
    },
  });
}
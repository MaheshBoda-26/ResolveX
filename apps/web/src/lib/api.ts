import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

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

class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new ApiError(error || res.statusText, res.status);
  }

  return res.json();
}

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
      fetchJson<ChatResponse>('/api/chat', {
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

export { ApiError };
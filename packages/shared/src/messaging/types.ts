/**
 * ResolveX Agent Messaging Types
 * Core types for async agent communication with observability
 */

export type AgentName =
  "triage" | "billing" | "subscription" | "verification" | "orchestrator";

export type AgentState =
  | "idle"
  | "processing"
  | "waiting_for_tool"
  | "awaiting_approval"
  | "completed"
  | "failed";

export type MessageType = "request" | "response" | "notification" | "error";

export interface AgentMessage<TPayload = unknown> {
  correlationId: string;
  from: AgentName;
  to: AgentName;
  type: MessageType;
  payload: TPayload;
  timestamp: string;
  traceId?: string;
}

export interface RequestMessage<TPayload = unknown> {
  correlationId: string;
  from: AgentName;
  to: AgentName;
  type: "request";
  payload: TPayload;
  timestamp: string;
  traceId?: string;
  replyTo?: string;
}

export interface ResponseMessage<TPayload = unknown> {
  correlationId: string;
  from: AgentName;
  to: AgentName;
  type: "response";
  payload: TPayload;
  timestamp: string;
  traceId?: string;
  success: boolean;
  error?: string;
}

export interface NotificationMessage<TPayload = unknown> {
  correlationId: string;
  from: AgentName;
  to: AgentName;
  type: "notification";
  payload: TPayload;
  timestamp: string;
  traceId?: string;
}

export interface ErrorMessage {
  correlationId: string;
  from: AgentName;
  to: AgentName;
  type: "error";
  payload: { message: string; code?: string };
  timestamp: string;
  traceId?: string;
}

export type AnyMessage =
  RequestMessage | ResponseMessage | NotificationMessage | ErrorMessage;

export interface MessageHandler<TPayload = unknown> {
  (
    message: RequestMessage<TPayload>,
  ): Promise<ResponseMessage<TPayload> | void>;
}

export interface MessageSubscription {
  unsubscribe(): void;
}

export interface MessageBus {
  publish<T>(message: AnyMessage): void;
  subscribe<T>(
    agent: AgentName,
    handler: MessageHandler<T>,
  ): MessageSubscription;
  request<TRequest, TResponse>(
    from: AgentName,
    to: AgentName,
    payload: TRequest,
  ): Promise<ResponseMessage<TResponse>>;
  onAgentStateChange(
    agent: AgentName,
    callback: (state: AgentState) => void,
  ): () => void;
}

export function createCorrelationId(): string {
  return `${crypto.randomUUID()}-${Date.now()}`;
}

export function createMessage<TPayload>(
  from: AgentName,
  to: AgentName,
  type: MessageType,
  payload: TPayload,
  correlationId?: string,
  traceId?: string,
): AgentMessage<TPayload> {
  return {
    correlationId: correlationId ?? createCorrelationId(),
    from,
    to,
    type,
    payload,
    timestamp: new Date().toISOString(),
    traceId,
  };
}

export function createRequest<TPayload>(
  from: AgentName,
  to: AgentName,
  payload: TPayload,
  correlationId?: string,
  traceId?: string,
  replyTo?: string,
): RequestMessage<TPayload> {
  return {
    correlationId: correlationId ?? createCorrelationId(),
    from,
    to,
    type: "request",
    payload,
    timestamp: new Date().toISOString(),
    traceId,
    replyTo,
  };
}

export function createResponse<TPayload>(
  from: AgentName,
  to: AgentName,
  correlationId: string,
  payload: TPayload,
  success: boolean,
  error?: string,
  traceId?: string,
): ResponseMessage<TPayload> {
  return {
    correlationId,
    from,
    to,
    type: "response",
    payload,
    timestamp: new Date().toISOString(),
    traceId,
    success,
    error,
  };
}

export function createNotification<TPayload>(
  from: AgentName,
  to: AgentName,
  payload: TPayload,
  traceId?: string,
): NotificationMessage<TPayload> {
  return {
    correlationId: createCorrelationId(),
    from,
    to,
    type: "notification",
    payload,
    timestamp: new Date().toISOString(),
    traceId,
  };
}

export function createError(
  from: AgentName,
  to: AgentName,
  message: string,
  code?: string,
  traceId?: string,
): ErrorMessage {
  return {
    correlationId: createCorrelationId(),
    from,
    to,
    type: "error",
    payload: { message, code },
    timestamp: new Date().toISOString(),
    traceId,
  };
}

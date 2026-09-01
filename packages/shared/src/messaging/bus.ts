/**
 * ResolveX In-Memory Message Bus
 * Simple pub/sub with correlation ID tracking and retry logic
 */

import {
  MessageBus,
  AnyMessage,
  RequestMessage,
  ResponseMessage,
  MessageHandler,
  MessageSubscription,
  AgentName,
  AgentState,
  createCorrelationId,
} from "./types";

interface PendingRequest<T = unknown> {
  resolve: (value: ResponseMessage<T>) => void;
  reject: (reason: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
  retries: number;
}

interface Subscriber<T> {
  agent: AgentName;
  handler: MessageHandler<T>;
}

export class InMemoryMessageBus implements MessageBus {
  private subscribers: Map<AgentName, Subscriber<unknown>[]> = new Map();
  private pendingRequests: Map<string, PendingRequest> = new Map();
  private agentStates: Map<AgentName, AgentState> = new Map();
  private stateListeners: Map<AgentName, Set<(state: AgentState) => void>> =
    new Map();

  private readonly maxRetries = 1;
  private readonly baseRetryDelay = 200;
  private readonly requestTimeout = 2000;

  hasSubscribers(agent: AgentName): boolean {
    const subs = this.subscribers.get(agent);
    return Boolean(subs && subs.length > 0);
  }

  publish(message: AnyMessage): void {
    const subscribers = this.subscribers.get(message.to) ?? [];

    for (const subscriber of subscribers) {
      try {
        if (message.type === "request") {
          const result = subscriber.handler(message as RequestMessage<unknown>);
          if (result instanceof Promise) {
            result.catch((err) => {
              console.error(`Handler error for ${message.to}:`, err);
            });
          }
        }
      } catch (err) {
        console.error(`Sync handler error for ${message.to}:`, err);
      }
    }
  }

  subscribe<T>(
    agent: AgentName,
    handler: MessageHandler<T>,
  ): MessageSubscription {
    const existing = this.subscribers.get(agent) ?? [];
    existing.push({ agent, handler: handler as MessageHandler<unknown> });
    this.subscribers.set(agent, existing);

    const subscription: MessageSubscription = {
      unsubscribe: () => {
        const subs = this.subscribers.get(agent) ?? [];
        const idx = subs.findIndex((s) => s.handler === handler);
        if (idx >= 0) {
          subs.splice(idx, 1);
        }
      },
    };
    return subscription;
  }

  async request<TRequest, TResponse>(
    from: AgentName,
    to: AgentName,
    payload: TRequest,
  ): Promise<ResponseMessage<TResponse>> {
    const correlationId = createCorrelationId();

    if (!this.hasSubscribers(to)) {
      return Promise.reject(
        new Error(`No subscribers registered for agent "${to}"`),
      );
    }

    return new Promise((resolve, reject) => {
      const attemptRequest = (retries: number) => {
        const timeout = setTimeout(() => {
          const pending = this.pendingRequests.get(correlationId);
          if (pending) {
            this.pendingRequests.delete(correlationId);

            if (retries < this.maxRetries) {
              const delay = this.baseRetryDelay * Math.pow(2, retries);
              setTimeout(() => attemptRequest(retries + 1), delay);
            } else {
              reject(
                new Error(`Request timeout after ${this.maxRetries} retries`),
              );
            }
          }
        }, this.requestTimeout);

        const pending: PendingRequest = {
          resolve: resolve as (value: ResponseMessage<unknown>) => void,
          reject,
          timeout,
          retries,
        };
        this.pendingRequests.set(correlationId, pending);

        const message: RequestMessage<TRequest> = {
          correlationId,
          from,
          to,
          type: "request",
          payload,
          timestamp: new Date().toISOString(),
        };

        this.publish(message);
      };

      attemptRequest(0);
    });
  }

  handleResponse<T>(response: ResponseMessage<T>): void {
    const pending = this.pendingRequests.get(response.correlationId);
    if (pending) {
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(response.correlationId);

      if (response.success) {
        pending.resolve(response as ResponseMessage<unknown>);
      } else {
        pending.reject(new Error(response.error ?? "Request failed"));
      }
    }
  }

  setAgentState(agent: AgentName, state: AgentState): void {
    const prevState = this.agentStates.get(agent);
    if (prevState === state) return;

    this.agentStates.set(agent, state);

    const listeners = this.stateListeners.get(agent);
    if (listeners) {
      for (const listener of listeners) {
        try {
          listener(state);
        } catch (err) {
          console.error(`State listener error for ${agent}:`, err);
        }
      }
    }
  }

  getAgentState(agent: AgentName): AgentState {
    return this.agentStates.get(agent) ?? "idle";
  }

  onAgentStateChange(
    agent: AgentName,
    callback: (state: AgentState) => void,
  ): () => void {
    const listeners = this.stateListeners.get(agent) ?? new Set();
    listeners.add(callback);
    this.stateListeners.set(agent, listeners);

    return () => {
      listeners.delete(callback);
    };
  }

  shutdown(): void {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error("Message bus shutting down"));
    }
    this.pendingRequests.clear();
    this.subscribers.clear();
    this.stateListeners.clear();
    this.agentStates.clear();
  }
}

const globalForBus = globalThis as unknown as {
  __resolvex_message_bus__: InMemoryMessageBus | undefined;
};

export const messageBus =
  globalForBus.__resolvex_message_bus__ ?? new InMemoryMessageBus();
globalForBus.__resolvex_message_bus__ = messageBus;

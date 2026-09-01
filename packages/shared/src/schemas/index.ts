/**
 * ResolveX shared Zod schemas
 * Runtime validation for all external boundaries
 */

import z from "zod";

// Core domain schemas
export const CustomerSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(255),
  email: z.email(),
  planId: z.string().min(1).max(100),
  status: z.enum(["active", "inactive", "suspended"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const TransactionSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  invoiceId: z.string().min(1).max(100),
  amount: z.number().positive(),
  currency: z.string().length(3),
  status: z.enum(["completed", "pending", "failed", "refunded"]),
  chargedAt: z.string().datetime(),
  metadata: z.record(z.string(), z.unknown()),
});

export const SubscriptionSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid(),
  planId: z.string().min(1).max(100),
  status: z.enum(["active", "cancelled", "past_due", "trialing"]),
  price: z.number().positive(),
  renewalAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const KnowledgeDocumentSchema = z.object({
  id: z.uuid(),
  title: z.string().min(1).max(500),
  source: z.string().min(1).max(255),
  content: z.string().min(1),
  metadata: z.record(z.string(), z.unknown()),
  embedding: z.array(z.number()).optional(),
  createdAt: z.string().datetime(),
});

// Conversation and agent schemas
export const ConversationSchema = z.object({
  id: z.uuid(),
  customerId: z.uuid().nullable().optional(),
  channel: z.enum(["chat", "voice"]),
  status: z.enum(["open", "resolved", "escalated", "closed"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const AgentRunSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  agentName: z.enum(["triage", "billing", "subscription"]),
  input: z.record(z.string(), z.unknown()),
  decision: z.record(z.string(), z.unknown()),
  status: z.enum(["pending", "running", "completed", "failed"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

export const ToolCallSchema = z.object({
  id: z.uuid(),
  agentRunId: z.uuid(),
  toolName: z.string().min(1).max(100),
  arguments: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(["pending", "success", "failed"]),
  latencyMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});

export const VerificationSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  actionType: z.string().min(1).max(100),
  expectedState: z.record(z.string(), z.unknown()),
  observedState: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(["pending", "passed", "failed"]),
  createdAt: z.string().datetime(),
});

export const HandoffSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  reason: z.string().min(1).max(1000),
  evidence: z.record(z.string(), z.unknown()),
  recommendedAction: z.string().min(1).max(500),
  status: z.enum(["pending", "accepted", "completed"]),
  createdAt: z.string().datetime(),
});

export const EvaluationSchema = z.object({
  id: z.uuid(),
  caseId: z.string().min(1).max(100),
  input: z.record(z.string(), z.unknown()),
  expectedOutcome: z.record(z.string(), z.unknown()),
  actualOutcome: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(["pending", "passed", "failed"]),
  createdAt: z.string().datetime(),
});

// Agent workflow schemas
export const IntentSchema = z.object({
  type: z.enum(["billing", "subscription", "general"]),
  confidence: z.number().min(0).max(1),
  entities: z.record(z.string(), z.unknown()),
});

export const TaskSchema = z.object({
  id: z.uuid(),
  agent: z.enum(["triage", "billing", "subscription"]),
  type: z.string().min(1).max(100),
  payload: z.record(z.string(), z.unknown()),
  priority: z.enum(["high", "normal", "low"]),
});

export const TriageResultSchema = z.object({
  intents: z.array(IntentSchema),
  tasks: z.array(TaskSchema),
  summary: z.string().min(1).max(500),
});

export const BillingDecisionSchema = z.object({
  action: z.enum(["refund", "investigate", "escalate", "none"]),
  amount: z.number().positive().optional(),
  evidence: z.array(z.string()),
  policyReferences: z.array(z.string()),
  requiresApproval: z.boolean(),
});

export const SubscriptionDecisionSchema = z.object({
  action: z.enum([
    "upgrade",
    "downgrade",
    "cancel",
    "investigate",
    "escalate",
    "none",
  ]),
  targetPlanId: z.string().optional(),
  eligibility: z.enum(["eligible", "ineligible", "requires_review"]),
  evidence: z.array(z.string()),
  policyReferences: z.array(z.string()),
  requiresApproval: z.boolean(),
});

export const AutonomyGateInputSchema = z.object({
  agent: z.enum(["triage", "billing", "subscription"]),
  action: z.string().min(1).max(100),
  evidence: z.array(z.string()),
  policyReferences: z.array(z.string()),
  permission: z.string().min(1).max(100),
  risk: z.enum(["low", "medium", "high"]),
});

export const AutonomyGateResultSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().min(1).max(500),
  requiredApprovals: z.array(z.string()),
});

// API schemas
// Use permissive UUID pattern for customerId since DB has version-0 UUIDs
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const ChatRequestSchema = z.object({
  message: z.string().min(1).max(4000),
  conversationId: z.uuid().optional(),
  customerId: z.string().regex(uuidPattern).optional(),
  channel: z.enum(["chat", "voice"]),
});

export const ChatResponseSchema = z.object({
  conversationId: z.uuid(),
  message: z.string().min(1),
  status: z.enum(["processing", "completed", "escalated", "error"]),
  traceId: z.uuid().optional(),
});

export const VoiceConfigSchema = z.object({
  agentId: z.string().min(1),
  voiceId: z.string().min(1),
  model: z.string().min(1),
});

// Trace schemas
export const TraceEventSchema = z.object({
  id: z.uuid(),
  agentRunId: z.uuid(),
  timestamp: z.string().datetime(),
  type: z.enum([
    "agent_start",
    "agent_decision",
    "tool_call",
    "tool_result",
    "verification",
    "handoff",
    "error",
  ]),
  label: z.string().min(1).max(200),
  data: z.record(z.string(), z.unknown()),
  status: z.enum(["pending", "success", "failed", "warning"]),
});

export const AgentTraceSchema = z.object({
  conversationId: z.uuid(),
  events: z.array(TraceEventSchema),
  status: z.enum(["running", "completed", "escalated", "error"]),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

// Type exports inferred from schemas
export type Customer = z.infer<typeof CustomerSchema>;
export type Transaction = z.infer<typeof TransactionSchema>;
export type Subscription = z.infer<typeof SubscriptionSchema>;
export type KnowledgeDocument = z.infer<typeof KnowledgeDocumentSchema>;
export type Conversation = z.infer<typeof ConversationSchema>;
export type AgentRun = z.infer<typeof AgentRunSchema>;
export type ToolCall = z.infer<typeof ToolCallSchema>;
export type Verification = z.infer<typeof VerificationSchema>;
export type Handoff = z.infer<typeof HandoffSchema>;
export type Evaluation = z.infer<typeof EvaluationSchema>;
export type Intent = z.infer<typeof IntentSchema>;
export type Task = z.infer<typeof TaskSchema>;
export type TriageResult = z.infer<typeof TriageResultSchema>;
export type BillingDecision = z.infer<typeof BillingDecisionSchema>;
export type SubscriptionDecision = z.infer<typeof SubscriptionDecisionSchema>;
export type AutonomyGateInput = z.infer<typeof AutonomyGateInputSchema>;
export type AutonomyGateResult = z.infer<typeof AutonomyGateResultSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type ChatResponse = z.infer<typeof ChatResponseSchema>;
export type VoiceConfig = z.infer<typeof VoiceConfigSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type AgentTrace = z.infer<typeof AgentTraceSchema>;

export interface BillingTask {
  type: "duplicate_charge" | "refund_inquiry" | string;
  payload: {
    customerId: string;
    amount?: number;
    invoiceId?: string;
    message?: string;
    [key: string]: unknown;
  };
}

export interface SubscriptionTask {
  type: "upgrade" | "downgrade" | "cancel" | "change_plan" | string;
  payload: {
    customerId: string;
    targetPlanId?: string;
    message?: string;
    [key: string]: unknown;
  };
}

export interface SpecialistDecision {
  agent:
    "triage" | "billing" | "subscription" | "verification" | "orchestrator";
  decision: BillingDecision | SubscriptionDecision;
  tasks: Task[];
}

export interface OrchestratorResult {
  status: "completed" | "escalated" | "error";
  decisions: SpecialistDecision[];
  traceId: string;
  conversationId: string;
}

export interface AgentContext {
  conversationId: string;
  customerId: string | null;
  channel: "chat" | "voice";
  traceId: string;
}

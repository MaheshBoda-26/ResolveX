/**
 * ResolveX shared constants
 * Configuration values used across the application
 */

// Autonomy thresholds
export const AUTONOMY_THRESHOLDS = {
  REFUND_AUTO_MAX: 50, // USD - auto-refund up to this amount
  REFUND_REVIEW_MAX: 500, // USD - requires human review above this
  SUBSCRIPTION_CHANGE_AUTO: true, // plan changes within same tier
} as const;

// Risk levels
export const RISK_LEVELS = {
  LOW: "low",
  MEDIUM: "medium",
  HIGH: "high",
} as const;

export type RiskLevel = (typeof RISK_LEVELS)[keyof typeof RISK_LEVELS];

// Agent names
export const AGENT_NAMES = {
  TRIAGE: "triage",
  BILLING: "billing",
  SUBSCRIPTION: "subscription",
} as const;

export type AgentName = (typeof AGENT_NAMES)[keyof typeof AGENT_NAMES];

// Intent types
export const INTENT_TYPES = {
  BILLING: "billing",
  SUBSCRIPTION: "subscription",
  GENERAL: "general",
} as const;

export type IntentType = (typeof INTENT_TYPES)[keyof typeof INTENT_TYPES];

// Conversation channels
export const CHANNELS = {
  CHAT: "chat",
  VOICE: "voice",
} as const;

export type Channel = (typeof CHANNELS)[keyof typeof CHANNELS];

// Conversation statuses
export const CONVERSATION_STATUSES = {
  OPEN: "open",
  RESOLVED: "resolved",
  ESCALATED: "escalated",
  CLOSED: "closed",
} as const;

export type ConversationStatus =
  (typeof CONVERSATION_STATUSES)[keyof typeof CONVERSATION_STATUSES];

// Tool names (Freshworks actions/MCP)
export const TOOL_NAMES = {
  GET_CUSTOMER: "get_customer",
  GET_TRANSACTIONS: "get_transactions",
  GET_SUBSCRIPTION: "get_subscription",
  CHECK_POLICY: "check_policy",
  ISSUE_REFUND: "issue_refund",
  UPGRADE_SUBSCRIPTION: "upgrade_subscription",
  VERIFY_CUSTOMER_STATE: "verify_customer_state",
} as const;

export type ToolName = (typeof TOOL_NAMES)[keyof typeof TOOL_NAMES];

// Verification statuses
export const VERIFICATION_STATUSES = {
  PENDING: "pending",
  PASSED: "passed",
  FAILED: "failed",
} as const;

export type VerificationStatus =
  (typeof VERIFICATION_STATUSES)[keyof typeof VERIFICATION_STATUSES];

// Handoff reasons
export const HANDOFF_REASONS = {
  HIGH_VALUE_REFUND: "high_value_refund",
  POLICY_EXCEPTION: "policy_exception",
  AMBIGUOUS_IDENTITY: "ambiguous_identity",
  CONFLICTING_ACCOUNT_STATE: "conflicting_account_state",
  UNVERIFIED_MUTATION: "unverified_mutation",
  UNSUPPORTED_WORKFLOW: "unsupported_workflow",
  TOOL_FAILURE: "tool_failure",
  MISSING_INFORMATION: "missing_information",
} as const;

export type HandoffReason =
  (typeof HANDOFF_REASONS)[keyof typeof HANDOFF_REASONS];

// Trace event types
export const TRACE_EVENT_TYPES = {
  AGENT_START: "agent_start",
  AGENT_DECISION: "agent_decision",
  TOOL_CALL: "tool_call",
  TOOL_RESULT: "tool_result",
  VERIFICATION: "verification",
  HANDOFF: "handoff",
  ERROR: "error",
} as const;

export type TraceEventType =
  (typeof TRACE_EVENT_TYPES)[keyof typeof TRACE_EVENT_TYPES];

// Default pagination
export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
} as const;

// Voice config defaults
export const VOICE_DEFAULTS = {
  MODEL: "eleven_turbo_v2_5",
  VOICE_ID: "default",
} as const;

// Demo customer IDs for testing
export const DEMO_CUSTOMERS = {
  PRIMARY: "00000000-0000-0000-0000-000000000001",
  SECONDARY: "00000000-0000-0000-0000-000000000002",
} as const;

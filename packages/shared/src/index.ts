/**
 * ResolveX Shared Package
 * Single source of truth for types, schemas, and constants
 */

// Export types from schemas (single source of truth)
export * from "./schemas/index.js";

// Export constants separately (not types)
export {
  AUTONOMY_THRESHOLDS,
  RISK_LEVELS,
  AGENT_NAMES,
  INTENT_TYPES,
  CHANNELS,
  CONVERSATION_STATUSES,
  TOOL_NAMES,
  VERIFICATION_STATUSES,
  HANDOFF_REASONS,
  TRACE_EVENT_TYPES,
  PAGINATION,
  VOICE_DEFAULTS,
  DEMO_CUSTOMERS,
} from "./constants/index.js";
export type {
  RiskLevel,
  IntentType,
  Channel,
  ConversationStatus,
  ToolName,
  VerificationStatus,
  HandoffReason,
  TraceEventType,
} from "./constants/index.js";
export type { AgentName } from "./constants/index.js";

// Export messaging for agent communication
export * from "./messaging/index.js";

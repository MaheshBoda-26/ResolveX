import {
  HandoffReason,
  HANDOFF_REASONS,
  AUTONOMY_THRESHOLDS,
} from "@resolvex/shared";
import type { BillingDecision, SubscriptionDecision } from "@resolvex/shared";

export interface EscalationContext {
  customerId?: string;
  refundAmount?: number;
  actionType?: "refund" | "upgrade" | "downgrade" | "cancel" | "investigate";
  policyException?: string;
  identityVerified?: boolean;
  accountStateConflict?: string;
  mutationVerified?: boolean;
  workflowSupported?: boolean;
  toolFailed?: boolean;
  toolName?: string;
  isIdempotent?: boolean;
  missingFields?: string[];
}

export interface EscalationDecision {
  shouldEscalate: boolean;
  reason?: HandoffReason;
  details?: string;
}

function isHighValueRefund(amount: number): boolean {
  return amount > AUTONOMY_THRESHOLDS.REFUND_REVIEW_MAX;
}

function hasPolicyException(
  decision: BillingDecision | SubscriptionDecision,
  exception?: string,
): boolean {
  if (exception) return true;
  if (
    decision.action === "escalate" &&
    decision.evidence.some((e) => e.toLowerCase().includes("exception"))
  ) {
    return true;
  }
  return false;
}

function hasAmbiguousIdentity(identityVerified: boolean | undefined): boolean {
  return identityVerified === false;
}

function hasConflictingAccountState(conflict: string | undefined): boolean {
  return !!conflict;
}

function hasUnverifiedMutation(mutationVerified: boolean | undefined): boolean {
  return mutationVerified === false;
}

function hasUnsupportedWorkflow(
  workflowSupported: boolean | undefined,
): boolean {
  return workflowSupported === false;
}

function hasToolFailure(
  toolFailed: boolean | undefined,
  isIdempotent: boolean | undefined,
): boolean {
  return toolFailed === true && isIdempotent !== true;
}

function hasMissingInformation(missingFields: string[] | undefined): boolean {
  return !!(missingFields && missingFields.length > 0);
}

export function checkEscalationRules(
  decision: BillingDecision | SubscriptionDecision,
  context: EscalationContext,
): EscalationDecision {
  if (
    context.refundAmount !== undefined &&
    isHighValueRefund(context.refundAmount)
  ) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.HIGH_VALUE_REFUND,
      details: `Refund amount $${context.refundAmount} exceeds autonomous threshold of $${AUTONOMY_THRESHOLDS.REFUND_REVIEW_MAX}`,
    };
  }

  if (hasPolicyException(decision, context.policyException)) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.POLICY_EXCEPTION,
      details:
        context.policyException ||
        "Policy exception detected in decision evidence",
    };
  }

  if (hasAmbiguousIdentity(context.identityVerified)) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.AMBIGUOUS_IDENTITY,
      details: "Customer identity could not be verified",
    };
  }

  if (hasConflictingAccountState(context.accountStateConflict)) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.CONFLICTING_ACCOUNT_STATE,
      details:
        context.accountStateConflict || "Conflicting account state detected",
    };
  }

  if (hasUnverifiedMutation(context.mutationVerified)) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.UNVERIFIED_MUTATION,
      details: "Mutation outcome could not be verified",
    };
  }

  if (hasUnsupportedWorkflow(context.workflowSupported)) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.UNSUPPORTED_WORKFLOW,
      details: "Requested workflow is not supported for autonomous execution",
    };
  }

  if (hasToolFailure(context.toolFailed, context.isIdempotent)) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.TOOL_FAILURE,
      details: `Non-idempotent tool failure: ${context.toolName || "unknown tool"}`,
    };
  }

  if (hasMissingInformation(context.missingFields)) {
    return {
      shouldEscalate: true,
      reason: HANDOFF_REASONS.MISSING_INFORMATION,
      details: `Missing required information: ${context.missingFields?.join(", ")}`,
    };
  }

  return { shouldEscalate: false };
}

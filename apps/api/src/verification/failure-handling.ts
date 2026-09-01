import { verifyRefund, verifyUpgrade, verifyCustomerState } from "./verify";
import { db } from "../db/client";
import { handoffs } from "../db/schema";
import type { VerificationResult } from "./verify";

export type FailureAction = "retry" | "verify" | "escalate";

export interface FailureHandlingResult {
  action: FailureAction;
  reason: string;
  verificationResult?: VerificationResult;
}

const IDEMPOTENT_TOOLS = new Set([
  "issueRefund",
  "upgradeSubscription",
  "getCustomer",
  "getTransactions",
  "getSubscription",
  "verifyCustomerState",
  "checkPolicy",
]);

const NON_IDEMPOTENT_TOOLS = new Set([
  "cancelSubscription",
  "createSubscription",
  "chargeCustomer",
]);

export function isIdempotentTool(toolName: string): boolean {
  return IDEMPOTENT_TOOLS.has(toolName);
}

export function isNonIdempotentTool(toolName: string): boolean {
  return NON_IDEMPOTENT_TOOLS.has(toolName);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function handleMutationFailure(
  toolName: string,
  error: Error,
  args: Record<string, unknown>,
  agentRunId: string,
  conversationId: string,
  attempt: number = 1,
): Promise<FailureHandlingResult> {
  const maxRetries = 3;

  if (isNonIdempotentTool(toolName)) {
    return {
      action: "escalate",
      reason: `Non-idempotent tool ${toolName} failed: ${error.message}. Cannot safely retry.`,
    };
  }

  if (!isIdempotentTool(toolName)) {
    return {
      action: "escalate",
      reason: `Unknown tool ${toolName} failed: ${error.message}. Escalating for manual review.`,
    };
  }

  if (attempt >= maxRetries) {
    return {
      action: "escalate",
      reason: `Max retries (${maxRetries}) exceeded for ${toolName}. Last error: ${error.message}`,
    };
  }

  const errorMessage = error.message.toLowerCase();

  const isTimeout =
    errorMessage.includes("timeout") || errorMessage.includes("etimedout");
  const isNetworkError =
    errorMessage.includes("network") ||
    errorMessage.includes("fetch") ||
    errorMessage.includes("econnrefused");
  const isRateLimited =
    errorMessage.includes("429") || errorMessage.includes("rate limit");
  const isServerError =
    errorMessage.includes("500") ||
    errorMessage.includes("502") ||
    errorMessage.includes("503") ||
    errorMessage.includes("504");
  const isUnknownOutcome =
    errorMessage.includes("unknown") ||
    errorMessage.includes("no response") ||
    errorMessage.includes("empty");

  if (isTimeout || isNetworkError || isRateLimited || isServerError) {
    const backoffMs = Math.min(1000 * Math.pow(2, attempt), 10000);
    await sleep(backoffMs);

    return {
      action: "retry",
      reason: `Transient error (attempt ${attempt}/${maxRetries}): ${error.message}. Retrying after ${backoffMs}ms.`,
    };
  }

  if (isUnknownOutcome) {
    let verificationResult: VerificationResult | undefined;

    if (toolName === "issueRefund") {
      verificationResult = await verifyRefund(agentRunId, conversationId, {
        customerId: args["customerId"] as string,
        expectedRefundAmount: args["amount"] as number,
        invoiceId: args["invoiceId"] as string,
      });
    } else if (toolName === "upgradeSubscription") {
      verificationResult = await verifyUpgrade(agentRunId, conversationId, {
        customerId: args["customerId"] as string,
        expectedPlanId: args["targetPlanId"] as string,
      });
    } else if (toolName === "verifyCustomerState") {
      verificationResult = await verifyCustomerState(
        agentRunId,
        conversationId,
        {
          customerId: args["customerId"] as string,
          expectedState: args["expectedState"] as Record<string, unknown>,
        },
      );
    }

    if (verificationResult?.verified) {
      return {
        action: "verify",
        reason: `Verification confirms action succeeded despite error: ${error.message}`,
        verificationResult,
      };
    }

    return {
      action: "retry",
      reason: `Unknown outcome for ${toolName}. Verification failed or incomplete. Retrying (attempt ${attempt}/${maxRetries}).`,
    };
  }

  return {
    action: "escalate",
    reason: `Non-retryable error for ${toolName}: ${error.message}. Requires manual intervention.`,
  };
}

export async function escalateToHandoff(
  conversationId: string,
  reason: string,
  evidence: Record<string, unknown>,
  recommendedAction: string,
): Promise<void> {
  await db.insert(handoffs).values({
    conversationId: conversationId as any,
    reason,
    evidence: evidence as any,
    recommendedAction,
    status: "pending",
  } as any);
}

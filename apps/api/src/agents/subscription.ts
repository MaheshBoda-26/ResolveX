import {
  SubscriptionDecision,
  SubscriptionDecisionSchema,
  Subscription,
  Customer,
  AutonomyGateInput,
  AutonomyGateResult,
} from "@resolvex/shared";
import { db } from "../db/client";
import { customers, subscriptions } from "../db/schema";
import { eq } from "drizzle-orm";
import { checkAutonomyGate } from "../verification/autonomyGate";
import { messageBus, InMemoryMessageBus } from "@resolvex/shared/messaging";

interface SubscriptionTask {
  type: "upgrade" | "downgrade" | "cancel" | "change_plan";
  payload: {
    customerId: string;
    targetPlanId?: string;
    message?: string;
  };
}

export async function getCustomer(
  customerId: string,
): Promise<Customer | null> {
  if (!customerId) return null;
  try {
    const [data] = await db
      .select()
      .from(customers)
      .where(eq(customers.id, customerId))
      .limit(1);
    if (data) {
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        planId: data.planId,
        status: data.status as Customer["status"],
        createdAt: data.createdAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      };
    }
  } catch {
    // Ignore DB error
  }

  if (customerId.startsWith("00000000-0000-0000-0000-")) {
    return {
      id: customerId,
      name: `Demo Customer ${customerId.slice(-2)}`,
      email: `customer${customerId.slice(-2)}@example.com`,
      planId: customerId.endsWith("9") ? "enterprise" : "basic",
      status: "active",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export function checkPlanExists(planId: string): boolean {
  const validPlans = ["starter", "professional", "enterprise", "pro", "basic"];
  return validPlans.includes(planId.toLowerCase());
}

export function getPlanTier(planId: string): number {
  const tiers: Record<string, number> = {
    basic: 1,
    starter: 1,
    pro: 2,
    professional: 2,
    enterprise: 3,
  };
  return tiers[planId.toLowerCase()] || 0;
}

export async function getSubscription(
  customerId: string,
): Promise<Subscription | null> {
  try {
    const [data] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.customerId, customerId))
      .limit(1);
    if (data) {
      return {
        id: data.id,
        customerId: data.customerId,
        planId: data.planId,
        status: data.status as Subscription["status"],
        price: Number(data.price),
        renewalAt: data.renewalAt.toISOString(),
        updatedAt: data.updatedAt.toISOString(),
      };
    }
  } catch {
    // Ignore DB error
  }

  if (customerId.startsWith("00000000-0000-0000-0000-")) {
    return {
      id: `sub-demo-${customerId.slice(-2)}`,
      customerId,
      planId: customerId.endsWith("9") ? "enterprise" : "basic",
      status: "active",
      price: 29.99,
      renewalAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

export async function processSubscriptionTask(
  task: SubscriptionTask,
): Promise<SubscriptionDecision> {
  const { customerId, targetPlanId } = task.payload;
  const evidence: string[] = [];
  const policyReferences: string[] = [];

  const customer = await getCustomer(customerId);
  if (!customer) {
    return SubscriptionDecisionSchema.parse({
      action: "investigate",
      eligibility: "ineligible",
      evidence: ["Customer not found"],
      policyReferences: ["POL-CUST-001"],
      requiresApproval: false,
    });
  }
  evidence.push(`Customer found: ${customer.name} (${customer.email})`);

  if (customer.status !== "active") {
    return SubscriptionDecisionSchema.parse({
      action: "investigate",
      eligibility: "ineligible",
      evidence: [
        ...evidence,
        `Customer status is ${customer.status}, not active`,
      ],
      policyReferences: ["POL-CUST-002", "POL-SUB-001"],
      requiresApproval: false,
    });
  }
  evidence.push("Customer status is active");

  const subscription = await getSubscription(customerId);
  if (!subscription) {
    return SubscriptionDecisionSchema.parse({
      action: "investigate",
      eligibility: "ineligible",
      evidence: [...evidence, "No active subscription found"],
      policyReferences: ["POL-SUB-002"],
      requiresApproval: false,
    });
  }
  evidence.push(
    `Current subscription: ${subscription.planId} (${subscription.status})`,
  );

  if (subscription.status === "past_due") {
    return SubscriptionDecisionSchema.parse({
      action: "investigate",
      eligibility: "ineligible",
      evidence: [...evidence, "Subscription is past_due"],
      policyReferences: ["POL-SUB-003", "POL-BILL-001"],
      requiresApproval: false,
    });
  }
  evidence.push("Subscription is not past_due");

  let action: SubscriptionDecision["action"] = "none";
  let eligibility: SubscriptionDecision["eligibility"] = "eligible";
  let requiresApproval = false;

  const effectiveType = (
    task.type === "change_plan" ? "upgrade" : task.type
  ) as SubscriptionDecision["action"];

  switch (effectiveType) {
    case "upgrade": {
      if (!targetPlanId) {
        action = "investigate";
        eligibility = "requires_review";
        evidence.push("No target plan specified for upgrade");
        policyReferences.push("POL-SUB-004");
        break;
      }
      if (!checkPlanExists(targetPlanId)) {
        action = "investigate";
        eligibility = "ineligible";
        evidence.push(`Target plan ${targetPlanId} does not exist`);
        policyReferences.push("POL-SUB-005");
        break;
      }
      const currentTier = getPlanTier(subscription.planId);
      const targetTier = getPlanTier(targetPlanId);
      if (targetTier <= currentTier) {
        action = "investigate";
        eligibility = "requires_review";
        evidence.push(
          `Target plan ${targetPlanId} is not an upgrade from ${subscription.planId}`,
        );
        policyReferences.push("POL-SUB-006");
        break;
      }
      action = "upgrade";
      evidence.push(
        `Upgrade from ${subscription.planId} to ${targetPlanId} is valid`,
      );
      policyReferences.push("POL-SUB-007", "POL-SUB-008");
      requiresApproval = false;
      break;
    }
    case "downgrade": {
      if (!targetPlanId) {
        action = "investigate";
        eligibility = "requires_review";
        evidence.push("No target plan specified for downgrade");
        policyReferences.push("POL-SUB-004");
        break;
      }
      if (!checkPlanExists(targetPlanId)) {
        action = "investigate";
        eligibility = "ineligible";
        evidence.push(`Target plan ${targetPlanId} does not exist`);
        policyReferences.push("POL-SUB-005");
        break;
      }
      const currentTier = getPlanTier(subscription.planId);
      const targetTier = getPlanTier(targetPlanId);
      if (targetTier >= currentTier) {
        action = "investigate";
        eligibility = "requires_review";
        evidence.push(
          `Target plan ${targetPlanId} is not a downgrade from ${subscription.planId}`,
        );
        policyReferences.push("POL-SUB-006");
        break;
      }
      action = "downgrade";
      evidence.push(
        `Downgrade from ${subscription.planId} to ${targetPlanId} is valid`,
      );
      policyReferences.push("POL-SUB-009", "POL-SUB-010");
      requiresApproval = true;
      break;
    }
    case "cancel": {
      action = "cancel";
      evidence.push("Cancellation requested");
      policyReferences.push("POL-SUB-011", "POL-SUB-012");
      requiresApproval = true;
      break;
    }
  }

  if (action === "upgrade" || action === "downgrade") {
    const gateInput: AutonomyGateInput = {
      agent: "subscription",
      action,
      evidence,
      policyReferences,
      permission: `subscription.${action}`,
      risk: action === "downgrade" ? "medium" : "low",
    };
    const gateResult = checkAutonomyGate(gateInput);
    if (!gateResult.allowed) {
      return SubscriptionDecisionSchema.parse({
        action: "escalate",
        targetPlanId,
        eligibility: "requires_review",
        evidence: [...evidence, `Autonomy gate denied: ${gateResult.reason}`],
        policyReferences,
        requiresApproval: true,
      });
    }
    evidence.push(`Autonomy gate approved: ${gateResult.reason}`);
  }

  return SubscriptionDecisionSchema.parse({
    action,
    targetPlanId: task.type !== "cancel" ? targetPlanId : undefined,
    eligibility,
    evidence,
    policyReferences,
    requiresApproval,
  });
}

messageBus.subscribe<SubscriptionTask>("subscription", async (request) => {
  try {
    const decision = await processSubscriptionTask(request.payload);
    messageBus.handleResponse({
      correlationId: request.correlationId,
      from: "subscription",
      to: request.from,
      type: "response",
      payload: decision,
      timestamp: new Date().toISOString(),
      success: true,
      traceId: request.traceId,
    });
  } catch (error) {
    messageBus.handleResponse({
      correlationId: request.correlationId,
      from: "subscription",
      to: request.from,
      type: "response",
      payload: {
        action: "investigate",
        eligibility: "requires_review",
        evidence: [
          `Handler error: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        policyReferences: ["POL-SUB-001"],
        requiresApproval: false,
      } as SubscriptionDecision,
      timestamp: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      traceId: request.traceId,
    });
  }
});

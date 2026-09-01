import {
  TriageResult,
  Task,
  ChatRequest,
  BillingDecision,
  SubscriptionDecision,
  AgentName,
} from "@resolvex/shared";
import { messageBus, InMemoryMessageBus } from "@resolvex/shared/messaging";
import { verifyRefund, verifyUpgrade } from "../verification/verify";
import { withTracing, addSpanEvent } from "../lib/telemetry.js";
import { createAgentLogger, logAgentOperation } from "../lib/logging.js";

export interface AgentContext {
  conversationId: string;
  customerId: string | null;
  channel: "chat" | "voice";
  traceId: string;
}

export interface SpecialistDecision {
  agent: AgentName;
  decision: BillingDecision | SubscriptionDecision;
  tasks: Task[];
}

export interface OrchestratorResult {
  status: "completed" | "escalated" | "error";
  decisions: SpecialistDecision[];
  traceId: string;
  conversationId: string;
}

async function routeToBillingAgent(
  context: AgentContext,
  task: Task,
): Promise<BillingDecision> {
  return withTracing("routeToBillingAgent", async (span) => {
    span.setAttribute("task.type", task.type);
    span.setAttribute("task.agent", "billing");
    span.setAttribute("conversationId", context.conversationId);

    const logger = createAgentLogger("billing", context.traceId);
    logAgentOperation(logger, "routeToBillingAgent", "started");

    if (!context.customerId) {
      addSpanEvent("no_customer_id");
      logAgentOperation(logger, "routeToBillingAgent", "completed", {
        result: "no_customer_id",
      });
      return {
        action: "investigate",
        evidence: ["No customer ID provided"],
        policyReferences: ["POL-CUST-001"],
        requiresApproval: false,
      };
    }

    const billingMsg =
      (task.payload?.["message"] as string | undefined)?.toLowerCase() ?? "";
    const isDuplicate =
      billingMsg.includes("duplicate") ||
      billingMsg.includes("twice") ||
      task.type === "duplicate_charge";

    const billingTask = {
      type: (isDuplicate ? "duplicate_charge" : "refund_inquiry") as
        | "duplicate_charge"
        | "refund_inquiry",
      payload: {
        customerId: context.customerId,
        amount: task.payload?.["amount"] as number | undefined,
        invoiceId: task.payload?.["invoiceId"] as string | undefined,
        message: task.payload?.["message"] as string | undefined,
      },
    };

    try {
      if (messageBus.hasSubscribers("billing")) {
        const response = (await messageBus.request(
          "orchestrator" as const,
          "billing" as const,
          billingTask,
        )) as { payload: BillingDecision };
        addSpanEvent("billing_agent_response_received");
        logAgentOperation(logger, "routeToBillingAgent", "completed", {
          action: response.payload.action,
        });
        return response.payload;
      }
      const { processBillingTask } = await import("./billing.js");
      const decision = await processBillingTask(billingTask);
      logAgentOperation(logger, "routeToBillingAgent", "completed", {
        action: decision.action,
      });
      return decision;
    } catch (error) {
      addSpanEvent("billing_agent_error", {
        error: error instanceof Error ? error.message : "Unknown",
      });
      logAgentOperation(logger, "routeToBillingAgent", "failed", {
        error: error instanceof Error ? error.message : "Unknown",
      });
      return {
        action: "investigate",
        evidence: [
          `Billing agent unavailable: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        policyReferences: ["POL-BILL-004"],
        requiresApproval: false,
      };
    }
  });
}

async function routeToSubscriptionAgent(
  context: AgentContext,
  task: Task,
): Promise<SubscriptionDecision> {
  return withTracing("routeToSubscriptionAgent", async (span) => {
    span.setAttribute("task.type", task.type);
    span.setAttribute("task.agent", "subscription");
    span.setAttribute("conversationId", context.conversationId);

    const logger = createAgentLogger("subscription", context.traceId);
    logAgentOperation(logger, "routeToSubscriptionAgent", "started");

    if (!context.customerId) {
      addSpanEvent("no_customer_id");
      logAgentOperation(logger, "routeToSubscriptionAgent", "completed", {
        result: "no_customer_id",
      });
      return {
        action: "investigate",
        targetPlanId: undefined,
        eligibility: "requires_review",
        evidence: ["No customer ID provided"],
        policyReferences: ["POL-CUST-001"],
        requiresApproval: false,
      };
    }

    const msgLower =
      (task.payload?.["message"] as string | undefined)?.toLowerCase() ?? "";
    const isDowngrade =
      msgLower.includes("downgrade") || task.type === "downgrade";
    const isCancel =
      msgLower.includes("cancel") || task.type === "cancel";

    const subscriptionTask = {
      type: (isDowngrade
        ? "downgrade"
        : isCancel
          ? "cancel"
          : task.type === "investigate_subscription_issue"
            ? "change_plan"
            : task.type) as "upgrade" | "downgrade" | "cancel" | "change_plan",
      payload: {
        customerId: context.customerId,
        targetPlanId:
          (task.payload?.["targetPlanId"] as string | undefined) ??
          (isDowngrade ? (msgLower.includes("pro") ? "pro" : "professional") : undefined),
        message: task.payload?.["message"] as string | undefined,
      },
    };

    try {
      if (messageBus.hasSubscribers("subscription")) {
        const response = (await messageBus.request(
          "orchestrator" as const,
          "subscription" as const,
          subscriptionTask,
        )) as { payload: SubscriptionDecision };
        addSpanEvent("subscription_agent_response_received");
        logAgentOperation(logger, "routeToSubscriptionAgent", "completed", {
          action: response.payload.action,
        });
        return response.payload;
      }
      const { processSubscriptionTask } = await import("./subscription.js");
      const decision = await processSubscriptionTask(subscriptionTask);
      logAgentOperation(logger, "routeToSubscriptionAgent", "completed", {
        action: decision.action,
      });
      return decision;
    } catch (error) {
      addSpanEvent("subscription_agent_error", {
        error: error instanceof Error ? error.message : "Unknown",
      });
      logAgentOperation(logger, "routeToSubscriptionAgent", "failed", {
        error: error instanceof Error ? error.message : "Unknown",
      });
      return {
        action: "investigate",
        targetPlanId: undefined,
        eligibility: "requires_review",
        evidence: [
          `Subscription agent unavailable: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
        policyReferences: ["POL-SUB-001"],
        requiresApproval: false,
      };
    }
  });
}

export async function orchestrateWorkflow(
  triageResult: TriageResult,
  request: ChatRequest,
  context: AgentContext,
): Promise<OrchestratorResult> {
  return withTracing("orchestrateWorkflow", async (span) => {
    span.setAttribute("conversationId", context.conversationId);
    span.setAttribute("traceId", context.traceId);
    span.setAttribute("taskCount", triageResult.tasks.length);

    const logger = createAgentLogger("orchestrator", context.traceId);
    logAgentOperation(logger, "orchestrateWorkflow", "started", {
      taskCount: triageResult.tasks.length,
    });

    const decisions: SpecialistDecision[] = [];

    for (const task of triageResult.tasks) {
      if (task.agent === "billing") {
        const decision = await routeToBillingAgent(context, task);
        decisions.push({
          agent: "billing",
          decision,
          tasks: [task],
        });

        if (decision.action === "refund" && context.customerId) {
          try {
            await withTracing("verifyRefund", async (verifySpan) => {
              verifySpan.setAttribute("conversationId", context.conversationId);
              verifySpan.setAttribute("traceId", context.traceId);
              verifySpan.setAttribute(
                "expectedRefundAmount",
                decision.amount ?? 0,
              );

              await verifyRefund(context.traceId, context.conversationId, {
                customerId: context.customerId as string,
                expectedRefundAmount: decision.amount ?? 0,
                invoiceId: (task.payload?.["invoiceId"] as string) ?? "",
              });
            });
          } catch (verifyErr) {
            logger.warn({ error: verifyErr }, "Refund verification check skipped or failed");
          }
        }
      } else if (task.agent === "subscription") {
        const decision = await routeToSubscriptionAgent(context, task);
        decisions.push({
          agent: "subscription",
          decision,
          tasks: [task],
        });

        if (
          decision.action === "upgrade" &&
          decision.targetPlanId &&
          context.customerId
        ) {
          try {
            await withTracing("verifyUpgrade", async (verifySpan) => {
              verifySpan.setAttribute("conversationId", context.conversationId);
              verifySpan.setAttribute("traceId", context.traceId);
              verifySpan.setAttribute(
                "expectedPlanId",
                decision.targetPlanId ?? "",
              );

              const { createAgentRun: createTraceRun } =
                await import("../traces/repository");
              const verificationRun = await createTraceRun({
                conversationId: context.conversationId,
                agentName: "verification",
                input: {
                  action: "verifyUpgrade",
                  expectedPlanId: decision.targetPlanId,
                },
                decision: {},
                status: "running",
                startedAt: new Date(),
                completedAt: null,
              });
              await verifyUpgrade(verificationRun.id, context.conversationId, {
                customerId: context.customerId as string,
                expectedPlanId: decision.targetPlanId as string,
              });
              await import("../traces/repository").then((m) =>
                m.updateAgentRunStatus(
                  verificationRun.id,
                  "completed",
                  new Date(),
                ),
              );
            });
          } catch (verifyErr) {
            logger.warn({ error: verifyErr }, "Upgrade verification check skipped or failed");
          }
        }
      }
    }

    const hasEscalation =
      decisions.some(
        (d) =>
          d.decision.requiresApproval ||
          d.decision.action === "escalate" ||
          d.decision.action === "downgrade" ||
          d.decision.action === "cancel" ||
          (!context.customerId && d.decision.action === "investigate"),
      ) || decisions.length > 1;
    addSpanEvent("orchestration_completed", {
      hasEscalation,
      decisionCount: decisions.length,
    });

    logAgentOperation(logger, "orchestrateWorkflow", "completed", {
      decisionCount: decisions.length,
      hasEscalation,
      status: hasEscalation ? "escalated" : "completed",
    });

    return {
      status: hasEscalation ? "escalated" : "completed",
      decisions,
      traceId: context.traceId,
      conversationId: context.conversationId,
    };
  });
}

export function createAgentContext(
  request: ChatRequest,
  conversationId: string,
  traceId: string,
): AgentContext {
  return {
    conversationId,
    customerId: request.customerId ?? null,
    channel: request.channel,
    traceId,
  };
}

export { messageBus };

import { TriageResult, Task, ChatRequest, BillingDecision, SubscriptionDecision, AgentName, AutonomyGateInput, AutonomyGateResult, RiskLevel } from '@resolvex/shared';
import { determineRiskLevel, checkAutonomyGate } from '../verification/autonomyGate';
import { handleMutationFailure, escalateToHandoff } from '../verification/failure-handling';
import { verifyRefund, verifyUpgrade } from '../verification/verify';
import { processBillingTask, detectDuplicateCharges, getCustomer as getBillingCustomer, getTransactions } from './billing';
import { processSubscriptionTask, getCustomer as getSubscriptionCustomer, getSubscription, checkPlanExists, getPlanTier } from './subscription';

export interface AgentContext {
  conversationId: string;
  customerId: string | null;
  channel: 'chat' | 'voice';
  traceId: string;
}

export interface SpecialistDecision {
  agent: AgentName;
  decision: BillingDecision | SubscriptionDecision;
  tasks: Task[];
}

export interface OrchestratorResult {
  status: 'completed' | 'escalated' | 'error';
  decisions: SpecialistDecision[];
  traceId: string;
  conversationId: string;
}

async function routeToBillingAgent(context: AgentContext, task: Task): Promise<BillingDecision> {
  if (!context.customerId) {
    return {
      action: 'investigate',
      evidence: ['No customer ID provided'],
      policyReferences: ['POL-CUST-001'],
      requiresApproval: false,
    };
  }

  // Convert task to billing task format
  const billingTask = {
    type: task.type === 'investigate_billing_issue' ? 'duplicate_charge' as const : 'refund_inquiry' as const,
    payload: {
      customerId: context.customerId,
      amount: task.payload?.['amount'] as number | undefined,
      invoiceId: task.payload?.['invoiceId'] as string | undefined,
      message: task.payload?.['message'] as string | undefined,
    },
  };

  return processBillingTask(billingTask);
}

async function routeToSubscriptionAgent(context: AgentContext, task: Task): Promise<SubscriptionDecision> {
  if (!context.customerId) {
    return {
      action: 'investigate',
      targetPlanId: undefined,
      eligibility: 'requires_review',
      evidence: ['No customer ID provided'],
      policyReferences: ['POL-CUST-001'],
      requiresApproval: false,
    };
  }

  // Convert task to subscription task format
  const subscriptionTask = {
    type: (task.type === 'investigate_subscription_issue' ? 'change_plan' : task.type) as 'upgrade' | 'downgrade' | 'cancel',
    payload: {
      customerId: context.customerId,
      targetPlanId: task.payload?.['targetPlanId'] as string | undefined,
      message: task.payload?.['message'] as string | undefined,
    },
  };

  return processSubscriptionTask(subscriptionTask);
}

export async function orchestrateWorkflow(
  triageResult: TriageResult,
  request: ChatRequest,
  context: AgentContext
): Promise<OrchestratorResult> {
  const decisions: SpecialistDecision[] = [];

  for (const task of triageResult.tasks) {
    if (task.agent === 'billing') {
      const decision = await routeToBillingAgent(context, task);
      decisions.push({
        agent: 'billing',
        decision,
        tasks: [task],
      });

      if (decision.action === 'refund' && context.customerId) {
        await verifyRefund(
          context.traceId,
          context.conversationId,
          {
            customerId: context.customerId,
            expectedRefundAmount: decision.amount ?? 0,
            invoiceId: task.payload?.['invoiceId'] as string ?? '',
          }
        );
      }
    } else if (task.agent === 'subscription') {
      const decision = await routeToSubscriptionAgent(context, task);
      decisions.push({
        agent: 'subscription',
        decision,
        tasks: [task],
      });

      if (decision.action === 'upgrade' && decision.targetPlanId && context.customerId) {
        // Create a verification agent run to satisfy FK constraint
        const { createAgentRun: createTraceRun } = await import('../traces/repository');
        const verificationRun = await createTraceRun({
          conversationId: context.conversationId,
          agentName: 'verification',
          input: { action: 'verifyUpgrade', expectedPlanId: decision.targetPlanId },
          decision: {},
          status: 'running',
          startedAt: new Date(),
          completedAt: null,
        });
        await verifyUpgrade(
          verificationRun.id,
          context.conversationId,
          {
            customerId: context.customerId,
            expectedPlanId: decision.targetPlanId,
          }
        );
        await import('../traces/repository').then(m => m.updateAgentRunStatus(verificationRun.id, 'completed', new Date()));
      }
    }
  }

  const hasEscalation = decisions.some(d => d.decision.requiresApproval);

  return {
    status: hasEscalation ? 'escalated' : 'completed',
    decisions,
    traceId: context.traceId,
    conversationId: context.conversationId,
  };
}

export function createAgentContext(request: ChatRequest, conversationId: string, traceId: string): AgentContext {
  return {
    conversationId,
    customerId: request.customerId ?? null,
    channel: request.channel,
    traceId,
  };
}
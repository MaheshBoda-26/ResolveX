import { TriageResult, Task, ChatRequest, BillingDecision, SubscriptionDecision, AgentName, AutonomyGateInput, AutonomyGateResult, RiskLevel } from '@resolvex/shared';
import { determineRiskLevel } from '../verification/autonomyGate';
import { handleMutationFailure, escalateToHandoff } from '../verification/failure-handling';
import { verifyRefund, verifyUpgrade } from '../verification/verify';

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

async function callAutonomyGate(input: AutonomyGateInput): Promise<AutonomyGateResult> {
  const gatewayUrl = process.env['AUTONOMY_GATEWAY_URL'] || 'http://localhost:3002';
  try {
    const response = await fetch(`${gatewayUrl}/api/autonomy/gate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      console.error(`Autonomy gate error: ${response.status}`);
      return { allowed: false, reason: 'Autonomy gate unavailable', requiredApprovals: [] };
    }
    return (await response.json()) as AutonomyGateResult;
  } catch (error) {
    console.error('Autonomy gate call failed:', error);
    return { allowed: false, reason: 'Autonomy gate call failed', requiredApprovals: [] };
  }
}

async function routeToBillingAgent(context: AgentContext, task: Task): Promise<BillingDecision> {
  const action = task.type;
  const payload = task.payload as Record<string, unknown>;
  const amount = payload['amount'] as number | undefined;
  const risk = determineRiskLevel('billing', action, amount);

  const evidence = [`Task: ${task.type}`, `Priority: ${task.priority}`];
  const policyReferences = ['billing_policy_v1', 'refund_policy_v1'];

  const permission = context.customerId ? 'customer_owns_account,active_subscription' : 'missing_customer';

  const gateResult = await callAutonomyGate({
    agent: 'billing',
    action,
    evidence,
    policyReferences,
    permission,
    risk,
  });

  if (!gateResult.allowed) {
    return {
      action: 'escalate',
      evidence: gateResult.requiredApprovals,
      policyReferences,
      requiresApproval: true,
    };
  }

  switch (action) {
    case 'investigate_billing_issue':
      return {
        action: 'investigate',
        evidence: ['Billing issue investigation initiated'],
        policyReferences: ['billing_policy_v1'],
        requiresApproval: false,
      };

    case 'process_refund':
      if (amount !== undefined && amount <= 50) {
        return {
          action: 'refund',
          amount,
          evidence: ['Auto-refund within threshold', `Amount: $${amount}`],
          policyReferences: ['refund_policy_v1'],
          requiresApproval: false,
        };
      }
      return {
        action: 'investigate',
        evidence: ['Refund amount requires review', `Amount: $${amount}`],
        policyReferences: ['refund_policy_v1'],
        requiresApproval: true,
      };

    default:
      return {
        action: 'none',
        evidence: ['Unknown billing action'],
        policyReferences: [],
        requiresApproval: false,
      };
  }
}

async function routeToSubscriptionAgent(context: AgentContext, task: Task): Promise<SubscriptionDecision> {
  const action = task.type;
  const payload = task.payload as Record<string, unknown>;
  const risk = determineRiskLevel('subscription', action);

  const evidence = [`Task: ${task.type}`, `Priority: ${task.priority}`];
  const policyReferences = ['subscription_policy_v1', 'plan_change_policy_v1'];

  const permission = context.customerId ? 'customer_owns_account,active_subscription' : 'missing_customer';

  const gateResult = await callAutonomyGate({
    agent: 'subscription',
    action,
    evidence,
    policyReferences,
    permission,
    risk,
  });

  if (!gateResult.allowed) {
    return {
      action: 'escalate',
      targetPlanId: undefined,
      eligibility: 'requires_review',
      evidence: gateResult.requiredApprovals,
      policyReferences,
      requiresApproval: true,
    };
  }

  switch (action) {
    case 'investigate_subscription_issue':
      return {
        action: 'investigate',
        targetPlanId: undefined,
        eligibility: 'eligible',
        evidence: ['Subscription issue investigation initiated'],
        policyReferences: ['subscription_policy_v1'],
        requiresApproval: false,
      };

    case 'change_plan':
      const targetPlanId = payload['targetPlanId'] as string | undefined;
      return {
        action: targetPlanId ? 'upgrade' : 'investigate',
        targetPlanId,
        eligibility: targetPlanId ? 'eligible' : 'requires_review',
        evidence: targetPlanId ? [`Plan change to ${targetPlanId}`] : ['No target plan specified'],
        policyReferences: ['plan_change_policy_v1'],
        requiresApproval: false,
      };

    case 'cancel_subscription':
      return {
        action: 'cancel',
        targetPlanId: undefined,
        eligibility: 'eligible',
        evidence: ['Subscription cancellation requested'],
        policyReferences: ['subscription_policy_v1'],
        requiresApproval: true,
      };

    default:
      return {
        action: 'none',
        targetPlanId: undefined,
        eligibility: 'requires_review',
        evidence: ['Unknown subscription action'],
        policyReferences: [],
        requiresApproval: false,
      };
  }
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
        await verifyUpgrade(
          context.traceId,
          context.conversationId,
          {
            customerId: context.customerId,
            expectedPlanId: decision.targetPlanId,
          }
        );
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
import { db } from '../db/client';
import { handoffs, conversations, agentRuns, toolCalls, verifications } from '../db/schema';
import { eq, and } from 'drizzle-orm';
import type { TriageResult, BillingDecision, SubscriptionDecision, Verification } from '@resolvex/shared';
import { HandoffReason, HANDOFF_REASONS } from '@resolvex/shared';

export interface Handoff {
  id: string;
  conversationId: string;
  customer: {
    id: string;
    name: string;
    email: string;
    planId: string;
    status: string;
  };
  issue: {
    summary: string;
    intents: TriageResult['intents'];
    tasks: TriageResult['tasks'];
  };
  evidence: {
    billingDecisions: BillingDecision[];
    subscriptionDecisions: SubscriptionDecision[];
    verificationResults: Verification[];
    toolCalls: Array<{
      toolName: string;
      arguments: Record<string, unknown>;
      result: Record<string, unknown> | null;
      status: string;
    }>;
  };
  policy: {
    references: string[];
    autonomyGateResults: Array<{
      agent: string;
      action: string;
      allowed: boolean;
      reason: string;
    }>;
  };
  completedActions: Array<{
    type: string;
    action: string;
    amount?: number;
    result: 'success' | 'failed' | 'escalated';
    timestamp: Date;
  }>;
  reason: HandoffReason;
  recommendedAction: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

export interface GenerateCaseBriefInput {
  conversationId: string;
  triageResult: TriageResult;
  specialistDecisions: {
    billing?: BillingDecision[];
    subscription?: SubscriptionDecision[];
  };
  verificationResults: Verification[];
  escalationReason: HandoffReason;
}

async function getCustomerFromConversation(conversationId: string): Promise<{
  id: string;
  name: string;
  email: string;
  planId: string;
  status: string;
} | null> {
  const conversation = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId as any))
    .limit(1);

  if (!conversation[0] || !conversation[0].customerId) {
    return null;
  }

  const customer = await db
    .select()
    .from(conversations)
    .where(eq(conversations.customerId, conversation[0].customerId as any))
    .limit(1);

  if (!customer[0]) return null;

  return {
    id: conversation[0].customerId,
    name: 'Customer',
    email: 'unknown@example.com',
    planId: 'unknown',
    status: 'active',
  };
}

async function getAgentRunsForConversation(conversationId: string): Promise<Array<{
  agentName: string;
  decision: Record<string, unknown>;
}>> {
  const runs = await db
    .select()
    .from(agentRuns)
    .where(eq(agentRuns.conversationId, conversationId as any));

  return runs.map(r => ({
    agentName: r.agentName,
    decision: r.decision as Record<string, unknown>,
  }));
}

async function getToolCallsForConversation(conversationId: string): Promise<Array<{
  toolName: string;
  arguments: Record<string, unknown>;
  result: Record<string, unknown> | null;
  status: string;
}>> {
  const runs = await db
    .select({ id: agentRuns.id })
    .from(agentRuns)
    .where(eq(agentRuns.conversationId, conversationId as any));

  const runIds = runs.map(r => r.id);
  if (runIds.length === 0) return [];

  const calls = await db
    .select()
    .from(toolCalls)
    .where(and(eq(toolCalls.agentRunId, runIds[0] as any)));

  return calls.map(c => ({
    toolName: c.toolName,
    arguments: c.arguments as Record<string, unknown>,
    result: c.result as Record<string, unknown> | null,
    status: c.status,
  }));
}

async function getVerificationsForConversation(conversationId: string): Promise<Array<{
  actionType: string;
  expectedState: Record<string, unknown>;
  observedState: Record<string, unknown> | null;
  status: string;
}>> {
  const results = await db
    .select()
    .from(verifications)
    .where(eq(verifications.conversationId, conversationId as any));

  return results.map(v => ({
    actionType: v.actionType,
    expectedState: v.expectedState as Record<string, unknown>,
    observedState: v.observedState as Record<string, unknown> | null,
    status: v.status,
  }));
}

export async function generateCaseBrief(input: GenerateCaseBriefInput): Promise<Handoff> {
  const { conversationId, triageResult, specialistDecisions, verificationResults, escalationReason } = input;

  const customer = await getCustomerFromConversation(conversationId);
  const agentRunsData = await getAgentRunsForConversation(conversationId);
  const toolCallsData = await getToolCallsForConversation(conversationId);
  const verificationsData = await getVerificationsForConversation(conversationId);

  const billingDecisions = specialistDecisions.billing || [];
  const subscriptionDecisions = specialistDecisions.subscription || [];

  const policyReferences = new Set<string>();
  const autonomyGateResults: Array<{
    agent: string;
    action: string;
    allowed: boolean;
    reason: string;
  }> = [];

  for (const decision of [...billingDecisions, ...subscriptionDecisions]) {
    if ('policyReferences' in decision) {
      for (const ref of decision.policyReferences) {
        policyReferences.add(ref);
      }
    }
    if ('evidence' in decision) {
      for (const evidence of decision.evidence) {
        if (evidence.toLowerCase().includes('autonomy gate')) {
          autonomyGateResults.push({
            agent: 'unknown',
            action: decision.action,
            allowed: evidence.includes('approved'),
            reason: evidence,
          });
        }
      }
    }
  }

  const completedActions: Handoff['completedActions'] = [];
  for (const decision of [...billingDecisions, ...subscriptionDecisions]) {
    if (decision.action !== 'none' && decision.action !== 'investigate' && decision.action !== 'escalate') {
      const amount = 'amount' in decision ? decision.amount : undefined;
      completedActions.push({
        type: billingDecisions.includes(decision as BillingDecision) ? 'billing' : 'subscription',
        action: decision.action,
        amount,
        result: decision.requiresApproval ? 'escalated' : 'success',
        timestamp: new Date(),
      });
    }
  }

  let recommendedAction = 'Review case and take appropriate action';
  switch (escalationReason) {
    case HANDOFF_REASONS.HIGH_VALUE_REFUND:
      recommendedAction = 'Approve or deny high-value refund request';
      break;
    case HANDOFF_REASONS.POLICY_EXCEPTION:
      recommendedAction = 'Evaluate policy exception and authorize if warranted';
      break;
    case HANDOFF_REASONS.AMBIGUOUS_IDENTITY:
      recommendedAction = 'Verify customer identity through additional channels';
      break;
    case HANDOFF_REASONS.CONFLICTING_ACCOUNT_STATE:
      recommendedAction = 'Resolve conflicting account state and reconcile records';
      break;
    case HANDOFF_REASONS.UNVERIFIED_MUTATION:
      recommendedAction = 'Manually verify mutation outcome and correct if needed';
      break;
    case HANDOFF_REASONS.UNSUPPORTED_WORKFLOW:
      recommendedAction = 'Handle workflow manually or escalate to engineering';
      break;
    case HANDOFF_REASONS.TOOL_FAILURE:
      recommendedAction = 'Retry failed operation or execute manually';
      break;
    case HANDOFF_REASONS.MISSING_INFORMATION:
      recommendedAction = 'Collect missing information from customer';
      break;
  }

  const handoff: Handoff = {
    id: crypto.randomUUID(),
    conversationId,
    customer: customer || {
      id: 'unknown',
      name: 'Unknown',
      email: 'unknown@example.com',
      planId: 'unknown',
      status: 'unknown',
    },
    issue: {
      summary: triageResult.summary,
      intents: triageResult.intents,
      tasks: triageResult.tasks,
    },
    evidence: {
      billingDecisions,
      subscriptionDecisions,
      verificationResults,
      toolCalls: toolCallsData,
    },
    policy: {
      references: Array.from(policyReferences),
      autonomyGateResults,
    },
    completedActions,
    reason: escalationReason,
    recommendedAction,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await db.insert(handoffs).values({
    conversationId: conversationId as any,
    reason: escalationReason,
    evidence: handoff as any,
    recommendedAction,
    status: 'pending',
  } as any);

  return handoff;
}

export async function getHandoffById(handoffId: string): Promise<Handoff | null> {
  const result = await db
    .select()
    .from(handoffs)
    .where(eq(handoffs.id, handoffId as any))
    .limit(1);

  if (!result[0]) return null;

  return result[0].evidence as unknown as Handoff;
}

export async function listPendingHandoffs(): Promise<Handoff[]> {
  const results = await db
    .select()
    .from(handoffs)
    .where(eq(handoffs.status, 'pending'))
    .orderBy(handoffs.createdAt);

  return results.map(r => r.evidence as unknown as Handoff);
}

export async function acceptHandoff(handoffId: string, operatorId: string): Promise<Handoff | null> {
  const handoff = await getHandoffById(handoffId);
  if (!handoff) return null;

  handoff.status = 'accepted';
  handoff.updatedAt = new Date();

  await db
    .update(handoffs)
    .set({
      status: 'accepted',
      evidence: handoff as any,
    } as any)
    .where(eq(handoffs.id, handoffId as any));

  return handoff;
}

export async function completeHandoff(handoffId: string, resolution: string): Promise<Handoff | null> {
  const handoff = await getHandoffById(handoffId);
  if (!handoff) return null;

  handoff.status = 'completed';
  handoff.updatedAt = new Date();
  handoff.completedActions.push({
    type: 'handoff',
    action: 'resolved',
    result: 'success',
    timestamp: new Date(),
  });

  await db
    .update(handoffs)
    .set({
      status: 'completed',
      evidence: handoff as any,
    } as any)
    .where(eq(handoffs.id, handoffId as any));

  return handoff;
}
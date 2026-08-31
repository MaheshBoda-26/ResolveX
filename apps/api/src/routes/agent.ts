import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ChatRequestSchema, ChatResponseSchema, TriageResultSchema, HandoffReason, HANDOFF_REASONS } from '@resolvex/shared';
import type { BillingDecision, SubscriptionDecision } from '@resolvex/shared';
import { triageMessage } from '../agents/triage';
import { orchestrateWorkflow, createAgentContext, type SpecialistDecision } from '../agents/orchestrator';
import { createConversation, createAgentRun, createTriageAgentRun } from '../db/conversations';
import { createAgentRun as createTraceRun, updateAgentRunStatus } from '../traces/repository';
import { generateCaseBrief } from '../handoff/caseBrief';
import { toFastifySchema } from '../lib/fastify-schema';

export const agentRoutes: FastifyPluginAsync = async (app) => {
  app.post('/agent/process', {
    schema: {
      body: toFastifySchema(ChatRequestSchema),
      response: {
        200: toFastifySchema(ChatResponseSchema),
      },
    },
    async handler(request, reply) {
      const body = request.body as z.infer<typeof ChatRequestSchema>;
      const traceId = crypto.randomUUID();

      let conversationId = body.conversationId;

      if (!conversationId) {
        const conversation = await createConversation(body.customerId ?? null, body.channel);
        conversationId = conversation.id;
      }

      const traceRun = await createTraceRun({
        conversationId,
        agentName: 'triage',
        input: body as Record<string, unknown>,
        decision: {},
        status: 'running',
        startedAt: new Date(),
        completedAt: null,
      });

      const triageResult = await triageMessage(body);

      await createTriageAgentRun(conversationId, body, triageResult);

      const context = createAgentContext(body, conversationId, traceId);

      const orchestratorResult = await orchestrateWorkflow(triageResult, body, context);

      const finalStatus = orchestratorResult.status === 'completed' ? 'completed' :
                          orchestratorResult.status === 'escalated' ? 'escalated' : 'error';

      // If escalated, create a handoff
      if (orchestratorResult.status === 'escalated') {
        const billingDecisions = orchestratorResult.decisions
          .filter((d): d is SpecialistDecision & { decision: BillingDecision } => d.agent === 'billing')
          .map(d => d.decision);
        const subscriptionDecisions = orchestratorResult.decisions
          .filter((d): d is SpecialistDecision & { decision: SubscriptionDecision } => d.agent === 'subscription')
          .map(d => d.decision);

        const hasHighValueRefund = billingDecisions.some(d =>
          d.action === 'refund' && (d.amount ?? 0) > 500
        );

        const hasPolicyException = billingDecisions.some(d => d.action === 'escalate') ||
                                   subscriptionDecisions.some(d => d.action === 'escalate');

        let escalationReason: HandoffReason = HANDOFF_REASONS.POLICY_EXCEPTION;
        if (hasHighValueRefund) {
          escalationReason = HANDOFF_REASONS.HIGH_VALUE_REFUND;
        } else if (hasPolicyException) {
          escalationReason = HANDOFF_REASONS.POLICY_EXCEPTION;
        }

        await generateCaseBrief({
          conversationId,
          triageResult,
          specialistDecisions: {
            billing: billingDecisions,
            subscription: subscriptionDecisions,
          },
          verificationResults: [],
          escalationReason,
        });
      }

      await createAgentRun(conversationId, 'triage', { ...body, traceId }, {
        triageResult,
        decisions: orchestratorResult.decisions,
        status: finalStatus,
      }, finalStatus === 'completed' ? 'completed' : 'failed');

      // Update the trace run with final status
      await updateAgentRunStatus(traceRun.id, finalStatus === 'completed' ? 'completed' : 'failed', new Date());

      return reply.send({
        conversationId,
        message: generateResponseMessage(triageResult, orchestratorResult),
        status: finalStatus,
        traceId,
      });
    },
  });
};

function generateResponseMessage(
  triageResult: z.infer<typeof TriageResultSchema>,
  orchestratorResult: Awaited<ReturnType<typeof orchestrateWorkflow>>
): string {
  const intents = triageResult.intents.map(i => i.type).join(', ');
  const hasEscalation = orchestratorResult.decisions.some(d => d.decision.requiresApproval);

  if (hasEscalation) {
    return `I've analyzed your request (intents: ${intents}) and routed it to our specialists. Some actions require human review, so I've escalated those for approval. Our team will follow up shortly.`;
  }

  const completedActions = orchestratorResult.decisions
    .filter(d => !d.decision.requiresApproval)
    .map(d => `${d.agent}: ${d.decision.action}`)
    .join('; ');

  if (completedActions) {
    return `I've processed your request (intents: ${intents}). Actions completed: ${completedActions}.`;
  }

  return `I've analyzed your request (intents: ${intents}) and created tasks for our specialists. They'll investigate and follow up.`;
}
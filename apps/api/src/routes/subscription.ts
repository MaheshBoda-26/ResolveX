import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  SubscriptionDecisionSchema,
  SubscriptionDecision,
  ChatRequestSchema,
} from '@resolvex/shared';
import { processSubscriptionTask } from '../agents/subscription';
import { createAgentRun, createToolCall } from '../db/conversations';
import { toFastifySchema } from '../lib/fastify-schema';

const SubscriptionTaskSchema = z.object({
  type: z.enum(['upgrade', 'downgrade', 'cancel']),
  payload: z.object({
    customerId: z.uuid(),
    targetPlanId: z.string().optional(),
    message: z.string().optional(),
  }),
});

const SubscriptionRouteRequestSchema = z.object({
  task: SubscriptionTaskSchema,
  conversationId: z.uuid(),
});

export const subscriptionRoutes: FastifyPluginAsync = async (app) => {
  app.post('/subscription', {
    schema: {
      body: toFastifySchema(SubscriptionRouteRequestSchema),
      response: {
        200: toFastifySchema(SubscriptionDecisionSchema),
      },
    },
    async handler(request, reply) {
      const body = request.body as z.infer<typeof SubscriptionRouteRequestSchema>;
      const { task, conversationId } = body;

      const agentRun = await createAgentRun(
        conversationId,
        'subscription',
        task,
        { status: 'processing' },
        'running'
      );

      try {
        const decision = await processSubscriptionTask(task);

        await createAgentRun(
          conversationId,
          'subscription',
          task,
          decision,
          'completed'
        );

        return reply.send(decision);
      } catch (error) {
        const errorDecision = SubscriptionDecisionSchema.parse({
          action: 'escalate',
          eligibility: 'requires_review',
          evidence: [`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`],
          policyReferences: ['POL-SYS-001'],
          requiresApproval: true,
        });

        await createAgentRun(
          conversationId,
          'subscription',
          task,
          errorDecision,
          'failed'
        );

        return reply.send(errorDecision);
      }
    },
  });
};
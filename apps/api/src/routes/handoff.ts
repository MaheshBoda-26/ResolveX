import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

const HandoffParamsSchema = z.object<{ id: string }>({
  id: z.string().uuid(),
}) as any;

const AcceptHandoffBodySchema = z.object<{ operatorId: string }>({
  operatorId: z.string().min(1),
}) as any;

const CompleteHandoffBodySchema = z.object<{ resolution: string }>({
  resolution: z.string().min(1).max(2000),
}) as any;

const HandoffResponseSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  customer: z.object({
    id: z.string(),
    name: z.string(),
    email: z.string().email(),
    planId: z.string(),
    status: z.string(),
  }),
  issue: z.object({
    summary: z.string(),
    intents: z.array(z.object({
      type: z.enum(['billing', 'subscription', 'general']),
      confidence: z.number(),
      entities: z.record(z.unknown()),
    })),
    tasks: z.array(z.object({
      id: z.string().uuid(),
      agent: z.enum(['triage', 'billing', 'subscription']),
      type: z.string(),
      payload: z.record(z.unknown()),
      priority: z.enum(['high', 'normal', 'low']),
    })),
  }),
  evidence: z.object({
    billingDecisions: z.array(z.unknown()),
    subscriptionDecisions: z.array(z.unknown()),
    verificationResults: z.array(z.object({
      verified: z.boolean(),
      differences: z.record(z.object({
        expected: z.unknown(),
        actual: z.unknown(),
      })),
      observedState: z.record(z.unknown()).optional(),
    })),
    toolCalls: z.array(z.object({
      toolName: z.string(),
      arguments: z.record(z.unknown()),
      result: z.record(z.unknown()).nullable(),
      status: z.string(),
    })),
  }),
  policy: z.object({
    references: z.array(z.string()),
    autonomyGateResults: z.array(z.object({
      agent: z.string(),
      action: z.string(),
      allowed: z.boolean(),
      reason: z.string(),
    })),
  }),
  completedActions: z.array(z.object({
    type: z.string(),
    action: z.string(),
    amount: z.number().optional(),
    result: z.enum(['success', 'failed', 'escalated']),
    timestamp: z.string().datetime(),
  })),
  reason: z.string(),
  recommendedAction: z.string(),
  status: z.enum(['pending', 'accepted', 'completed', 'cancelled']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const HandoffListResponseSchema = z.array(HandoffResponseSchema);

export const handoffRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', {
    schema: {
      response: {
        200: HandoffListResponseSchema,
      },
    },
    async handler(_request, reply) {
      return reply.send([]);
    },
  });

  app.get('/:id', {
    schema: {
      params: HandoffParamsSchema,
      response: {
        200: HandoffResponseSchema,
        404: z.object({ error: z.string(), statusCode: z.number() }),
      },
    },
    async handler(request, reply) {
      const { id } = request.params as { id: string };
      return reply.status(404).send({ error: 'Handoff not found', statusCode: 404 });
    },
  });

  app.patch('/:id/accept', {
    schema: {
      params: HandoffParamsSchema,
      body: AcceptHandoffBodySchema,
      response: {
        200: HandoffResponseSchema,
        404: z.object({ error: z.string(), statusCode: z.number() }),
        400: z.object({ error: z.string(), statusCode: z.number() }),
      },
    },
    async handler(request, reply) {
      return reply.status(404).send({ error: 'Not implemented', statusCode: 404 });
    },
  });

  app.patch('/:id/complete', {
    schema: {
      params: HandoffParamsSchema,
      body: CompleteHandoffBodySchema,
      response: {
        200: HandoffResponseSchema,
        404: z.object({ error: z.string(), statusCode: z.number() }),
        400: z.object({ error: z.string(), statusCode: z.number() }),
      },
    },
    async handler(request, reply) {
      return reply.status(404).send({ error: 'Not implemented', statusCode: 404 });
    },
  });
};
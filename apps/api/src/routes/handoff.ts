import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  generateCaseBrief,
  getHandoffById,
  listPendingHandoffs,
  acceptHandoff,
  completeHandoff,
} from '../handoff/caseBrief';

// Extract nested object schemas to avoid Zod v4 type inference issues
const CustomerSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string().email(),
  planId: z.string(),
  status: z.string(),
});

const IntentSchema = z.object({
  type: z.enum(['billing', 'subscription', 'general']),
  confidence: z.number(),
  entities: z.record(z.string(), z.unknown()),
});

const TaskSchema = z.object({
  id: z.string().uuid(),
  agent: z.enum(['triage', 'billing', 'subscription']),
  type: z.string(),
  payload: z.record(z.string(), z.unknown()),
  priority: z.enum(['high', 'normal', 'low']),
});

const IssueSchema = z.object({
  summary: z.string(),
  intents: z.array(IntentSchema),
  tasks: z.array(TaskSchema),
});

const VerificationDiffSchema = z.object({
  expected: z.unknown(),
  actual: z.unknown(),
});

const VerificationResultSchema = z.object({
  verified: z.boolean(),
  differences: z.record(z.string(), VerificationDiffSchema),
  observedState: z.record(z.string(), z.unknown()).optional(),
});

const ToolCallSchema = z.object({
  toolName: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  status: z.string(),
});

const EvidenceSchema = z.object({
  billingDecisions: z.array(z.unknown()),
  subscriptionDecisions: z.array(z.unknown()),
  verificationResults: z.array(VerificationResultSchema),
  toolCalls: z.array(ToolCallSchema),
});

const AutonomyGateResultSchema = z.object({
  agent: z.string(),
  action: z.string(),
  allowed: z.boolean(),
  reason: z.string(),
});

const PolicySchema = z.object({
  references: z.array(z.string()),
  autonomyGateResults: z.array(AutonomyGateResultSchema),
});

const CompletedActionSchema = z.object({
  type: z.string(),
  action: z.string(),
  amount: z.number().optional(),
  result: z.enum(['success', 'failed', 'escalated']),
  timestamp: z.string().datetime(),
});

const HandoffResponseSchema = z.object({
  id: z.string().uuid(),
  conversationId: z.string().uuid(),
  customer: CustomerSchema,
  issue: IssueSchema,
  evidence: EvidenceSchema,
  policy: PolicySchema,
  completedActions: z.array(CompletedActionSchema),
  reason: z.string(),
  recommendedAction: z.string(),
  status: z.enum(['pending', 'accepted', 'completed', 'cancelled']),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}) as any;

const HandoffListResponseSchema = z.array(HandoffResponseSchema) as any;

const HandoffParamsSchema = z.object({
  id: z.string().uuid(),
}) as any;

const AcceptHandoffBodySchema = z.object({
  operatorId: z.string().min(1),
}) as any;

const CompleteHandoffBodySchema = z.object({
  resolution: z.string().min(1).max(2000),
}) as any;

export const handoffRoutes: FastifyPluginAsync = async (app) => {
  app.get('/', {
    schema: {
      response: {
        200: HandoffListResponseSchema,
      },
    },
    async handler(_request, reply) {
      const handoffs = await listPendingHandoffs();
      return reply.send(handoffs);
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
      const handoff = await getHandoffById(id);
      if (!handoff) {
        return reply.status(404).send({ error: 'Handoff not found', statusCode: 404 });
      }
      return reply.send(handoff);
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
      const { id } = request.params as { id: string };
      const { operatorId } = request.body as { operatorId: string };
      const handoff = await acceptHandoff(id, operatorId);
      if (!handoff) {
        return reply.status(404).send({ error: 'Handoff not found', statusCode: 404 });
      }
      return reply.send(handoff);
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
      const { id } = request.params as { id: string };
      const { resolution } = request.body as { resolution: string };
      const handoff = await completeHandoff(id, resolution);
      if (!handoff) {
        return reply.status(404).send({ error: 'Handoff not found', statusCode: 404 });
      }
      return reply.send(handoff);
    },
  });
};
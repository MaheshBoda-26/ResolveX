import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  getAgentRunById,
  getAgentRunsByConversation,
  getAgentRunWithDetails,
  type AgentRunWithDetails,
} from './repository.js';
import { toFastifySchema } from '../lib/fastify-schema';

const ToolCallSchema = z.object({
  id: z.uuid(),
  agentRunId: z.uuid(),
  toolName: z.string(),
  arguments: z.record(z.string(), z.unknown()),
  result: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(['pending', 'success', 'failed']),
  latencyMs: z.number().int().nonnegative().nullable(),
  createdAt: z.string().datetime(),
});

const VerificationSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  actionType: z.string(),
  expectedState: z.record(z.string(), z.unknown()),
  observedState: z.record(z.string(), z.unknown()).nullable(),
  status: z.enum(['pending', 'passed', 'failed']),
  createdAt: z.string().datetime(),
});

const HandoffSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  reason: z.string(),
  evidence: z.record(z.string(), z.unknown()),
  recommendedAction: z.string(),
  status: z.enum(['pending', 'accepted', 'completed']),
  createdAt: z.string().datetime(),
});

const AgentRunDetailSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  agentName: z.string(),
  input: z.record(z.string(), z.unknown()),
  decision: z.record(z.string(), z.unknown()),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
  toolCalls: z.array(ToolCallSchema),
  verifications: z.array(VerificationSchema),
  handoffs: z.array(HandoffSchema),
});

const AgentRunListSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  agentName: z.string(),
  input: z.record(z.string(), z.unknown()),
  decision: z.record(z.string(), z.unknown()),
  status: z.enum(['pending', 'running', 'completed', 'failed']),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});

const ErrorResponseSchema = z.object({ error: z.string(), statusCode: z.number() });

export const tracesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/traces/:runId', {
    schema: {
      params: toFastifySchema(z.object({ runId: z.uuid() })),
      response: {
        200: toFastifySchema(AgentRunDetailSchema),
        404: toFastifySchema(ErrorResponseSchema),
      },
    },
    async handler(request, reply) {
      const { runId } = request.params as { runId: string };

      const trace = await getAgentRunWithDetails(runId);
      if (!trace) {
        return reply.status(404).send({ error: 'Trace not found', statusCode: 404 });
      }

      return reply.send(trace);
    },
  });

  app.get('/conversations/:id/trace', {
    schema: {
      params: toFastifySchema(z.object({ id: z.uuid() })),
      response: {
        200: toFastifySchema(z.array(AgentRunListSchema)),
      },
    },
    async handler(request, reply) {
      const { id } = request.params as { id: string };

      const runs = await getAgentRunsByConversation(id);
      return reply.send(runs);
    },
  });
};
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  getAgentRunById,
  getAgentRunsByConversation,
  getAgentRunWithDetails,
  type AgentRunWithDetails,
} from './repository.js';

export const tracesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/traces/:runId', {
    schema: {
      params: z.object({ runId: z.uuid() }),
      response: {
        200: z.object({
          id: z.uuid(),
          conversationId: z.uuid(),
          agentName: z.string(),
          input: z.record(z.string(), z.unknown()),
          decision: z.record(z.string(), z.unknown()),
          status: z.enum(['pending', 'running', 'completed', 'failed']),
          startedAt: z.iso.datetime(),
          completedAt: z.iso.datetime().nullable(),
          toolCalls: z.array(z.object({
            id: z.uuid(),
            agentRunId: z.uuid(),
            toolName: z.string(),
            arguments: z.record(z.string(), z.unknown()),
            result: z.record(z.string(), z.unknown()).nullable(),
            status: z.enum(['pending', 'success', 'failed']),
            latencyMs: z.number().int().nonnegative().nullable(),
            createdAt: z.iso.datetime(),
          })),
          verifications: z.array(z.object({
            id: z.uuid(),
            conversationId: z.uuid(),
            actionType: z.string(),
            expectedState: z.record(z.string(), z.unknown()),
            observedState: z.record(z.string(), z.unknown()).nullable(),
            status: z.enum(['pending', 'passed', 'failed']),
            createdAt: z.iso.datetime(),
          })),
          handoffs: z.array(z.object({
            id: z.uuid(),
            conversationId: z.uuid(),
            reason: z.string(),
            evidence: z.record(z.string(), z.unknown()),
            recommendedAction: z.string(),
            status: z.enum(['pending', 'accepted', 'completed']),
            createdAt: z.iso.datetime(),
          })),
        }),
        404: z.object({ error: z.string(), statusCode: z.number() }),
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
      params: z.object({ id: z.uuid() }),
      response: {
        200: z.array(z.object({
          id: z.uuid(),
          conversationId: z.uuid(),
          agentName: z.string(),
          input: z.record(z.string(), z.unknown()),
          decision: z.record(z.string(), z.unknown()),
          status: z.enum(['pending', 'running', 'completed', 'failed']),
          startedAt: z.iso.datetime(),
          completedAt: z.iso.datetime().nullable(),
        })),
      },
    },
    async handler(request, reply) {
      const { id } = request.params as { id: string };

      const runs = await getAgentRunsByConversation(id);
      return reply.send(runs);
    },
  });
};
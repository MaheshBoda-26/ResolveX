import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ChatRequestSchema, TriageResultSchema } from '@resolvex/shared';
import { triageMessage } from '../agents/triage';
import { createConversation, createTriageAgentRun } from '../db/conversations';

export const triageRoutes: FastifyPluginAsync = async (app) => {
  app.post('/triage', {
    schema: {
      body: ChatRequestSchema,
      response: {
        200: TriageResultSchema,
      },
    },
    async handler(request, reply) {
      const body = request.body as z.infer<typeof ChatRequestSchema>;

      let conversationId = body.conversationId;

      if (!conversationId) {
        const conversation = await createConversation(body.customerId ?? null, body.channel);
        conversationId = conversation.id;
      }

      const result = await triageMessage(body);

      await createTriageAgentRun(conversationId, body, result);

      return reply.send(result);
    },
  });
};
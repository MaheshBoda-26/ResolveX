import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ChatRequestSchema, TriageResultSchema } from '@resolvex/shared';

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

      // Placeholder implementation - returns a basic triage result
      const result = {
        intents: [
          {
            type: 'general' as const,
            confidence: 0.5,
            entities: {},
          },
        ],
        tasks: [],
        summary: `Triage placeholder for: ${body.message.slice(0, 100)}`,
      };

      return reply.send(result);
    },
  });
};
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { ChatRequestSchema, ConversationSchema } from '@resolvex/shared';
import { toFastifySchema } from '../lib/fastify-schema';

export const conversationsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/', {
    schema: {
      body: toFastifySchema(ChatRequestSchema),
      response: {
        201: toFastifySchema(ConversationSchema),
      },
    },
    async handler(request, reply) {
      const body = request.body as z.infer<typeof ChatRequestSchema>;

      const conversation = {
        id: crypto.randomUUID(),
        customerId: body.customerId ?? null,
        channel: body.channel,
        status: 'open' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return reply.status(201).send(conversation);
    },
  });

  app.get('/:id', {
    schema: {
      params: toFastifySchema(z.object({ id: z.uuid() })),
      response: {
        200: toFastifySchema(ConversationSchema),
        404: toFastifySchema(z.object({ error: z.string(), statusCode: z.number() })),
      },
    },
    async handler(request, reply) {
      const { id } = request.params as { id: string };

      // Placeholder: In real implementation, fetch from database
      const conversation = {
        id,
        customerId: null,
        channel: 'chat' as const,
        status: 'open' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return reply.send(conversation);
    },
  });

  const MessageResponseSchema = z.object({
  id: z.uuid(),
  conversationId: z.uuid(),
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  createdAt: z.string().datetime(),
});

app.post('/:id/messages', {
    schema: {
      params: toFastifySchema(z.object({ id: z.uuid() })),
      body: toFastifySchema(z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().min(1).max(4000),
      })),
      response: {
        201: toFastifySchema(MessageResponseSchema),
      },
    },
    async handler(request, reply) {
      const { id } = request.params as { id: string };
      const { role, content } = request.body as { role: 'user' | 'assistant'; content: string };

      const message = {
        id: crypto.randomUUID(),
        conversationId: id,
        role,
        content,
        createdAt: new Date().toISOString(),
      };

      return reply.status(201).send(message);
    },
  });
};
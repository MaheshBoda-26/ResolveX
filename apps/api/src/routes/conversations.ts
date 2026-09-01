import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ChatRequestSchema, ConversationSchema } from "@resolvex/shared";
import { toFastifySchema } from "../lib/fastify-schema";
import { createConversation, getConversation } from "../db/conversations";

export const conversationsRoutes: FastifyPluginAsync = async (app) => {
  app.post("/", {
    schema: {
      body: toFastifySchema(ChatRequestSchema),
      response: {
        201: toFastifySchema(ConversationSchema),
      },
    },
    async handler(request, reply) {
      const body = request.body as z.infer<typeof ChatRequestSchema>;

      const conversation = await createConversation(
        body.customerId ?? null,
        body.channel,
      );

      return reply.status(201).send({
        id: conversation.id,
        customerId: conversation.customerId ?? null,
        channel: conversation.channel,
        status: conversation.status,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      });
    },
  });

  app.get("/:id", {
    schema: {
      params: toFastifySchema(z.object({ id: z.uuid() })),
      response: {
        200: toFastifySchema(ConversationSchema),
        404: toFastifySchema(
          z.object({ error: z.string(), statusCode: z.number() }),
        ),
      },
    },
    async handler(request, reply) {
      const { id } = request.params as { id: string };

      const conversation = await getConversation(id);
      if (!conversation) {
        return reply
          .status(404)
          .send({ error: "Conversation not found", statusCode: 404 });
      }

      return reply.send({
        id: conversation.id,
        customerId: conversation.customerId ?? null,
        channel: conversation.channel,
        status: conversation.status,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt.toISOString(),
      });
    },
  });

  const MessageResponseSchema = z.object({
    id: z.uuid(),
    conversationId: z.uuid(),
    role: z.enum(["user", "assistant"]),
    content: z.string(),
    createdAt: z.string().datetime(),
  });

  app.post("/:id/messages", {
    schema: {
      params: toFastifySchema(z.object({ id: z.uuid() })),
      body: toFastifySchema(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(4000),
        }),
      ),
      response: {
        201: toFastifySchema(MessageResponseSchema),
      },
    },
    async handler(request, reply) {
      const { id } = request.params as { id: string };
      const { role, content } = request.body as {
        role: "user" | "assistant";
        content: string;
      };

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

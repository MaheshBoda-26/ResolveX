import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { seed } from "../db/seed";
import { toFastifySchema } from "../lib/fastify-schema";
import { adminOnlyMiddleware } from "../lib/auth.js";

const seedResetSchema = z.object({
  confirm: z.literal("YES_RESET_DATABASE"),
});

export const adminRoutes: FastifyPluginAsync = async (app) => {
  await app.register(async (fastify) => {
    fastify.addHook("onRequest", adminOnlyMiddleware);

    fastify.post("/admin/seed-reset", {
      schema: {
        body: toFastifySchema(seedResetSchema),
        response: {
          200: toFastifySchema(
            z.object({ success: z.boolean(), message: z.string() }),
          ),
          400: toFastifySchema(
            z.object({ error: z.string(), statusCode: z.number() }),
          ),
          403: toFastifySchema(
            z.object({ error: z.string(), statusCode: z.number() }),
          ),
          500: toFastifySchema(
            z.object({ error: z.string(), statusCode: z.number() }),
          ),
        },
      },
      async handler(request, reply) {
        const { confirm } = request.body as { confirm: string };

        if (confirm !== "YES_RESET_DATABASE") {
          return reply.status(400).send({
            error:
              'Confirmation required. Send { "confirm": "YES_RESET_DATABASE" } to proceed.',
            statusCode: 400,
          });
        }

        try {
          await seed();
          return reply.send({
            success: true,
            message: "Database seeded successfully",
          });
        } catch (error) {
          console.error("Seed reset failed:", error);
          return reply.status(500).send({
            error: error instanceof Error ? error.message : "Seed reset failed",
            statusCode: 500,
          });
        }
      },
    });
  });
};

import { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ChatRequestSchema, BillingDecisionSchema } from "@resolvex/shared";
import { processBillingTask } from "../agents/billing";
import { createConversation, createAgentRun } from "../db/conversations";
import {
  createAgentRun as createAgentRunTrace,
  createToolCall,
  updateToolCallResult,
} from "../traces/repository";
import { toFastifySchema } from "../lib/fastify-schema";

const BillingTaskSchema = z.object({
  type: z.enum(["duplicate_charge", "refund_inquiry"]),
  payload: z.object({
    customerId: z.uuid(),
    amount: z.number().positive().optional(),
    invoiceId: z.string().optional(),
    message: z.string().optional(),
  }),
});

export const billingRoutes: FastifyPluginAsync = async (app) => {
  app.post("/billing", {
    schema: {
      body: toFastifySchema(BillingTaskSchema),
      response: {
        200: toFastifySchema(BillingDecisionSchema),
      },
    },
    async handler(request, reply) {
      const body = request.body as z.infer<typeof BillingTaskSchema>;

      const conversation = await createConversation(
        body.payload.customerId,
        "chat",
      );
      const conversationId = conversation.id;

      const agentRun = await createAgentRunTrace({
        conversationId,
        agentName: "billing",
        input: body,
        decision: {},
        status: "running",
      });

      let toolCallId: string | undefined;

      try {
        if (
          body.type === "duplicate_charge" ||
          body.type === "refund_inquiry"
        ) {
          toolCallId = (
            await createToolCall({
              agentRunId: agentRun.id,
              toolName: "get_customer",
              arguments: { customerId: body.payload.customerId },
              status: "pending",
            })
          ).id;

          await updateToolCallResult(
            toolCallId,
            { customerId: body.payload.customerId },
            "success",
            0,
          );
        }

        const decision = await processBillingTask(body);

        await updateAgentRunStatus(
          agentRun.id,
          "completed",
          new Date(),
          decision,
        );

        return reply.send(decision);
      } catch (error) {
        await updateAgentRunStatus(agentRun.id, "failed", new Date());
        throw error;
      }
    },
  });
};

async function updateAgentRunStatus(
  id: string,
  status: "pending" | "running" | "completed" | "failed",
  completedAt?: Date,
  decision?: Record<string, unknown>,
): Promise<void> {
  const { db } = await import("../db/client");
  const { agentRuns } = await import("../db/schema");
  const { eq } = await import("drizzle-orm");

  const updateData: Record<string, unknown> = { status };
  if (completedAt) updateData["completedAt"] = completedAt;
  if (decision) updateData["decision"] = decision;

  await db.update(agentRuns).set(updateData).where(eq(agentRuns.id, id));
}

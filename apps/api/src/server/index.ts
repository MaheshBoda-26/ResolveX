import "dotenv/config";
import Fastify, {
  FastifyInstance,
  FastifyRequest,
  FastifyReply,
} from "fastify";
import { fastifyCors } from "@fastify/cors";
import { conversationsRoutes } from "../routes/conversations.js";
import { triageRoutes } from "../routes/triage.js";
import { subscriptionRoutes } from "../routes/subscription.js";
import { billingRoutes } from "../routes/billing.js";
import { tracesRoutes } from "../traces/routes.js";
import { handoffRoutes } from "../routes/handoff.js";
import { agentRoutes } from "../routes/agent.js";
import { adminRoutes } from "../routes/admin.js";
import { db, pool } from "../db/index.js";
import { registerAuthMiddleware } from "../lib/auth.js";
import { env } from "../lib/env.js";
import {
  initTelemetry,
  shutdownTelemetry,
  getCorrelationId,
} from "../lib/telemetry.js";
import {
  createRequestLogger,
  logRequest,
  logError,
  logger,
} from "../lib/logging.js";

const port = env.PORT;
const corsOrigin = env.CORS_ORIGIN;

initTelemetry();

export async function buildServer(): Promise<FastifyInstance> {
  const server = Fastify({
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "HH:MM:ss Z",
                ignore: "pid,hostname",
              },
            }
          : undefined,
    },
  });

  await server.register(fastifyCors, {
    origin: corsOrigin,
    credentials: true,
  });

  // Request logging middleware with correlation ID
  server.addHook(
    "onRequest",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const correlationId = getCorrelationId(request.headers);
      const requestLogger = createRequestLogger(correlationId, {
        method: request.method,
        url: request.url,
      });
      request.log = requestLogger;
      reply.header("x-correlation-id", correlationId);
      requestLogger.info(
        { type: "http_request_start" },
        `Request started: ${request.method} ${request.url}`,
      );
    },
  );

  server.addHook(
    "onResponse",
    async (request: FastifyRequest, reply: FastifyReply) => {
      const durationMs =
        Date.now() -
        (request.headers["x-request-start"]
          ? parseInt(request.headers["x-request-start"] as string)
          : Date.now());
      logRequest(
        request.log as import("../lib/logging.js").PinoLogger,
        request.method,
        request.url,
        reply.statusCode,
        durationMs,
      );
    },
  );

  registerAuthMiddleware(server);

  server.get("/health", async () => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  }));

  server.register(conversationsRoutes, { prefix: "/api/conversations" });
  server.register(triageRoutes, { prefix: "/api" });
  server.register(subscriptionRoutes, { prefix: "/api" });
  server.register(billingRoutes, { prefix: "/api" });
  server.register(tracesRoutes, { prefix: "/api" });
  server.register(handoffRoutes, { prefix: "/api/handoffs" });
  server.register(agentRoutes, { prefix: "/api" });
  server.register(adminRoutes, { prefix: "/api" });

  server.setErrorHandler(
    (error: unknown, request: FastifyRequest, reply: FastifyReply) => {
      logError(
        request.log as import("../lib/logging.js").PinoLogger,
        error instanceof Error ? error : new Error(String(error)),
      );
      const statusCode =
        error instanceof Error && "statusCode" in error
          ? (error as { statusCode: number }).statusCode
          : 500;
      const message =
        error instanceof Error ? error.message : "Internal Server Error";
      reply.status(statusCode).send({
        error: statusCode === 500 ? "Internal Server Error" : message,
        statusCode,
      });
    },
  );

  return server;
}

const start = async () => {
  try {
    const server = await buildServer();

    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    server.log.info("Database connected");

    await server.listen({ port, host: "0.0.0.0" });
    server.log.info(`Server listening on port ${port}`);
  } catch (err) {
    logError(logger, err instanceof Error ? err : new Error(String(err)), {
      type: "startup_error",
    });
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log("Shutting down...");
  await pool.end();
  await shutdownTelemetry();
  process.exit(0);
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

if (import.meta.url === `file://${process.argv[1]}`) {
  start();
}

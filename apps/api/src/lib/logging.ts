import pino, { LevelWithSilent as PinoLogLevel } from "pino";
import { getCurrentSpan } from "./telemetry";

export type PinoLogger = pino.Logger;

type LogLevel =
  "fatal" | "error" | "warn" | "info" | "debug" | "trace" | "silent";
const logLevel: PinoLogLevel = (process.env["LOG_LEVEL"] as LogLevel) || "info";
const isDevelopment = process.env["NODE_ENV"] === "development";

const baseLogger: PinoLogger = pino({
  level: logLevel,
  transport: isDevelopment
    ? {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      }
    : undefined,
  base: {
    service: "resolvex-api",
    environment: process.env["NODE_ENV"] || "development",
    version: process.env["OTEL_SERVICE_VERSION"] || "0.1.0",
  },
  formatters: {
    level: (label) => {
      return { level: label };
    },
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});

export function createRequestLogger(
  correlationId: string,
  extra?: Record<string, unknown>,
): PinoLogger {
  return baseLogger.child({
    correlationId,
    ...extra,
  });
}

export function createAgentLogger(
  agentName: string,
  correlationId: string,
  extra?: Record<string, unknown>,
): PinoLogger {
  return baseLogger.child({
    agent: agentName,
    correlationId,
    ...extra,
  });
}

export function injectTraceContext(logger: PinoLogger): PinoLogger {
  const span = getCurrentSpan();
  if (span) {
    const spanContext = span.spanContext();
    return logger.child({
      traceId: spanContext.traceId,
      spanId: spanContext.spanId,
    });
  }
  return logger;
}

export function logRequest(
  logger: PinoLogger,
  method: string,
  url: string,
  statusCode: number,
  durationMs: number,
  extra?: Record<string, unknown>,
): void {
  const log = injectTraceContext(logger);
  log.info(
    {
      method,
      url,
      statusCode,
      durationMs,
      type: "http_request",
      ...extra,
    },
    `${method} ${url} ${statusCode} ${durationMs}ms`,
  );
}

export function logError(
  logger: PinoLogger,
  error: Error,
  extra?: Record<string, unknown>,
): void {
  const log = injectTraceContext(logger);
  log.error(
    {
      err: error,
      type: "error",
      ...extra,
    },
    error.message,
  );
}

export function logAgentOperation(
  logger: PinoLogger,
  operation: string,
  status: "started" | "completed" | "failed",
  extra?: Record<string, unknown>,
): void {
  const log = injectTraceContext(logger);
  log.info(
    {
      operation,
      status,
      type: "agent_operation",
      ...extra,
    },
    `Agent operation ${operation} ${status}`,
  );
}

export { baseLogger as logger };

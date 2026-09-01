import { trace, SpanStatusCode, context, Span } from "@opentelemetry/api";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { Resource } from "@opentelemetry/resources";
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from "@opentelemetry/semantic-conventions";

let sdk: NodeSDK | null = null;

export function initTelemetry(): void {
  if (process.env["NODE_ENV"] === "test" || process.env["OTEL_SDK_DISABLED"] === "true") {
    return;
  }
  const otlpEndpoint =
    process.env["OTEL_EXPORTER_OTLP_TRACES_ENDPOINT"] ||
    "http://localhost:4318/v1/traces";
  const serviceName = process.env["OTEL_SERVICE_NAME"] || "resolvex-api";
  const serviceVersion = process.env["OTEL_SERVICE_VERSION"] || "0.1.0";

  sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    traceExporter: new OTLPTraceExporter({
      url: otlpEndpoint,
    }),
    instrumentations: [getNodeAutoInstrumentations()],
  });

  sdk.start();
  console.log(`OpenTelemetry initialized: ${serviceName} -> ${otlpEndpoint}`);

  process.on("SIGTERM", () => {
    shutdownTelemetry().catch(console.error);
  });
}

export async function shutdownTelemetry(): Promise<void> {
  if (sdk) {
    await sdk.shutdown();
    sdk = null;
    console.log("OpenTelemetry shutdown complete");
  }
}

export const tracer = trace.getTracer("resolvex-api");

export function withTracing<T>(
  name: string,
  fn: (span: Span) => Promise<T>,
): Promise<T> {
  return tracer.startActiveSpan(name, async (span) => {
    try {
      const result = await fn(span);
      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (error) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      span.recordException(error as Error);
      throw error;
    } finally {
      span.end();
    }
  });
}

export function getCorrelationId(
  headers: Record<string, string | string[] | undefined>,
): string {
  const headerValue =
    headers["x-correlation-id"] || headers["X-Correlation-ID"];
  if (headerValue) {
    const value = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    if (value) return value;
  }
  return crypto.randomUUID();
}

export function setSpanAttributes(
  span: Span,
  attributes: Record<string, string | number | boolean | undefined>,
): void {
  for (const [key, value] of Object.entries(attributes)) {
    if (value !== undefined) {
      span.setAttribute(key, value);
    }
  }
}

export function getCurrentSpan(): Span | undefined {
  return trace.getSpan(context.active());
}

export function addSpanEvent(
  name: string,
  attributes?: Record<string, string | number | boolean>,
): void {
  const span = getCurrentSpan();
  if (span) {
    span.addEvent(name, attributes);
  }
}

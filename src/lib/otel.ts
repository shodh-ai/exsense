// File: exsense/src/lib/otel.ts
/**
 * OpenTelemetry Web SDK initialization for frontend tracing
 * Connects browser traces to backend services
 */

import { WebTracerProvider } from '@opentelemetry/sdk-trace-web';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { FetchInstrumentation } from '@opentelemetry/instrumentation-fetch';
import { XMLHttpRequestInstrumentation } from '@opentelemetry/instrumentation-xml-http-request';
import { trace, context } from '@opentelemetry/api';

let isInitialized = false;

/**
 * Parse headers from environment variable
 */
function parseHeaders(envVar: string | undefined): Record<string, string> {
  if (!envVar) return {};
  const headers: Record<string, string> = {};
  envVar.split(',').forEach((part) => {
    const [key, value] = part.split('=');
    if (key && value) {
      headers[key.trim()] = value.trim();
    }
  });
  return headers;
}

/**
 * Initialize OpenTelemetry for browser
 */
export function initTelemetry(): void {
  // Only initialize once
  if (isInitialized || typeof window === 'undefined') {
    return;
  }

  // Skip if explicitly disabled
  if (process.env.NEXT_PUBLIC_OTEL_ENABLED === 'false') {
    console.log('[OTel] Disabled via NEXT_PUBLIC_OTEL_ENABLED=false');
    return;
  }

  try {
    const serviceName = process.env.NEXT_PUBLIC_OTEL_SERVICE_NAME || 'exsense-frontend';
    const serviceNamespace = process.env.NEXT_PUBLIC_OTEL_SERVICE_NAMESPACE || 'rox';

    // Determine endpoint
    const grafanaEndpoint = process.env.NEXT_PUBLIC_GRAFANA_OTLP_HTTP_ENDPOINT;
    const grafanaHeaders = parseHeaders(process.env.NEXT_PUBLIC_GRAFANA_OTLP_HEADERS);
    const genericHeaders = parseHeaders(process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_HEADERS);

    const tracesEndpoint =
      process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
      process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_ENDPOINT ||
      grafanaEndpoint ||
      'http://localhost:4318/v1/traces';

    const tracesHeaders = {
      ...grafanaHeaders,
      ...genericHeaders,
      ...parseHeaders(process.env.NEXT_PUBLIC_OTEL_EXPORTER_OTLP_TRACES_HEADERS),
    };

    // Create resource
    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: serviceNamespace,
      [SemanticResourceAttributes.SERVICE_VERSION]: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    });

    // Create provider
    const provider = new WebTracerProvider({
      resource,
    });

    // Create exporter
    const exporter = new OTLPTraceExporter({
      url: tracesEndpoint,
      headers: Object.keys(tracesHeaders).length > 0 ? tracesHeaders : undefined,
    });

    // Add span processor
    provider.addSpanProcessor(new BatchSpanProcessor(exporter));

    // Register provider
    provider.register({
      contextManager: new ZoneContextManager(),
    });

    // Build safe allowlist for CORS trace propagation
    const corsAllowlist: (string | RegExp)[] = [
      /localhost:\d+/, 
      /.*\.run\.app/,
    ];
    if (process.env.NEXT_PUBLIC_BACKEND_URL) {
      corsAllowlist.push(new RegExp(process.env.NEXT_PUBLIC_BACKEND_URL));
    }
    if (process.env.NEXT_PUBLIC_API_BASE_URL) {
      corsAllowlist.push(new RegExp(process.env.NEXT_PUBLIC_API_BASE_URL));
    }
    if (process.env.NEXT_PUBLIC_WEBRTC_TOKEN_SERVICE_URL) {
      corsAllowlist.push(new RegExp(process.env.NEXT_PUBLIC_WEBRTC_TOKEN_SERVICE_URL));
    }

    // Explicit ignore list (avoid touching Clerk endpoints)
    const ignoreList: (string | RegExp)[] = [
      /clerk\.accounts\.dev/,
      /clerk\.com/,
    ];

    // Register instrumentations
    registerInstrumentations({
      instrumentations: [
        new FetchInstrumentation({
          propagateTraceHeaderCorsUrls: corsAllowlist,
          ignoreUrls: ignoreList,
          clearTimingResources: true,
          applyCustomAttributesOnSpan: (span, request, result) => {
            if (request instanceof Request) {
              span.setAttribute('http.url', request.url);
              span.setAttribute('http.method', request.method);
            }
            if (result instanceof Response) {
              span.setAttribute('http.status_code', result.status);
            }
          },
        }),
        new XMLHttpRequestInstrumentation({
          propagateTraceHeaderCorsUrls: corsAllowlist,
          ignoreUrls: ignoreList,
        }),
      ],
    });

    isInitialized = true;
    console.log(`[OTel] ✅ Initialized for ${serviceName}`);
    console.log(`[OTel] Traces endpoint: ${tracesEndpoint}`);
  } catch (error) {
    console.error('[OTel] Failed to initialize:', error);
  }
}

/**
 * Get current trace ID for logging correlation
 */
export function getCurrentTraceId(): string | undefined {
  try {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return spanContext.traceId;
    }
  } catch (error) {
    // Silently fail
  }
  return undefined;
}

/**
 * Get current span ID for logging correlation
 */
export function getCurrentSpanId(): string | undefined {
  try {
    const span = trace.getSpan(context.active());
    if (span) {
      const spanContext = span.spanContext();
      return spanContext.spanId;
    }
  } catch (error) {
    // Silently fail
  }
  return undefined;
}

/**
 * Create a custom span for manual instrumentation
 */
export function startSpan(name: string, attributes?: Record<string, string | number | boolean>) {
  const tracer = trace.getTracer('exsense-frontend');
  return tracer.startSpan(name, {
    attributes,
  });
}

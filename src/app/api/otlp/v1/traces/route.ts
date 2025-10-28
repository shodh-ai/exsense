// File: exsense/src/app/api/otlp/v1/traces/route.ts

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function parseHeaders(envVar?: string): Record<string, string> {
  if (!envVar) return {};
  const headers: Record<string, string> = {};
  envVar.split(',').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx > -1) {
      const key = part.slice(0, idx).trim();
      const value = part.slice(idx + 1).trim();
      if (key && value) headers[key] = value;
    }
  });
  return headers;
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('origin') || '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': request.headers.get('access-control-request-headers') || 'content-type',
  };
}

export async function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  // Resolve upstream endpoint and headers from server-only env vars
  const endpoint =
    process.env.GRAFANA_OTLP_HTTP_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT && `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces` ||
    '';

  if (!endpoint) {
    return new Response('Upstream OTLP endpoint not configured', { status: 500, headers: corsHeaders(request) });
  }

  // Build headers
  const incomingContentType = request.headers.get('content-type') || 'application/json';
  const upstreamHeaders = new Headers({ 'content-type': incomingContentType });

  // Server-only auth headers (do not expose to client)
  const headerBlob = process.env.GRAFANA_OTLP_HEADERS || process.env.OTEL_EXPORTER_OTLP_TRACES_HEADERS || '';
  const extra = parseHeaders(headerBlob);
  for (const [k, v] of Object.entries(extra)) upstreamHeaders.set(k, v);

  try {
    const body = await request.arrayBuffer();

    const res = await fetch(endpoint, {
      method: 'POST',
      body,
      headers: upstreamHeaders,
      // keepalive helps avoid terminated uploads on page unloads
      keepalive: true,
      cache: 'no-store',
    });

    // Forward minimal info back to client
    const text = await res.text();
    return new Response(text || null, {
      status: res.status,
      statusText: res.statusText,
      headers: {
        ...corsHeaders(request),
      },
    });
  } catch (err: any) {
    return new Response(`Proxy error: ${err?.message || 'unknown'}`, { status: 502, headers: corsHeaders(request) });
  }
}

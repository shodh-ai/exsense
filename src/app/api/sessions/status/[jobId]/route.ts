// src/app/api/sessions/status/[jobId]/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Server-side backend URL (kept secret in env)
const BACKEND_URL_BASE = process.env.BACKEND_API_URL || 'https://api.vnc.shodh.ai/api/sessions';

// In Next.js (App Router), dynamic route params may be async.
// See: https://nextjs.org/docs/messages/sync-dynamic-apis
export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await ctx.params;

  // Preserve other query params
  const filteredSearchParams = new URLSearchParams();
  req.nextUrl.searchParams.forEach((value, key) => {
    filteredSearchParams.append(key, value);
  });
  const search = filteredSearchParams.toString();
  const url = `${BACKEND_URL_BASE}/status/${encodeURIComponent(jobId)}${search ? `?${search}` : ''}`;

  try {
    const headers = new Headers();
    const banned = new Set([
      'host',
      'connection',
      'content-length',
      'accept-encoding',
      'x-forwarded-for',
      'x-forwarded-host',
      'x-forwarded-proto',
    ]);
    req.headers.forEach((value, key) => {
      if (!banned.has(key.toLowerCase())) headers.set(key, value);
    });

    const response = await fetch(url, {
      method: 'GET',
      headers,
      // keepalive here is fine for GETs too
      keepalive: true,
    });

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const data = await response.json();
      return NextResponse.json(data, { status: response.status });
    }

    const blob = await response.blob();
    return new NextResponse(blob.stream(), {
      status: response.status,
      headers: {
        'content-type': contentType || 'application/octet-stream',
      },
    });
  } catch (error) {
    console.error('[API Proxy] Error (sessions status route):', error);
    return NextResponse.json({ error: 'API proxy error' }, { status: 500 });
  }
}

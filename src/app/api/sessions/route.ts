// src/app/api/sessions/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Server-side backend URL (kept secret in env)
const BACKEND_URL = process.env.BACKEND_API_URL || 'https://api.vnc.shodh.ai/api/sessions';

async function handler(req: NextRequest) {
  // Base route: compute path relative to /api/sessions (will be empty here)
  const path = req.nextUrl.pathname.replace('/api/sessions', '');

  // Build search string without the _method param
  const filteredSearchParams = new URLSearchParams();
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== '_method') filteredSearchParams.append(key, value);
  });
  const search = filteredSearchParams.toString();
  const url = `${BACKEND_URL}${path}${search ? `?${search}` : ''}`;

  try {
    // Build headers, filtering ones we shouldn't forward
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

    // Method override support for sendBeacon cleanups
    const override = req.nextUrl.searchParams.get('_method');
    const method = (override ? override.toUpperCase() : req.method);

    let body: BodyInit | undefined;
    if (method !== 'GET' && method !== 'HEAD') {
      // Read as text to support both JSON and other content types
      const raw = await req.text();
      body = raw.length > 0 ? raw : undefined;
      // Ensure JSON content-type if body looks like JSON and header not present
      if (body && typeof body === 'string') {
        try {
          JSON.parse(body);
          if (!headers.has('content-type')) headers.set('content-type', 'application/json');
        } catch {}
      }
    }

    const response = await fetch(url, {
      method,
      headers,
      body,
      // keepalive helps ensure DELETEs during unload are sent
      keepalive: true,
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    // Try JSON first; if it fails, stream back as-is
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
    console.error('[API Proxy] Error (base sessions route):', error);
    return NextResponse.json({ error: 'API proxy error' }, { status: 500 });
  }
}

export { handler as GET, handler as POST, handler as DELETE };

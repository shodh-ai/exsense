import { NextRequest, NextResponse } from 'next/server';

// Minimal placeholder API to support session restoration flow.
// In production, this should fetch the saved whiteboard_blocks_json by sessionId.
export async function GET(req: NextRequest) {
  // Extract sessionId from the URL since Next.js 15 route handlers do not accept a typed context arg
  const segments = req.nextUrl.pathname.split('/').filter(Boolean);
  const sessionId = segments[segments.length - 1] || '';
  // TODO: wire to backend persistence. For now, return empty feed for any session.
  return NextResponse.json({ sessionId, blocks: [] });
}

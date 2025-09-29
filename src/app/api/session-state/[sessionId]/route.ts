import { NextResponse } from 'next/server';

// Minimal placeholder API to support session restoration flow.
// In production, this should fetch the saved whiteboard_blocks_json by sessionId.
export async function GET(
  _req: Request,
  { params }: { params: { sessionId: string } }
) {
  const { sessionId } = params;
  // TODO: wire to backend persistence. For now, return empty feed for any session.
  return NextResponse.json({ sessionId, blocks: [] });
}

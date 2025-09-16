import { NextResponse } from "next/server";
import { AccessToken, type AccessTokenOptions, type VideoGrant } from "livekit-server-sdk";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL) throw new Error('LIVEKIT_URL is not defined');
    if (!API_KEY) throw new Error('LIVEKIT_API_KEY is not defined');
    if (!API_SECRET) throw new Error('LIVEKIT_API_SECRET is not defined');

    const body = await req.json();
    const room: string = body?.room;
    const identity: string = body?.identity;
    const ttlSeconds: number | undefined = body?.ttl_seconds;
    if (!room || !identity) throw new Error('room and identity are required');

    // Build token following agent-starter-react pattern
    const at = new AccessToken(API_KEY, API_SECRET, {
      identity,
      name: identity,
      ttl: ttlSeconds && Number.isFinite(ttlSeconds) ? `${Math.max(60, Math.min(86400, Math.trunc(ttlSeconds)))}s` : '15m',
    } as AccessTokenOptions);
    const grant: VideoGrant = {
      room,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };
    at.addGrant(grant);
    const token = await at.toJwt();

    return NextResponse.json({ url: LIVEKIT_URL, token }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    console.error('[api/voice/session] error', e?.message || e);
    return NextResponse.json({ error: String(e?.message || e) }, { status: 500 });
  }
}

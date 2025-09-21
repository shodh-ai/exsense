import { NextResponse } from "next/server";
import { AccessToken, type AccessTokenOptions, type VideoGrant } from "livekit-server-sdk";
import { RoomConfiguration } from "@livekit/protocol";

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;
const AGENT_NAME = process.env.LIVEKIT_AGENT_NAME || "my-voice-agent";

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (!LIVEKIT_URL) throw new Error("LIVEKIT_URL is not defined");
    if (!API_KEY) throw new Error("LIVEKIT_API_KEY is not defined");
    if (!API_SECRET) throw new Error("LIVEKIT_API_SECRET is not defined");

    const body = await req.json().catch(() => ({}));
    const room: string | undefined = body?.room;
    const identity: string | undefined = body?.identity;
    const ttlSeconds: number | undefined = body?.ttl_seconds;

    if (!room) return NextResponse.json({ error: "Missing 'room'" }, { status: 400 });
    if (!identity) return NextResponse.json({ error: "Missing 'identity'" }, { status: 400 });

    const userInfo: AccessTokenOptions = {
      identity,
      name: identity,
      ...(ttlSeconds ? { ttl: `${Math.max(60, Math.min(60 * 60, Math.floor(ttlSeconds)))}s` } : { ttl: "15m" }),
    };

    const at = new AccessToken(API_KEY, API_SECRET, userInfo);
    const grant: VideoGrant = {
      room,
      roomJoin: true,
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
    };
    at.addGrant(grant);

    // Configure the agent to auto-join this room (LiveKit Agent Worker must be running with the same agent_name)
    if (AGENT_NAME) {
      at.roomConfig = new RoomConfiguration({
        agents: [{ agentName: AGENT_NAME }],
      });
    }

    const token = await at.toJwt();

    return NextResponse.json({ url: LIVEKIT_URL, token });
  } catch (error) {
    if (error instanceof Error) {
      console.error("/api/voice/session error:", error.message);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse("Unknown error", { status: 500 });
  }
}

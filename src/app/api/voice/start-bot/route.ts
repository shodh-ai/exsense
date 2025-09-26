import { NextResponse } from "next/server";

// This route starts the voice bot associated with a room. For local development,
// we simply acknowledge and let the LiveKit Agent auto-join via roomConfig.
// If you have an external voice service, you can proxy to it by setting VOICE_BASE.
const VOICE_BASE = process.env.VOICE_BASE; // e.g., http://localhost:8090

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { room, session_id, thesis_id, mode, student_id, author_id } = body || {};

    if (!room) return NextResponse.json({ error: "Missing 'room'" }, { status: 400 });

    if (VOICE_BASE) {
      // Proxy to external service if configured
      const url = new URL("/voice/start-bot", VOICE_BASE).toString();
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, session_id, thesis_id, mode, student_id, author_id }),
      });
      const text = await res.text();
      const tryJson = (() => { try { return JSON.parse(text); } catch { return text; } })();
      return NextResponse.json(tryJson, { status: res.status });
    }

    // By default, do nothing and return OK. The token issued by /api/voice/session includes
    // a roomConfig with agent name, which should prompt the LiveKit Agent Worker to join.
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      console.error("/api/voice/start-bot error:", error.message);
      return new NextResponse(error.message, { status: 500 });
    }
    return new NextResponse("Unknown error", { status: 500 });
  }
}

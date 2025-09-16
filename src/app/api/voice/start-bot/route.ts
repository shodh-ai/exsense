import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const VOICE_INTERNAL = process.env.VOICE_INTERNAL_BASE || "http://localhost:8090";

export async function POST(req: NextRequest) {
  try {
    console.log('[api/voice/start-bot] incoming POST');
    const body = await req.json();

    // Kick off upstream call in the background; respond immediately to client
    (async () => {
      const t0 = Date.now();
      try {
        // primary attempt
        const ctrl = new AbortController();
        const to = setTimeout(() => ctrl.abort("timeout"), 10000);
        let target = `${VOICE_INTERNAL}/voice/start-bot`;
        let res: Response;
        try {
          console.log('[api/voice/start-bot] POST', target);
          res = await fetch(target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: ctrl.signal,
          });
        } catch (e) {
          // fallback via host.docker.internal
          console.warn('[api/voice/start-bot] primary fetch failed, retrying via host.docker.internal', String(e));
          const ctrl2 = new AbortController();
          const to2 = setTimeout(() => ctrl2.abort("timeout"), 10000);
          target = `http://host.docker.internal:8090/voice/start-bot`;
          console.log('[api/voice/start-bot] POST', target);
          res = await fetch(target, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: ctrl2.signal,
          }).finally(() => clearTimeout(to2));
        } finally {
          clearTimeout(to);
        }

        if (!res.ok) {
          const text = await res.text();
          console.error('[api/voice/start-bot] upstream error', res.status, text);
        } else {
          const json = await res.json().catch(() => ({}));
          console.log('[api/voice/start-bot] success in', Date.now() - t0, 'ms', json);
        }
      } catch (err) {
        console.error('[api/voice/start-bot] background error', err);
      }
    })();

    // Return immediately so the UI doesn't block on upstream timing
    return NextResponse.json({ status: 'started' }, { status: 202 });
  } catch (e: any) {
    console.error("[api/voice/start-bot] error", e?.message || e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// exsense/src/services/voice.ts
export type VoiceSessionRequest = { room: string; identity: string; ttl_seconds?: number };
export type VoiceSessionResponse = { url: string; token: string };

const EXTERNAL_VOICE_BASE = process.env.NEXT_PUBLIC_VOICE_BASE;
const IS_BROWSER = typeof window !== 'undefined';
// When no external base is configured, use Next.js API proxy to avoid CORS/PNA from the browser
function voiceBase(): string {
  if (EXTERNAL_VOICE_BASE && EXTERNAL_VOICE_BASE.trim().length) return EXTERNAL_VOICE_BASE;
  return IS_BROWSER ? '' : 'http://localhost:8090';
}

function guessLocalVoiceBase(): string | null {
  if (typeof window === 'undefined') return null;
  const proto = window.location.protocol.startsWith('https') ? 'https' : 'http';
  const host = window.location.hostname;
  return `${proto}://${host}:8090`;
}

export async function createVoiceSession(req: VoiceSessionRequest): Promise<VoiceSessionResponse> {
  try {
    const base = voiceBase();
    console.log('[voice.ts] POST /voice/session', { base, req });
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort('timeout'), 10000);
    const url = base ? `${base}/voice/session` : `/api/voice/session`;
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), cache: 'no-store', signal: ctrl.signal
    }).finally(() => clearTimeout(to));
    console.log('[voice.ts] /voice/session status', res.status);
    if (!res.ok) throw new Error(`voice/session failed: ${res.status}`);
    const json = await res.json();
    console.log('[voice.ts] /voice/session json (prefix)', { url: json?.url, tokenPrefix: String(json?.token || '').slice(0, 16) + '...' });
    return json;
  } catch (e) {
    console.error('[voice.ts] createVoiceSession error', e);
    // Dev fallback: if proxy path '/api/voice/session' timed out, retry direct to localhost:8090
    try {
      const base = voiceBase();
      if (!base && typeof window !== 'undefined') {
        const direct = guessLocalVoiceBase() || 'http://localhost:8090';
        console.warn('[voice.ts] retrying direct', { direct });
        const ctrl2 = new AbortController();
        const to2 = setTimeout(() => ctrl2.abort('timeout'), 10000);
        const res2 = await fetch(`${direct}/voice/session`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(req), cache: 'no-store', signal: ctrl2.signal
        }).finally(() => clearTimeout(to2));
        console.log('[voice.ts] direct /voice/session status', res2.status);
        if (!res2.ok) throw new Error(`voice/session failed: ${res2.status}`);
        const json2 = await res2.json();
        console.log('[voice.ts] direct /voice/session json (prefix)', { url: json2?.url, tokenPrefix: String(json2?.token || '').slice(0, 16) + '...' });
        return json2;
      }
    } catch (e2) {
      console.error('[voice.ts] direct createVoiceSession error', e2);
    }
    throw e;
  }
}

export async function startVoiceBot(params: { room: string; sessionId: string; thesisId: string; mode: 'kamikaze' | 'imprinter'; studentId?: string; authorId?: string; }): Promise<void> {
  try {
    const base = voiceBase();
    console.log('[voice.ts] POST /voice/start-bot', { base, params });
    const { room, sessionId, thesisId, mode, studentId, authorId } = params;
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort('timeout'), 10000);
    const url = base ? `${base}/voice/start-bot` : `/api/voice/start-bot`;
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room, session_id: sessionId, thesis_id: thesisId, mode, student_id: studentId, author_id: authorId }),
      signal: ctrl.signal,
    }).finally(() => clearTimeout(to));
    console.log('[voice.ts] /voice/start-bot status', res.status);
    if (!res.ok) throw new Error(`voice/start-bot failed: ${res.status}`);
  } catch (e) {
    console.error('[voice.ts] startVoiceBot error', e);
    // Dev fallback: retry direct on timeout
    try {
      const base = voiceBase();
      if (!base && typeof window !== 'undefined') {
        const direct = guessLocalVoiceBase() || 'http://localhost:8090';
        console.warn('[voice.ts] retrying direct', { direct });
        const ctrl2 = new AbortController();
        const to2 = setTimeout(() => ctrl2.abort('timeout'), 10000);
        const res2 = await fetch(`${direct}/voice/start-bot`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room: params.room, session_id: params.sessionId, thesis_id: params.thesisId, mode: params.mode, student_id: params.studentId, author_id: params.authorId }),
          signal: ctrl2.signal,
        }).finally(() => clearTimeout(to2));
        console.log('[voice.ts] direct /voice/start-bot status', res2.status);
        if (!res2.ok) throw new Error(`voice/start-bot failed: ${res2.status}`);
        return;
      }
    } catch (e2) {
      console.error('[voice.ts] direct startVoiceBot error', e2);
    }
    throw e;
  }
}

export async function tts(text: string, languageCode: string = 'en-IN', voiceName?: string): Promise<{ audio_url: string }> {
  try {
    const base = voiceBase();
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort('timeout'), 10000);
    const url = base ? `${base}/tts` : `/api/tts`;
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language_code: languageCode, voice_name: voiceName }), signal: ctrl.signal
    }).finally(() => clearTimeout(to));
    if (!res.ok) throw new Error(`tts failed: ${res.status}`);
    return res.json();
  } catch (e) {
    console.error('[voice.ts] tts error', e);
    try {
      const base = voiceBase();
      if (!base && typeof window !== 'undefined') {
        const direct = guessLocalVoiceBase() || 'http://localhost:8090';
        const ctrl2 = new AbortController();
        const to2 = setTimeout(() => ctrl2.abort('timeout'), 10000);
        const res2 = await fetch(`${direct}/tts`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, language_code: languageCode, voice_name: voiceName }), signal: ctrl2.signal
        }).finally(() => clearTimeout(to2));
        if (!res2.ok) throw new Error(`tts failed: ${res2.status}`);
        return res2.json();
      }
    } catch (e2) {
      console.error('[voice.ts] direct tts error', e2);
    }
    throw e;
  }
}

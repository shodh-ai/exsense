import { useCallback, useRef } from 'react';
import type React from 'react';
import type { Room, RemoteParticipant, TrackPublication } from 'livekit-client';
import { ConnectionState, Track } from 'livekit-client';

function toLocalStatusUrl(externalUrl: string): string {
  try {
    if (!/^https?:/i.test(externalUrl)) return externalUrl;
    const match = externalUrl.match(/\/status\/([^/?#]+)/);
    if (match && match[1]) {
      return `/api/sessions/status/${match[1]}`;
    }
  } catch {}
  return externalUrl;
}

export interface UseLiveKitConnectionArgs {
  room: Room;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  roomName: string;
  userName: string;
  userId?: string;
  courseId?: string;
  options?: { spawnAgent?: boolean; spawnBrowser?: boolean };
  setIsLoading: (v: boolean) => void;
  setConnectionError: (msg: string | null) => void;
  setLivekitUrl: (url: string) => void;
  setLivekitToken: (token: string) => void;
  setCurrentRoomName: (name: string) => void;
  setSessionManagerSessionIdState: (id: string | null) => void;
  setSessionStatusUrlState: (url: string | null) => void;
  sessionIdRef: React.MutableRefObject<string | null>;
  sessionStatusUrlRef: React.MutableRefObject<string | null>;
}

let lastGuardKey: string | null = null;

export function useLiveKitConnection(args: UseLiveKitConnectionArgs) {
  const hasConnectStartedRef = useRef(false);

  const resetConnectGuard = useCallback(() => {
    hasConnectStartedRef.current = false;
    try {
      if (typeof window !== 'undefined' && lastGuardKey) {
        sessionStorage.removeItem(lastGuardKey);
      }
    } catch {}
  }, []);

  const connectToRoom = useCallback(async () => {
    const {
      room,
      isSignedIn,
      getToken,
      roomName,
      userName,
      userId,
      courseId,
      options,
      setIsLoading,
      setConnectionError,
      setLivekitUrl,
      setLivekitToken,
      setCurrentRoomName,
      setSessionManagerSessionIdState,
      setSessionStatusUrlState,
      sessionIdRef,
      sessionStatusUrlRef,
    } = args;

    if (!userName || !courseId) {
      try { console.warn('[LK_CONNECT] skip: missing basics', { hasRoomName: !!roomName, hasUserName: !!userName, hasCourseId: !!courseId }); } catch {}
      setIsLoading(false);
      if (!courseId) setConnectionError('Missing courseId. Please provide a valid courseId in the URL.');
      return;
    }
    if (room.state === ConnectionState.Connected || room.state === ConnectionState.Connecting) {
      try { console.log('[LK_CONNECT] skip: already connecting/connected'); } catch {}
      return;
    }
    if (hasConnectStartedRef.current) {
      try { console.log('[LK_CONNECT] skip: connect already started'); } catch {}
      return;
    }

    // Cross-remount guard (TTL-based): prevent duplicate connects under Strict Mode/HMR
    try {
      if (typeof window !== 'undefined') {
        const keyBase = `${courseId || 'na'}_${userId || userName || 'anon'}`;
        const guardKey = `lk_connect_started_until_${keyBase}`;
        lastGuardKey = guardKey;
        const now = Date.now();
        const until = parseInt(sessionStorage.getItem(guardKey) || '0', 10) || 0;
        if (now < until) {
          try { console.log('[LK_CONNECT] skip: TTL guard active', { guardKey, until, now }); } catch {}
          return;
        }
        // Set a short TTL (10s) to dampen duplicate attempts
        sessionStorage.setItem(guardKey, String(now + 10000));
      }
    } catch {}

    setIsLoading(true);
    setConnectionError(null);
    hasConnectStartedRef.current = true;

    try {
      if (!isSignedIn) throw new Error('User not authenticated. Please login first.');
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error('Failed to get authentication token from Clerk.');

      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL as string | undefined;
      if (!backendUrl) throw new Error('Backend URL is not configured (NEXT_PUBLIC_API_BASE_URL)');

      // Strict single-user model: no viewer join via URL params.

      // Server-authoritative session creation: request backend to create/find stable session id for presenters
      let stableRoomName: string | null = null;
      try {
        if (courseId) {
          try {
            if (typeof window !== 'undefined') {
              const key = `lk_sess_create_until_${courseId}_${userId || userName || 'anon'}`;
              const now = Date.now();
              const until = parseInt(sessionStorage.getItem(key) || '0', 10) || 0;
              if (now < until) {
                throw new Error('Session creation throttled; please wait.');
              }
              sessionStorage.setItem(key, String(now + 15000));
            }
          } catch {}
          const createUrl = `${backendUrl}/api/sessions/create`;
          try { console.log('[LK_CREATE] POST', createUrl, { courseId }); } catch {}
          const createResp = await fetch(createUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${clerkToken}`,
            },
            body: JSON.stringify({ courseId, spawnAgent: (options && typeof options.spawnAgent === 'boolean') ? options.spawnAgent : true }),
          });

          if (!createResp.ok) {
            const errorText = await createResp.text();
            throw new Error(`Failed to create session on backend: ${createResp.status} ${errorText}`);
          }

          const createData = await createResp.json();
          try { console.log('[LK_CREATE] status', createResp.status, 'data keys', Object.keys(createData || {})); } catch {}
          if (createData && typeof createData.sessionId === 'string') {
            stableRoomName = createData.sessionId;
            try { console.log('[LK_CREATE] sessionId', stableRoomName); } catch {}
            // Capture session id for state immediately
            try {
              sessionIdRef.current = stableRoomName;
              setSessionManagerSessionIdState(stableRoomName);
            } catch {}
          } else {
            throw new Error('Backend did not return a valid sessionId.');
          }
        }
      } catch (e: any) {
        console.error('The server-authoritative session creation flow failed:', e);
        setConnectionError(`Failed to create a session: ${e?.message || String(e)}`);
        setIsLoading(false);
        hasConnectStartedRef.current = false;
        return;
      }
      // Determine the room to join (always the created session)
      const roomNameForToken = stableRoomName as string;
      if (!roomNameForToken) throw new Error('No room determined to join');

      // Fetch token using new join-room endpoint
      const tokenResp = await fetch(`${backendUrl}/api/webrtc/join-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkToken}`,
        },
        body: JSON.stringify({ room_name: roomNameForToken }),
      });
      if (!tokenResp.ok) throw new Error(`Failed to get join token: ${tokenResp.status} ${tokenResp.statusText}`);
      const tokenData = await tokenResp.json();
      const token = tokenData?.token as string | undefined;
      const wsUrl = tokenData?.wsUrl as string | undefined;
      if (!token || !wsUrl) throw new Error('Invalid token response from backend');

      setCurrentRoomName(roomNameForToken);

      // sessionId already captured for presenters above; viewers use URL param (not a sess- id)

      const sessionStatusUrl: string | undefined = undefined;
      if (sessionStatusUrl) {
        const proxied = toLocalStatusUrl(sessionStatusUrl);
        sessionStatusUrlRef.current = proxied;
        setSessionStatusUrlState(proxied);
      }

      if (!token || !wsUrl) throw new Error('Invalid token response from backend');

      setLivekitUrl(wsUrl);
      setLivekitToken(token);

      await room.connect(wsUrl, token);

      try {
        (window as any).lkRoom = room;
        room.on('participantConnected', (p: any) => {
          try { console.log('[LK] participantConnected:', p?.identity); } catch {}
          try {
            p.on?.('trackSubscribed', (track: any, pub: any, participant: any) => {
              try { console.log('[LK] trackSubscribed:', { kind: track?.kind, sid: pub?.trackSid, from: participant?.identity }); } catch {}
            });
          } catch {}
        });
        Array.from(room.remoteParticipants.values()).forEach((p: any) => {
          try {
            p.on?.('trackSubscribed', (track: any, pub: any, participant: any) => {
              try { console.log('[LK] trackSubscribed (existing p):', { kind: track?.kind, sid: pub?.trackSid, from: participant?.identity }); } catch {}
            });
          } catch {}
        });
      } catch {}

      if (sessionStatusUrl) {
        (async () => {
          try {
            const tryFetch = async () => {
              const statusUrl = sessionStatusUrlRef.current || sessionStatusUrl;
              const stResp = await fetch(statusUrl, { cache: 'no-store' });
              if (stResp.ok) {
                const st = await stResp.json();
                const sessId = st?.sessionId as string | undefined;
                if (sessId && sessId.startsWith('sess-')) {
                  sessionIdRef.current = sessId;
                  setSessionManagerSessionIdState(sessId);
                  return sessId;
                }
              }
              return null;
            };
            let sessId = await tryFetch();
            if (!sessId) {
              const MAX_ATTEMPTS = 30;
              for (let i = 0; i < MAX_ATTEMPTS; i++) {
                await new Promise((r) => setTimeout(r, 2000));
                sessId = await tryFetch();
                if (sessId) break;
              }
            }
            // If we found a sessionId and our current room differs, reconnect into that exact room
            if (sessId && room.name && room.name !== sessId) {
              try {
                console.log('[FLOW] Reconnecting to session room discovered by SessionManager:', { from: room.name, to: sessId });
              } catch {}
              try {
                const bearer = await getToken();
                const joinResp = await fetch(`${backendUrl}/api/webrtc/join-room`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
                  },
                  body: JSON.stringify({ room_name: sessId }),
                });
                if (joinResp.ok) {
                  const joinData = await joinResp.json();
                  const newToken = joinData?.token as string | undefined;
                  const newUrl = joinData?.wsUrl as string | undefined;
                  if (newToken && newUrl) {
                    try { await room.disconnect(); } catch {}
                    hasConnectStartedRef.current = false;
                    setLivekitUrl(newUrl);
                    setLivekitToken(newToken);
                    await room.connect(newUrl, newToken);
                    try { console.log('[FLOW] Reconnected to session room:', sessId); } catch {}
                  } else {
                    console.warn('[FLOW] join-room response missing token/url');
                  }
                } else {
                  console.warn('[FLOW] join-room failed:', joinResp.status, joinResp.statusText);
                }
              } catch (err) {
                console.warn('[FLOW] Failed to reconnect to session room:', err);
              }
            }
          } catch (e) {
            console.warn('[FLOW] Could not capture/reconnect to session room:', e);
          }
        })();
      }

      // Legacy dev reconnect block retained but no longer required since we reconnect above when sessionId is discovered
      const DEV_FORCE_RECONNECT = (process.env.NEXT_PUBLIC_LK_DEV_RECONNECT || '').toLowerCase() === 'true';
      if (sessionStatusUrl && DEV_FORCE_RECONNECT) {
        (async () => {
          try {
            const statusUrl = sessionStatusUrlRef.current || sessionStatusUrl;
            await new Promise((r) => setTimeout(r, 12000));
            const MAX_ATTEMPTS = 24;
            for (let i = 0; i < MAX_ATTEMPTS; i++) {
              const stResp = await fetch(statusUrl);
              if (stResp.ok) {
                const st = await stResp.json();
                const status = st?.status as string | undefined;
                const sessId = st?.sessionId as string | undefined;
                if (status === 'READY' && sessId) {
                  try {
                    const anyVideo = Array.from(room.remoteParticipants.values()).some((p: RemoteParticipant) => {
                      return Array.from(p.trackPublications.values()).some((pub: TrackPublication) => {
                        return pub.isSubscribed === true || !!pub.track;
                      });
                    });
                    if (anyVideo) break;
                  } catch {}
                  const bearer = await getToken();
                  const devResp = await fetch(`${backendUrl}/api/webrtc/dev/token-for-room`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
                    },
                    body: JSON.stringify({ room_name: sessId }),
                  });
                  if (!devResp.ok) break;
                  const devData = await devResp.json();
                  const newToken = devData?.studentToken as string | undefined;
                  const newUrl = devData?.livekitUrl as string | undefined;
                  if (!newToken || !newUrl) break;
                  try { await room.disconnect(); } catch {}
                  hasConnectStartedRef.current = false;
                  setLivekitUrl(newUrl);
                  setLivekitToken(newToken);
                  await room.connect(newUrl, newToken);
                  break;
                }
                if (status === 'FAILED') break;
              }
              await new Promise((r) => setTimeout(r, 5000));
            }
          } catch (err) {
            console.error('[FLOW] Error while polling/reconnecting to session room:', err);
          }
        })();
      }
    } catch (error: any) {
      console.error('[DIAGNOSTIC] ERROR in connectToRoom:', error);
      setConnectionError(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
      setIsLoading(false);
      hasConnectStartedRef.current = false; // allow retry on error
    }
  }, [args]);

  return { connectToRoom, resetConnectGuard };
}

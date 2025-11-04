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
  courseId?: string;
  options?: { spawnAgent?: boolean; spawnBrowser?: boolean };
  setIsLoading: (v: boolean) => void;
  setConnectionError: (msg: string | null) => void;
  setLivekitUrl: (url: string) => void;
  setLivekitToken: (token: string) => void;
  setUserRole: (role: 'presenter' | 'viewer') => void;
  setCurrentRoomName: (name: string) => void;
  setSessionManagerSessionIdState: (id: string | null) => void;
  setSessionStatusUrlState: (url: string | null) => void;
  sessionIdRef: React.MutableRefObject<string | null>;
  sessionStatusUrlRef: React.MutableRefObject<string | null>;
}

export function useLiveKitConnection(args: UseLiveKitConnectionArgs) {
  const hasConnectStartedRef = useRef(false);

  const resetConnectGuard = useCallback(() => {
    hasConnectStartedRef.current = false;
  }, []);

  const connectToRoom = useCallback(async () => {
    const {
      room,
      isSignedIn,
      getToken,
      roomName,
      userName,
      courseId,
      options,
      setIsLoading,
      setConnectionError,
      setLivekitUrl,
      setLivekitToken,
      setUserRole,
      setCurrentRoomName,
      setSessionManagerSessionIdState,
      setSessionStatusUrlState,
      sessionIdRef,
      sessionStatusUrlRef,
    } = args;

    if (!roomName || !userName || !courseId) {
      setIsLoading(false);
      if (!courseId) setConnectionError('Missing courseId. Please provide a valid courseId in the URL.');
      return;
    }
    if (room.state === ConnectionState.Connected || room.state === ConnectionState.Connecting) {
      return;
    }
    if (hasConnectStartedRef.current) {
      return;
    }

    setIsLoading(true);
    setConnectionError(null);
    hasConnectStartedRef.current = true;

    try {
      if (!isSignedIn) throw new Error('User not authenticated. Please login first.');
      const clerkToken = await getToken();
      if (!clerkToken) throw new Error('Failed to get authentication token from Clerk.');

      const tokenServiceUrl = process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL;
      if (!tokenServiceUrl) throw new Error('Missing NEXT_PUBLIC_WEBRTC_TOKEN_URL');

      const urlParams = new URLSearchParams(window.location.search);
      const roomToJoin = urlParams.get('joinRoom');

      const requestBody: any = {
        curriculum_id: courseId,
        spawn_agent: options?.spawnAgent !== false,
        spawn_browser: options?.spawnBrowser !== false,
      };
      if (roomToJoin) requestBody.room_name = roomToJoin;

      const response = await fetch(`${tokenServiceUrl}/api/webrtc/generate-room`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${clerkToken}`,
        },
        body: JSON.stringify(requestBody),
      });
      if (!response.ok) throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);

      const data = await response.json();
      if (!data.success) throw new Error('Token generation failed');

      const { studentToken: token, livekitUrl: wsUrl, roomName: actualRoomName } = data;

      setUserRole(roomToJoin ? 'viewer' : 'presenter');
      setCurrentRoomName(actualRoomName);

      try {
        const sid = (data.sessionId as string | null) || null;
        if (sid && sid.startsWith('sess-')) {
          sessionIdRef.current = sid;
          setSessionManagerSessionIdState(sid);
        }
      } catch {}

      const sessionStatusUrl: string | undefined = (data.sessionStatusUrl as string | undefined) || undefined;
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
                const tokenServiceUrl = process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL as string;
                const bearer = await getToken();
                const joinResp = await fetch(`${tokenServiceUrl}/api/webrtc/generate-room`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
                  },
                  body: JSON.stringify({
                    curriculum_id: (typeof ("" + ("")) === 'string') ? (undefined) : undefined, // placeholder (ignored by server when joining)
                    room_name: sessId,
                    spawn_agent: false,
                    spawn_browser: false,
                  }),
                });
                if (joinResp.ok) {
                  const joinData = await joinResp.json();
                  const newToken = joinData?.studentToken as string | undefined;
                  const newUrl = joinData?.livekitUrl as string | undefined;
                  if (newToken && newUrl) {
                    try { await room.disconnect(); } catch {}
                    hasConnectStartedRef.current = false;
                    setLivekitUrl(newUrl);
                    setLivekitToken(newToken);
                    await room.connect(newUrl, newToken);
                    try { console.log('[FLOW] Reconnected to session room:', sessId); } catch {}
                  } else {
                    console.warn('[FLOW] generate-room join response missing token/url');
                  }
                } else {
                  console.warn('[FLOW] generate-room join failed:', joinResp.status, joinResp.statusText);
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
                  const tokenServiceUrl = process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL as string;
                  const bearer = await getToken();
                  const devResp = await fetch(`${tokenServiceUrl}/api/webrtc/dev/token-for-room`, {
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

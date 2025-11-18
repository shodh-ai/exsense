"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Room, RemoteVideoTrack, RemoteTrackPublication, ConnectionState, RemoteParticipant, Track, RemoteTrack, VideoQuality, RoomEvent } from 'livekit-client';
import { useSessionStore } from '@/lib/store';

declare global {
  interface Window {
    lkRoom?: Room;
  }
}

interface LiveKitViewerProps {
  room: Room; // REQUIRED existing Room instance, already connected by the hook
  onInteraction?: (payload: object) => void | Promise<void>;
}

// +++ NEW HELPER FUNCTION +++
/**
 * Sends interaction data directly to your session manager backend via an HTTP POST request.
 * This function "fires and forgets" to keep the UI responsive.
 * @param payload The interaction data (e.g., { action: 'click', x: 100, y: 150 })
 */
async function sendInteractionToSessionManager(payload: object) {
  // IMPORTANT: Replace this with the actual URL of your session manager's API endpoint
  const SESSION_MANAGER_ENDPOINT = 'https://your-backend.com/api/session/interaction';

  try {
    fetch(SESSION_MANAGER_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // If your API is protected, you must add your authorization token here.
        // For example: 'Authorization': `Bearer ${yourAuthToken}`
      },
      // Keep the connection alive in case the page is being closed,
      // though for this use-case it's less critical.
      keepalive: true, 
      body: JSON.stringify(payload),
    }).catch(error => {
      // Log errors in the background if the network request fails
      console.error('[Interaction] Failed to send interaction to session manager:', error);
    });
  } catch (error) {
    console.error('[Interaction] Error constructing the fetch request for session manager:', error);
  }
}


export default function LiveKitViewer({ room, onInteraction }: LiveKitViewerProps) {
  try { console.log('[FLOW] LiveKitViewer using provided room instance'); } catch {}
  return (
    <div className="w-full h-full min-h-0" style={{ position: 'relative' }}>
      <div className="w-full h-full min-h-0" style={{ position: 'relative', zIndex: 10 }}>
        <ExplicitVideoGrid room={room} onInteraction={onInteraction} />
      </div>
    </div>
  );
}

type CaptureSize = { w: number; h: number } | null;

function ExplicitVideoGrid({ room, onInteraction }: { room: Room; onInteraction?: (payload: object) => void | Promise<void> }) {
  const [ready, setReady] = useState(false);
  const [captureSize, setCaptureSize] = useState<CaptureSize>(null);
  const [tick, setTick] = useState(0); // force re-render on room events
  const [videoTracks, setVideoTracks] = useState<{ pub: RemoteTrackPublication; track: RemoteVideoTrack }[]>([]);

  const eachVideoPublication = (p: RemoteParticipant, fn: (pub: RemoteTrackPublication) => void) => {
    try {
      p.trackPublications.forEach((pub) => {
        if (pub?.kind === Track.Kind.Video) fn(pub);
      });
    } catch {}
  };

  useEffect(() => {
    try {
      window.lkRoom = room;
      console.log('[DEV] window.lkRoom set');
    } catch {}
    return () => {
      try {
        if (window.lkRoom === room) delete window.lkRoom;
      } catch {}
    };
  }, [room]);

  const rebuildFromRoom = () => {
    const next: { pub: RemoteTrackPublication; track: RemoteVideoTrack }[] = [];
    room.remoteParticipants.forEach((p: RemoteParticipant) => {
      eachVideoPublication(p, (pub) => {
        if (pub.kind === Track.Kind.Video) {
          const track = pub.track as RemoteVideoTrack | undefined;
          if (track && track.sid) {
            next.push({ pub, track });
          }
        }
      });
    });
    setVideoTracks(next);
  };

  useEffect(() => {
    const force = () => setTick((x) => x + 1);
    const onSub = (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) rebuildFromRoom();
    };
    const onUnsub = (track: RemoteTrack, pub: RemoteTrackPublication, participant: RemoteParticipant) => {
      if (track.kind === Track.Kind.Video) rebuildFromRoom();
    };
    const onPub = (pub: RemoteTrackPublication) => {
      if (pub.kind === Track.Kind.Video) {
        pub.setSubscribed(true);
        pub.setVideoQuality(VideoQuality.HIGH);
        try {
          const videoTrack = pub.videoTrack;
          if (videoTrack) {
            pub.setVideoQuality(VideoQuality.HIGH);
          }
        } catch (e) {
          console.warn('[LK][viewer] Could not set video track quality:', e);
        }
        console.log('[LK][viewer] Requested HIGH quality for new video track');
      }
    };

    const onData = async (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const txt = new TextDecoder().decode(payload);
        const obj = JSON.parse(txt);
        if (obj && typeof obj === 'object') {
          if (obj.type === 'clipboard_content' && typeof obj.content === 'string') {
            const text = obj.content;
            try {
              await navigator.clipboard.writeText(text);
              console.log('[LK][viewer] Copied from remote to local clipboard.');
            } catch (err) {
              try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus(); ta.select();
                const ok = document.execCommand && document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) console.log('[LK][viewer] Copied via execCommand fallback.');
                else console.error('[LK][viewer] execCommand fallback failed.');
              } catch (fallbackErr) {
                console.error('[LK][viewer] Clipboard write failed with fallback:', fallbackErr);
              }
            }
          }
          const w = Number(obj.width || obj.w);
          const h = Number(obj.height || obj.h);
          if (obj.type === 'meta' && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
            setCaptureSize({ w, h });
            console.log('[LK][viewer] capture meta received', { w, h, from: participant?.identity });
          }
        }
      } catch {}
    };

    room.on(RoomEvent.ParticipantConnected, force);
    room.on(RoomEvent.ParticipantDisconnected, force);
    room.on(RoomEvent.TrackPublished, onPub);
    room.on(RoomEvent.TrackSubscribed, onSub);
    room.on(RoomEvent.TrackUnsubscribed, onUnsub);
    room.on(RoomEvent.DataReceived, onData);

    rebuildFromRoom();

    return () => {
      room.off(RoomEvent.ParticipantConnected, force);
      room.off(RoomEvent.ParticipantDisconnected, force);
      room.off(RoomEvent.TrackPublished, onPub);
      room.off(RoomEvent.TrackSubscribed, onSub);
      room.off(RoomEvent.TrackUnsubscribed, onUnsub);
      room.off(RoomEvent.DataReceived, onData);
    };
  }, [room]);

  useEffect(() => {
    const t = setInterval(() => {
      room.remoteParticipants.forEach((p) => {
        eachVideoPublication(p as RemoteParticipant, (pub: RemoteTrackPublication) => {
          if (!pub.isSubscribed) {
            try { pub.setSubscribed(true); } catch {}
          }
          if (pub.kind === Track.Kind.Video) {
            try { pub.setVideoQuality(VideoQuality.HIGH); } catch {}
          }
        });
      });
    }, 4000);
    return () => clearInterval(t);
  }, [room]);
  
  useEffect(() => {
    videoTracks.forEach(({ pub, track }) => {
      if (pub.kind === Track.Kind.Video) {
        pub.setVideoQuality(VideoQuality.HIGH);
        try {
          const mediaStreamTrack = track.mediaStreamTrack;
          if (mediaStreamTrack && 'getSettings' in mediaStreamTrack) {
            const settings = mediaStreamTrack.getSettings();
            console.log('[LK][viewer] Current video settings:', settings);
          }
          if ('setPreferredLayers' in track) (track as any).setPreferredLayers({ spatial: 2, temporal: 2 });
          if ('setMaxBitrate' in track) (track as any).setMaxBitrate(8000000);
        } catch (e) {
          console.warn('[LK][viewer] Could not set advanced quality settings:', e);
        }
      }
    });
  }, [videoTracks]);

  useEffect(() => {
    if (videoTracks.length > 0 && !ready) setReady(true);
  }, [videoTracks, ready]);

  if (!ready || videoTracks.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-300">
        Waiting for remote video...
      </div>
    );
  }

  return (
    <div className="w-full h-full min-h-0 grid grid-cols-1 auto-rows-fr gap-2 overflow-hidden">
      {videoTracks.map(({ pub, track }) => (
        <VideoRenderer key={track.sid} room={room} track={track} pub={pub} onInteraction={onInteraction} captureSize={captureSize || undefined} />
      ))}
    </div>
  );
}

function VideoRenderer({ room, track, pub, onInteraction, captureSize }: { room: Room; track: RemoteVideoTrack, pub: RemoteTrackPublication, onInteraction?: (payload: object) => void | Promise<void>, captureSize?: { w: number; h: number } }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef<object[]>([]);
  
  const userRole = useSessionStore((s) => s.userRole);
  const isViewer = userRole === 'viewer';
  const flushingRef = useRef<boolean>(false);
  const resizeDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const modifiersRef = useRef<{ Control: boolean; Shift: boolean; Alt: boolean; Meta: boolean }>({
    Control: false, Shift: false, Alt: false, Meta: false,
  });

  useEffect(() => {
    const el = videoRef.current;
    if (el) track.attach(el);
    return () => { if (el) track.detach(el); };
  }, [track]);

  useEffect(() => {
    const c = containerRef.current;
    if (c) {
      try { c.focus(); } catch {}
    }
  }, []);

  // This function remains for data that MUST be sent via LiveKit (e.g., clipboard)
  const publishOrQueue = useCallback(async (payload: object) => {
    if (room.state !== ConnectionState.Connected) {
      if (onInteraction) await onInteraction(payload);
      return;
    }
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      let browserId: string | null = null;
      try {
        room.remoteParticipants.forEach((p: RemoteParticipant) => {
          const id = String(p.identity || '');
          if (!browserId && id.startsWith('browser-bot-')) browserId = id;
        });
      } catch {}
      try {
        if (browserId) {
          await room.localParticipant.publishData(bytes, { destinationIdentities: [browserId], reliable: true } as any);
        } else {
          await room.localParticipant.publishData(bytes, { reliable: true } as any);
        }
      } catch {
        await room.localParticipant.publishData(bytes);
      }
    } catch (e) {
      console.warn('[Interaction] publishData failed, queuing:', e);
      pendingRef.current.push(payload);
      if (!flushingRef.current) {
        flushingRef.current = true;
        const intervalId = setInterval(async () => {
          if (room.state === ConnectionState.Connected && pendingRef.current.length > 0) {
            const p = pendingRef.current.shift();
            if (p) await publishOrQueue(p);
          } else if (pendingRef.current.length === 0) {
            clearInterval(intervalId);
            flushingRef.current = false;
          }
        }, 500);
      }
    }
  }, [room, onInteraction]);

  // --- MODIFIED ---
  // Effect for observing the container's size and reporting it directly to the session manager
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          if (resizeDebounceTimer.current) {
            clearTimeout(resizeDebounceTimer.current);
          }
          resizeDebounceTimer.current = setTimeout(() => {
            try { console.log(`[ResizeDebounced] Sending new size: ${Math.round(width)}x${Math.round(height)}`); } catch {}
            // Send resize events directly to the session manager
            sendInteractionToSessionManager({ type: "resize", width: Math.round(width), height: Math.round(height) });
          }, 250);
        }
      }
    });
    resizeObserver.observe(container);
    return () => {
      resizeObserver.disconnect();
      if (resizeDebounceTimer.current) {
        clearTimeout(resizeDebounceTimer.current);
        resizeDebounceTimer.current = null;
      }
    };
  }, []); // Dependency array is now empty

  const calculateCoords = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return null;

    const videoRect = video.getBoundingClientRect();
    const intrinsicW = video.videoWidth || videoRect.width;
    const intrinsicH = video.videoHeight || videoRect.height;

    const scaleContain = Math.min(videoRect.width / intrinsicW, videoRect.height / intrinsicH);
    const displayW = intrinsicW * scaleContain;
    const displayH = intrinsicH * scaleContain;
    const contentLeft = videoRect.left + (videoRect.width - displayW) / 2;
    const contentTop = videoRect.top + (videoRect.height - displayH) / 2;

    const localX = event.clientX - contentLeft;
    const localY = event.clientY - contentTop;

    if (localX < 0 || localY < 0 || localX > displayW || localY > displayH) return null;

    const intrinsicX = localX / scaleContain;
    const intrinsicY = localY / scaleContain;

    let x = intrinsicX;
    let y = intrinsicY;
    if (captureSize && captureSize.w > 0 && captureSize.h > 0 && intrinsicW > 0 && intrinsicH > 0) {
      const scaleX = captureSize.w / intrinsicW;
      const scaleY = captureSize.h / intrinsicH;
      x *= scaleX;
      y *= scaleY;
    }
    x = Math.floor(x);
    y = Math.floor(y);
    return {
      x: Math.max(0, Math.min((captureSize?.w ?? intrinsicW) - 1, x)),
      y: Math.max(0, Math.min((captureSize?.h ?? intrinsicH) - 1, y)),
    };
  };

  // --- MODIFIED ---
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    if (isViewer) {
      console.log("[LiveKitViewer] Viewer mode: click interaction blocked");
      return;
    }
    
    try { containerRef.current?.focus(); } catch {}
    const coords = calculateCoords(event);
    
    // Debug logging can remain as it is helpful
    try { /* ... your debug log ... */ } catch {}
    
    if (coords) {
      // Send click events directly to the session manager
      sendInteractionToSessionManager({ action: 'click', ...coords, button: 'left' });
    }
  };

  // --- MODIFIED ---
  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    if (isViewer) {
      console.log("[LiveKitViewer] Viewer mode: right-click interaction blocked");
      return;
    }
    
    const coords = calculateCoords(event);
    if (coords) {
      // Send right-click events directly to the session manager
      sendInteractionToSessionManager({ action: 'click', ...coords, button: 'right' });
    }
  };

  // --- MODIFIED ---
  const handleKeyDown = async (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    if (isViewer) {
      console.log("[LiveKitViewer] Viewer mode: keyboard interaction blocked");
      return;
    }
    
    const key = event.key;
    const isPaste = (event.ctrlKey || event.metaKey) && key.toLowerCase() === 'v';
    const isCopy = (event.ctrlKey || event.metaKey) && key.toLowerCase() === 'c';

    // KEEP clipboard paste logic via LiveKit
    if (isPaste) {
      try {
        const text = await navigator.clipboard.readText();
        if (text) publishOrQueue({ type: 'paste', content: text });
      } catch (err) {
        console.error("Failed to read from local clipboard for paste:", err);
      }
      return;
    }
    
    if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
      modifiersRef.current[key as 'Control'|'Shift'|'Alt'|'Meta'] = true;
      return;
    }
    
    const activeModifiers = Object.entries(modifiersRef.current)
        .filter(([, isActive]) => isActive)
        .map(([k]) => k);
        
    const payload = (key.length === 1 && activeModifiers.length === 0)
        ? { action: 'type', text: key }
        : { action: 'keypress', key, modifiers: activeModifiers };
        
    // Send standard key presses directly to the session manager
    await sendInteractionToSessionManager(payload);

    // KEEP clipboard copy request via LiveKit
    if (isCopy) {
      setTimeout(() => {
        publishOrQueue({ type: "get_clipboard" });
      }, 100); 
    }
  };

  const handleKeyUp = (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const key = event.key;
    if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
      modifiersRef.current[key as 'Control'|'Shift'|'Alt'|'Meta'] = false;
    }
  };

  // --- MODIFIED ---
  const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const coords = calculateCoords(event as any);

    // Send scroll events directly to the session manager
    if (coords) {
      sendInteractionToSessionManager({ action: 'scroll', dx: event.deltaX, dy: event.deltaY, x: coords.x, y: coords.y });
    } else {
      sendInteractionToSessionManager({ action: 'scroll', dx: event.deltaX, dy: event.deltaY });
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black rounded shadow-lg cursor-default"
      style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onWheel={handleScroll}
      tabIndex={0}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        draggable={false}
        onDragStart={(e) => e.preventDefault()}
        className="w-full h-full"
        style={{ objectFit: 'contain', userSelect: 'none', WebkitUserSelect: 'none', backgroundColor: 'transparent' }}
      />
    </div>
  );
}
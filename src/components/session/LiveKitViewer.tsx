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

  // Robust iterator for remote participant video publications across SDK variations
  const eachVideoPublication = (p: RemoteParticipant, fn: (pub: RemoteTrackPublication) => void) => {
    try {
      p.trackPublications.forEach((pub) => {
        if (pub?.kind === Track.Kind.Video) fn(pub);
      });
    } catch {}
  };

  // Expose the LiveKit room for DevTools-based testing
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

  // Helper to rebuild videoTracks from current room state
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
        // CRITICAL FIX: Request HIGH quality AND disable adaptive layers immediately
        pub.setSubscribed(true);
        pub.setVideoQuality(VideoQuality.HIGH);
        // Force the track to use maximum quality settings
        try {
          const videoTrack = pub.videoTrack;
          if (videoTrack) {
            // Request the highest available layer
            pub.setVideoQuality(VideoQuality.HIGH);
          }
        } catch (e) {
          console.warn('[LK][viewer] Could not set video track quality:', e);
        }
        console.log('[LK][viewer] Requested HIGH quality for new video track');
      }
    };

    // Main data handler
    const onData = async (payload: Uint8Array, participant?: RemoteParticipant) => {
      try {
        const txt = new TextDecoder().decode(payload);
        const obj = JSON.parse(txt);
        if (obj && typeof obj === 'object') {
          // Handle remote clipboard content
          if (obj.type === 'clipboard_content' && typeof obj.content === 'string') {
            const text = obj.content;
            try {
              await navigator.clipboard.writeText(text);
              console.log('[LK][viewer] Copied from remote to local clipboard.');
            } catch (err) {
              // Fallback: hidden textarea + execCommand('copy')
              try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand && document.execCommand('copy');
                document.body.removeChild(ta);
                if (ok) {
                  console.log('[LK][viewer] Copied via execCommand fallback.');
                } else {
                  console.error('[LK][viewer] execCommand fallback failed.');
                }
              } catch (fallbackErr) {
                console.error('[LK][viewer] Clipboard write failed with fallback:', fallbackErr);
              }
            }
          }
          // Handle capture metadata
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

  // CRITICAL: Watchdog to ensure HIGH quality is maintained
  useEffect(() => {
    const t = setInterval(() => {
      room.remoteParticipants.forEach((p) => {
        // Iterate robustly across SDK versions
        eachVideoPublication(p as RemoteParticipant, (pub: RemoteTrackPublication) => {
          if (!pub.isSubscribed) {
            try { pub.setSubscribed(true); } catch {}
          }
          // CRITICAL: Re-request HIGH quality periodically to prevent quality degradation
          if (pub.kind === Track.Kind.Video) {
            try { pub.setVideoQuality(VideoQuality.HIGH); } catch {}
          }
        });
      });
    }, 4000);
    return () => clearInterval(t);
  }, [room]);

  // CRITICAL: Force MAXIMUM quality - bypass all LiveKit optimizations
  useEffect(() => {
    videoTracks.forEach(({ pub, track }) => {
      if (pub.kind === Track.Kind.Video) {
        // Try every possible quality setting
        pub.setVideoQuality(VideoQuality.HIGH);
        
        try {
          // Access the underlying MediaStreamTrack
          const mediaStreamTrack = track.mediaStreamTrack;
          if (mediaStreamTrack && 'getSettings' in mediaStreamTrack) {
            const settings = mediaStreamTrack.getSettings();
            console.log('[LK][viewer] Current video settings:', settings);
          }
          
          // Request maximum bandwidth and layers
          if ('setPreferredLayers' in track) {
            (track as any).setPreferredLayers({ spatial: 2, temporal: 2 });
          }
          
          // Try to disable all adaptive features on the track itself
          if ('setMaxBitrate' in track) {
            (track as any).setMaxBitrate(8000000); // 8 Mbps
          }
        } catch (e) {
          console.warn('[LK][viewer] Could not set advanced quality settings:', e);
        }
      }
    });
  }, [videoTracks]);

  // Wait gate: mark ready once at least one RemoteVideoTrack is present
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
  
  // Check if user is a viewer (viewers cannot send interactions)
  const userRole = useSessionStore((s) => s.userRole);
  const isViewer = userRole === 'viewer';
  const flushingRef = useRef<boolean>(false);
  // Debounce timer for resize events so we don't flood the backend while dragging
  const resizeDebounceTimer = useRef<NodeJS.Timeout | null>(null);
  const modifiersRef = useRef<{ Control: boolean; Shift: boolean; Alt: boolean; Meta: boolean }>({
    Control: false, Shift: false, Alt: false, Meta: false,
  });

  useEffect(() => {
    const el = videoRef.current;
    if (el) track.attach(el);
    return () => { if (el) track.detach(el); };
  }, [track]);

  // Ensure the container is focused so keyboard events work without extra clicks
  useEffect(() => {
    const c = containerRef.current;
    if (c) {
      try { c.focus(); } catch {}
    }
  }, []);

  const publishOrQueue = useCallback(async (payload: object) => {
    if (room.state !== ConnectionState.Connected) {
      if (onInteraction) await onInteraction(payload);
      return;
    }
    try {
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      // Resolve the browser-bot participant (prefer SID for legacy positional API)
      let browserIdentity: string | null = null;
      let browserSid: string | null = null;
      try {
        room.remoteParticipants.forEach((p: RemoteParticipant) => {
          const id = String(p.identity || '');
          if (!browserIdentity && id.startsWith('browser-bot-')) {
            browserIdentity = id;
            try { browserSid = (p as any).sid || null; } catch {}
          }
        });
      } catch {}

      // If no target is known yet, queue instead of broadcasting to avoid agent receiving input events
      if (!browserIdentity && !browserSid) {
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
        return;
      }

      // Try multiple targeted send variants for broad SDK compatibility, never broadcast
      let sent = false;
      // 1) Legacy positional signature with SID array
      if (!sent && browserSid) {
        try {
          await (room.localParticipant.publishData as any)(bytes, true, [browserSid]);
          sent = true;
        } catch {}
      }
      // 2) Options API with destinationIdentities
      if (!sent && browserIdentity) {
        try {
          await room.localParticipant.publishData(bytes, { destinationIdentities: [browserIdentity], reliable: true } as any);
          sent = true;
        } catch {}
      }
      // 3) Options API with destination (SIDs)
      if (!sent && browserSid) {
        try {
          await room.localParticipant.publishData(bytes, { destination: [browserSid], reliable: true } as any);
          sent = true;
        } catch {}
      }

      // If still not sent (SDK mismatch), requeue instead of broadcasting
      if (!sent) {
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

  // Effect for observing the container's size and reporting it to the backend
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          // Debounce rapid resize storms (e.g., during window drag)
          if (resizeDebounceTimer.current) {
            clearTimeout(resizeDebounceTimer.current);
          }
          resizeDebounceTimer.current = setTimeout(() => {
            try { console.log(`[ResizeDebounced] Sending new size: ${Math.round(width)}x${Math.round(height)}`); } catch {}
            publishOrQueue({ type: "resize", width: Math.round(width), height: Math.round(height) });
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
  }, [publishOrQueue]);

  const calculateCoords = (event: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return null;

    const videoRect = video.getBoundingClientRect();
    // Intrinsic size of the decoded video as displayed by the <video> element
    const intrinsicW = video.videoWidth || videoRect.width;
    const intrinsicH = video.videoHeight || videoRect.height;

    // Contain the intrinsic video inside the element to compute actual content rect
    const scaleContain = Math.min(videoRect.width / intrinsicW, videoRect.height / intrinsicH);
    const displayW = intrinsicW * scaleContain;
    const displayH = intrinsicH * scaleContain;
    const contentLeft = videoRect.left + (videoRect.width - displayW) / 2;
    const contentTop = videoRect.top + (videoRect.height - displayH) / 2;

    const localX = event.clientX - contentLeft;
    const localY = event.clientY - contentTop;

    // Ignore clicks outside the actual displayed content
    if (localX < 0 || localY < 0 || localX > displayW || localY > displayH) return null;

    // Map to intrinsic coordinates first
    const intrinsicX = localX / scaleContain;
    const intrinsicY = localY / scaleContain;

    // Map to capture resolution if known (server's original capture size)
    // This keeps click accuracy even if LiveKit scaled the video.
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

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    
    // Viewers cannot send interactions
    if (isViewer) {
      console.log("[LiveKitViewer] Viewer mode: click interaction blocked");
      return;
    }
    
    try { containerRef.current?.focus(); } catch {}
    const coords = calculateCoords(event);
    try {
      const video = videoRef.current;
      const rect = video?.getBoundingClientRect();
      const debug = {
        coords,
        client: { x: event.clientX, y: event.clientY },
        videoRect: rect ? { w: rect.width, h: rect.height, left: rect.left, top: rect.top } : null,
        intrinsic: video ? { w: video.videoWidth, h: video.videoHeight } : null,
        capture: captureSize || null,
      };
      console.log("[CLICK DEBUG]", debug);
    } catch {}
    console.log("CLICKED", coords);
    if (coords) {
      publishOrQueue({ action: 'click', ...coords, button: 'left' });
    }
  };

  const handleContextMenu = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    // Viewers cannot send interactions
    if (isViewer) {
      console.log("[LiveKitViewer] Viewer mode: right-click interaction blocked");
      return;
    }
    
    const coords = calculateCoords(event);
    if (coords) {
      publishOrQueue({ action: 'click', ...coords, button: 'right' });
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    
    // Viewers cannot send interactions
    if (isViewer) {
      console.log("[LiveKitViewer] Viewer mode: keyboard interaction blocked");
      return;
    }
    
    const key = event.key;

    // Handle Copy & Paste first
    const isPaste = (event.ctrlKey || event.metaKey) && key.toLowerCase() === 'v';
    const isCopy = (event.ctrlKey || event.metaKey) && key.toLowerCase() === 'c';

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
    
    // Send standard key press
    const activeModifiers = Object.entries(modifiersRef.current)
        .filter(([, isActive]) => isActive)
        .map(([k]) => k);
        
    const payload = (key.length === 1 && activeModifiers.length === 0)
        ? { action: 'type', text: key }
        : { action: 'keypress', key, modifiers: activeModifiers };
    await publishOrQueue(payload);

    // If it was a copy command, request remote clipboard content
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

  const handleScroll = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const coords = calculateCoords(event as any);
    if (coords) {
      publishOrQueue({ action: 'scroll', dx: event.deltaX, dy: event.deltaY, x: coords.x, y: coords.y });
    } else {
      publishOrQueue({ action: 'scroll', dx: event.deltaX, dy: event.deltaY });
    }
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full bg-black rounded shadow-lg cursor-default"
      style={{ outline: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} // Hide focus ring & prevent selection
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onWheel={handleScroll}
      tabIndex={0} // Makes the div focusable
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

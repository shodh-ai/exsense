"use client";
import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import { Track, RemoteTrack, RemoteVideoTrack, RemoteTrackPublication, VideoQuality, RoomEvent, ConnectionState, Room, RemoteParticipant } from 'livekit-client';

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
        pub.setSubscribed(true);
        pub.setVideoQuality(VideoQuality.HIGH);
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
            try {
              await navigator.clipboard.writeText(obj.content);
              console.log('[LK][viewer] Copied from remote to local clipboard.');
            } catch (err) {
              console.error('[LK][viewer] Failed to write to local clipboard:', err);
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

  // Watchdog: periodically ensure we remain subscribed to remote video pubs
  useEffect(() => {
    const t = setInterval(() => {
      room.remoteParticipants.forEach((p) => {
        // Iterate robustly across SDK versions
        eachVideoPublication(p as RemoteParticipant, (pub: RemoteTrackPublication) => {
          if (!pub.isSubscribed) {
            try { pub.setSubscribed(true); } catch {}
          }
        });
      });
    }, 4000);
    return () => clearInterval(t);
  }, [room]);

  // Force high quality for any tracked video publications
  useEffect(() => {
    videoTracks.forEach(({ pub }) => {
      if (pub.kind === Track.Kind.Video) pub.setVideoQuality(VideoQuality.HIGH);
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
  const flushingRef = useRef<boolean>(false);
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
      await room.localParticipant.publishData(bytes, { reliable: true });
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
          publishOrQueue({ type: "resize", width: Math.round(width), height: Math.round(height) });
        }
      }
    });
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
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
    const coords = calculateCoords(event);
    if (coords) {
      publishOrQueue({ action: 'click', ...coords, button: 'right' });
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLDivElement>) => {
    event.preventDefault();
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
    publishOrQueue({ action: 'scroll', dx: event.deltaX, dy: event.deltaY });
  };

  return (
    <div
      ref={containerRef}
      className="h-full aspect-[16/9] bg-transparent rounded shadow-lg cursor-crosshair overflow-scroll"
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
        className="w-full h-full aspect-[16/9]"
        style={{ objectFit: 'contain', userSelect: 'none', WebkitUserSelect: 'none', backgroundColor: 'transparent' }}
      />
    </div>
  );
}
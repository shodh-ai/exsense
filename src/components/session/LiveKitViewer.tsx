"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { Track, RemoteVideoTrack, TrackPublication, VideoQuality, RoomEvent, ConnectionState, Room, RemoteParticipant } from 'livekit-client';

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
  const [videoTracks, setVideoTracks] = useState<{ pub: any; track: RemoteVideoTrack }[]>([]);

  // Expose the LiveKit room and a helper sender for DevTools-based testing
  useEffect(() => {
    try {
      (window as any).lkRoom = room;
      (window as any).lkSend = (obj: any) => {
        try {
          const bytes = new TextEncoder().encode(JSON.stringify(obj));
          (room as any)?.localParticipant?.publishData?.(bytes, { reliable: true });
          console.log('[DEV] lkSend published', obj);
        } catch (e) {
          console.warn('[DEV] lkSend failed', e);
        }
      };
      console.log('[DEV] window.lkRoom and window.lkSend set');
    } catch {}
    return () => {
      try {
        if ((window as any).lkRoom === room) delete (window as any).lkRoom;
        if ((window as any).lkSend) delete (window as any).lkSend;
      } catch {}
    };
  }, [room]);

  // Helper to rebuild videoTracks from current room state
  const rebuildFromRoom = () => {
    const next: { pub: any; track: RemoteVideoTrack }[] = [];
    try {
      room.remoteParticipants.forEach((p: RemoteParticipant) => {
        p.trackPublications.forEach((pub) => {
          try {
            if (pub?.kind === Track.Kind.Video) {
              const t = pub.track as RemoteVideoTrack | undefined;
              if (t && typeof t.attach === 'function') {
                next.push({ pub, track: t });
              }
            }
          } catch {}
        });
      });
    } catch {}
    setVideoTracks(next);
  };

  useEffect(() => {
    // Room-level diagnostics and force re-render on relevant events
    try {
      const force = () => setTick((x) => x + 1);
      const onPc = (p: any) => { try { console.log('[LK][viewer] participantConnected:', p?.identity); } catch {} force(); };
      const onPd = (p: any) => { try { console.log('[LK][viewer] participantDisconnected:', p?.identity); } catch {} force(); };
      const onPub = (pub: any, p: any) => {
        try {
          console.log('[LK][viewer] trackPublished:', { from: p?.identity, kind: pub?.kind, source: pub?.source, sid: pub?.trackSid });
          if (pub?.kind === Track.Kind.Video && typeof (pub as any)?.setSubscribed === 'function') {
            (pub as any).setSubscribed(true);
            if (typeof (pub as any)?.setVideoQuality === 'function') (pub as any).setVideoQuality(VideoQuality.HIGH);
            console.log('[LK][viewer] explicitly subscribed to new video pub', pub?.trackSid);
          }
        } catch {}
        rebuildFromRoom();
      };
      const onSub = (track: any, pub: any, p: any) => {
        try { console.log('[LK][viewer] trackSubscribed:', { from: p?.identity, kind: track?.kind, sid: pub?.trackSid }); } catch {}
        try {
          if (track?.kind === Track.Kind.Video) {
            setVideoTracks((prev) => {
              const exists = prev.some((v) => v.track.sid === track.sid || v.pub?.trackSid === pub?.trackSid);
              return exists ? prev : [...prev, { pub, track } as any];
            });
          }
        } catch {}
        force();
      };
      const onUnsub = (track: any, pub: any, p: any) => {
        try {
          console.log('[LK][viewer] trackUnsubscribed:', { from: p?.identity, kind: track?.kind, sid: pub?.trackSid });
          (pub as any)?.setSubscribed?.(true);
          console.log('[LK][viewer] re-subscribed to publication', pub?.trackSid);
        } catch (e) {
          console.warn('[LK][viewer] failed to re-subscribe on unsubscribe:', e);
        }
        try {
          setVideoTracks((prev) => prev.filter((v) => v.track.sid !== track?.sid && v.pub?.trackSid !== pub?.trackSid));
        } catch {}
        force();
      };
      const onData = (payload: Uint8Array, participant?: any) => {
        try {
          const txt = new TextDecoder().decode(payload);
          const obj = JSON.parse(txt);
          if (obj && typeof obj === 'object') {
            const w = Number(obj.width || obj.w);
            const h = Number(obj.height || obj.h);
            if (obj.type === 'meta' && Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
              setCaptureSize({ w, h });
              console.log('[LK][viewer] capture meta received', { w, h, from: participant?.identity });
            }
          }
        } catch {}
      };
      room.on(RoomEvent.ParticipantConnected, onPc);
      room.on(RoomEvent.ParticipantDisconnected, onPd);
      room.on(RoomEvent.TrackPublished, onPub);
      room.on(RoomEvent.TrackSubscribed, onSub);
      room.on(RoomEvent.TrackUnsubscribed, onUnsub);
      room.on(RoomEvent.DataReceived as any, onData);
      // Seed from current room state at mount
      rebuildFromRoom();
      return () => {
        room.off(RoomEvent.ParticipantConnected, onPc);
        room.off(RoomEvent.ParticipantDisconnected, onPd);
        room.off(RoomEvent.TrackPublished, onPub);
        room.off(RoomEvent.TrackSubscribed, onSub);
        room.off(RoomEvent.TrackUnsubscribed, onUnsub);
        room.off(RoomEvent.DataReceived as any, onData);
      };
    } catch {}
  }, [room]);

  // Disable adaptive stream & dynacast and enforce default subscription
  useEffect(() => {
    try {
      (room as any)?.setAdaptiveStream?.(false);
      (room as any)?.setDynacast?.(false);
      (room as any)?.setDefaultSubscription?.(true);
      console.log('[LK][viewer] disabled adaptiveStream/dynacast and enabled default subscription');
    } catch {}
  }, [room]);

  // Watchdog: periodically ensure we remain subscribed to remote video pubs
  useEffect(() => {
    const t = setInterval(() => {
      try {
        room.remoteParticipants.forEach((p) => {
          try {
            const pubs: any[] = Array.from(((p as any)?.trackPublications?.values?.() || []) as any);
            pubs.forEach((pub: any) => {
              if (pub?.kind === Track.Kind.Video && typeof pub?.setSubscribed === 'function' && pub?.isSubscribed === false) {
                pub.setSubscribed(true);
              }
            });
          } catch {}
        });
      } catch {}
    }, 4000);
    return () => clearInterval(t);
  }, [room]);

  useEffect(() => {
    try {
      const infos: { id: string; vids: number }[] = [];
      room.remoteParticipants.forEach((p) => {
        try {
          const count = Array.from((p as any)?.trackPublications?.values?.() || []).filter((pub: any) => pub?.kind === Track.Kind.Video).length;
          infos.push({ id: (p as any)?.identity, vids: count });
        } catch {
          infos.push({ id: (p as any)?.identity, vids: 0 });
        }
      });
      console.log('[LK][viewer] participants:', infos);
    } catch {}
  }, [room, tick, videoTracks.length]);

  useEffect(() => {
    // Force ensure subscribed and prefer high quality for any tracked video publications
    try {
      (videoTracks as any[]).forEach(({ pub }: any) => {
        if (!pub) return;
        try {
          if (typeof pub?.setSubscribed === 'function' && pub?.isSubscribed === false) {
            pub.setSubscribed(true);
            console.log('[FLOW] Forcing subscribe to video publication', { sid: pub.trackSid, source: pub.source });
          }
        } catch (e) {
          console.warn('[FLOW] Failed to force subscribe:', e);
        }
        try {
          if (typeof pub?.setVideoQuality === 'function') {
            pub.setVideoQuality(VideoQuality.HIGH);
          }
        } catch {}
      });
    } catch {}
  }, [videoTracks]);

  // Wait gate: mark ready once at least one RemoteVideoTrack is present
  useEffect(() => {
    const hasAny = videoTracks.length > 0;
    if (hasAny && !ready) setReady(true);
  }, [videoTracks, ready]);

  const videoPairs = videoTracks;

  if (!ready || videoPairs.length === 0) {
    try { console.log('[FLOW] Waiting for remote video... pubs=', videoPairs.length); } catch {}
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-300">
        Waiting for remote video...
      </div>
    );
  }

  try { console.log(`[FLOW] Rendering ${videoPairs.length} video track(s)`); } catch {}
  return (
    <div className="w-full h-full min-h-0 grid grid-cols-1 auto-rows-fr gap-2 overflow-hidden">
      {videoPairs.map(({ pub, track }, idx) => (
        <VideoRenderer key={track.sid || `vid-${idx}`} room={room} track={track} pub={pub} onInteraction={onInteraction} captureSize={captureSize || undefined} />
      ))}
    </div>
  );
}

function VideoRenderer({ room, track, pub, onInteraction, captureSize }: { room: Room; track: RemoteVideoTrack, pub: any, onInteraction?: (payload: object) => void | Promise<void>, captureSize?: { w: number; h: number } }) {
  const ref = React.useRef<HTMLVideoElement>(null);
  const pendingRef = React.useRef<object[]>([]);
  const flushingRef = React.useRef<boolean>(false);
  // Track modifier key state locally so we can send combined shortcuts like Ctrl+V, Meta+C, Shift+Arrow, etc.
  const modifiersRef = React.useRef<{ Control: boolean; Shift: boolean; Alt: boolean; Meta: boolean }>({
    Control: false,
    Shift: false,
    Alt: false,
    Meta: false,
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    try {
      track.attach(el);
      // Diagnostics for black screen: log actual video size once available
      const onMeta = () => {
        try {
          console.log('[FLOW] <video> metadata:', { w: el.videoWidth, h: el.videoHeight, readyState: el.readyState });
        } catch {}
      };
      const onPlaying = () => { try { console.log('[FLOW] <video> playing'); } catch {} };
      const onLoadedData = () => { try { console.log('[FLOW] <video> loadeddata'); } catch {} };
      el.addEventListener('loadedmetadata', onMeta);
      el.addEventListener('playing', onPlaying);
      el.addEventListener('loadeddata', onLoadedData);

      // Fallback: if still 0x0 after 2s, toggle subscription and try manual srcObject
      const t = setTimeout(() => {
        try {
          if (el.videoWidth === 0 || el.videoHeight === 0) {
            console.warn('[FLOW] Video size 0x0 after timeout, toggling subscription');
            if (typeof pub?.setSubscribed === 'function') {
              pub.setSubscribed(false);
              setTimeout(() => {
                try {
                  pub.setSubscribed(true);
                  if (typeof pub?.setVideoQuality === 'function') pub.setVideoQuality(VideoQuality.HIGH);
                } catch {}
              }, 300);
            }
            // Manual srcObject attach as last resort
            if (!el.srcObject && (track as any)?.mediaStreamTrack) {
              const ms = new MediaStream();
              ms.addTrack((track as any).mediaStreamTrack);
              el.srcObject = ms;
              // Attempt play
              try { void el.play(); } catch {}
            }
          }
        } catch {}
      }, 2000);
      return () => { clearTimeout(t); };
    } catch (e) {
      console.warn('[FLOW] attach failed:', e);
    }
    return () => {
      try { track.detach(el); } catch {}
      try {
        el.removeEventListener('loadedmetadata', () => {});
        el.removeEventListener('playing', () => {});
        el.removeEventListener('loadeddata', () => {});
      } catch {}
    };
  }, [track]);

  // --- Interaction handlers ---
  const publishOrQueue = async (payload: object) => {
    const tryRoomSend = async () => {
      if (!room || room.state !== ConnectionState.Connected) throw new Error('viewer room not connected');
      const bytes = new TextEncoder().encode(JSON.stringify(payload));
      await room.localParticipant.publishData(bytes, { reliable: true });
    };
    try {
      await tryRoomSend();
      try { console.log('[Interaction][viewer-room] sent', payload); } catch {}
      return;
    } catch (e) {
      try {
        if (onInteraction) {
          await onInteraction(payload);
          try { console.log('[Interaction][fallback-hook] sent', payload); } catch {}
          return;
        }
      } catch {}
      // Queue and start a flusher
      pendingRef.current.push(payload);
      try { console.log('[Interaction][queued]', payload, 'queue_len=', pendingRef.current.length); } catch {}
      if (!flushingRef.current) {
        flushingRef.current = true;
        const flush = async () => {
          if (!room || room.state !== ConnectionState.Connected) return;
          const items = pendingRef.current.splice(0, pendingRef.current.length);
          for (const p of items) {
            try {
              const bytes = new TextEncoder().encode(JSON.stringify(p));
              await room.localParticipant.publishData(bytes);
              try { console.log('[Interaction][flush] sent', p); } catch {}
            } catch {
              // put back and retry later
              pendingRef.current.unshift(p);
              try { console.warn('[Interaction][flush] failed; re-queued'); } catch {}
              break;
            }
          }
        };
        const id = setInterval(async () => {
          try { await flush(); } catch {}
          if (pendingRef.current.length === 0 && room && room.state === ConnectionState.Connected) {
            clearInterval(id);
            flushingRef.current = false;
          }
        }, 500);
      }
    }
  };

  const handleMouseClick = async (event: React.MouseEvent<HTMLVideoElement>) => {
    try {
      try { console.log('[Interaction] click event'); } catch {}
      const video = ref.current;
      if (!video) return;
      const rect = video.getBoundingClientRect();
      const clientW = video.clientWidth;
      const clientH = video.clientHeight;
      const vidW = captureSize?.w || video.videoWidth || clientW;
      const vidH = captureSize?.h || video.videoHeight || clientH;
      // Using object-fit: cover => scale is the larger ratio, the image may be cropped.
      const scale = Math.max(clientW / vidW, clientH / vidH);
      const displayW = vidW * scale;
      const displayH = vidH * scale;
      // Amount cropped off on each axis
      const cropX = Math.max(0, (displayW - clientW) / 2);
      const cropY = Math.max(0, (displayH - clientH) / 2);
      // Coordinates inside the scaled video space
      const localX = (event.clientX - rect.left) + cropX;
      const localY = (event.clientY - rect.top) + cropY;
      // Map back to intrinsic video coordinates
      let scaledX = Math.round(localX / scale);
      let scaledY = Math.round(localY / scale);
      // Clamp to [0, vidW/H]
      scaledX = Math.max(0, Math.min(vidW - 1, scaledX));
      scaledY = Math.max(0, Math.min(vidH - 1, scaledY));
      const payload = { action: 'click', x: scaledX, y: scaledY };
      await publishOrQueue(payload);
    } catch (e) {
      console.warn('[Interaction] click handler failed:', e);
    }
  };

  const handleKeyDown = async (event: React.KeyboardEvent<HTMLVideoElement>) => {
    try {
      const key = event.key;
      // If it's a modifier, update state and do not send yet
      if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
        (modifiersRef.current as any)[key] = true;
        event.preventDefault();
        return;
      }

      // Determine active modifiers
      const activeModifiers = Object.entries(modifiersRef.current)
        .filter(([, isActive]) => isActive)
        .map(([k]) => k);

      try { console.log(`[Interaction] keydown: '${key}', modifiers: [${activeModifiers.join(', ')}]`); } catch {}
      event.preventDefault();

      // If any modifiers are held, always send as keypress with modifiers
      if (activeModifiers.length > 0) {
        const payload = { action: 'keypress', key, modifiers: activeModifiers } as any;
        await publishOrQueue(payload);
        return;
      }

      // No modifiers: preserve existing behavior (type for single characters, keypress otherwise)
      const payload = (key.length === 1)
        ? { action: 'type', text: key }
        : { action: 'keypress', key };
      await publishOrQueue(payload);
    } catch (e) {
      console.warn('[Interaction] keydown handler failed:', e);
    }
  };

  // Key up handler to reset modifier state
  const handleKeyUp = (event: React.KeyboardEvent<HTMLVideoElement>) => {
    const key = event.key;
    if (key === 'Control' || key === 'Shift' || key === 'Alt' || key === 'Meta') {
      (modifiersRef.current as any)[key] = false;
    }
    event.preventDefault();
  };

  const handleScroll = async (event: React.WheelEvent<HTMLVideoElement>) => {
    try {
      try { console.log('[Interaction] wheel event', { dx: event.deltaX, dy: event.deltaY }); } catch {}
      event.preventDefault();
      const payload = { action: 'scroll', dx: event.deltaX, dy: event.deltaY };
      await publishOrQueue(payload);
    } catch (e) {
      console.warn('[Interaction] wheel handler failed:', e);
    }
  };

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="w-full h-full bg-black rounded border-2 border-green-500 shadow-lg cursor-crosshair"
      style={{ objectFit: 'cover', zIndex: 20, position: 'relative' }}
      onMouseDown={() => { try { ref.current?.focus(); } catch {} }}
      onClick={handleMouseClick}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onWheel={handleScroll}
      tabIndex={0}
    />
  );
}

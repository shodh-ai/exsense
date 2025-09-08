"use client";
import { LiveKitRoom, useRoomContext, useParticipants } from '@livekit/components-react';
import '@livekit/components-styles';
import React, { useEffect, useMemo, useState } from 'react';
import { Track, RemoteVideoTrack, TrackPublication, VideoQuality, RoomEvent } from 'livekit-client';

interface LiveKitViewerProps {
  url: string;
  token: string;
}

export default function LiveKitViewer({ url, token }: LiveKitViewerProps) {
  if (!token || !url) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        Connecting to LiveKit...
      </div>
    );
  }
  // Debug log when viewer has the necessary props
  try { console.log('[FLOW] LiveKitViewer ready with url/token'); } catch {}

  return (
    <LiveKitRoom
      serverUrl={url}
      token={token}
      connect={true}
      video={false}
      audio={false}
      connectOptions={{ autoSubscribe: false }}
      className="w-full h-full"
    >
      <div className="w-full h-full" style={{ position: 'relative', zIndex: 10, minHeight: 360 }}>
        <ExplicitVideoGrid />
      </div>
    </LiveKitRoom>
  );
}

function ExplicitVideoGrid() {
  const room = useRoomContext();
  const participants = useParticipants();
  const [ready, setReady] = useState(false);

  // Collect only remote VIDEO publications; avoid attaching audio as video.
  const videoPubs = useMemo(() => {
    const pubs: TrackPublication[] = [];
    try {
      participants.forEach((p) => {
        p.trackPublications.forEach((pub) => {
          if (pub.kind === Track.Kind.Video) pubs.push(pub);
        });
      });
    } catch {}
    return pubs;
  }, [participants]);

  useEffect(() => {
    // Room-level diagnostics for why tracks may not appear
    try {
      const onPc = (p: any) => { try { console.log('[LK][viewer] participantConnected:', p?.identity); } catch {} };
      const onPd = (p: any) => { try { console.log('[LK][viewer] participantDisconnected:', p?.identity); } catch {} };
      const onPub = (pub: any, p: any) => {
        try {
          console.log('[LK][viewer] trackPublished:', { from: p?.identity, kind: pub?.kind, source: pub?.source, sid: pub?.trackSid });
          if (pub?.kind === Track.Kind.Video && typeof (pub as any)?.setSubscribed === 'function') {
            (pub as any).setSubscribed(true);
            if (typeof (pub as any)?.setVideoQuality === 'function') (pub as any).setVideoQuality(VideoQuality.HIGH);
            console.log('[LK][viewer] explicitly subscribed to new video pub', pub?.trackSid);
          }
        } catch {}
      };
      const onSub = (track: any, pub: any, p: any) => { try { console.log('[LK][viewer] trackSubscribed:', { from: p?.identity, kind: track?.kind, sid: pub?.trackSid }); } catch {} };
      const onUnsub = (track: any, pub: any, p: any) => {
        try {
          console.log('[LK][viewer] trackUnsubscribed:', { from: p?.identity, kind: track?.kind, sid: pub?.trackSid });
          // Proactively re-subscribe to avoid going blank if adaptive stream/dynacast paused it
          (pub as any)?.setSubscribed?.(true);
          console.log('[LK][viewer] re-subscribed to publication', pub?.trackSid);
        } catch (e) {
          console.warn('[LK][viewer] failed to re-subscribe on unsubscribe:', e);
        }
      };
      room.on(RoomEvent.ParticipantConnected, onPc);
      room.on(RoomEvent.ParticipantDisconnected, onPd);
      room.on(RoomEvent.TrackPublished, onPub);
      room.on(RoomEvent.TrackSubscribed, onSub);
      room.on(RoomEvent.TrackUnsubscribed, onUnsub);
      return () => {
        room.off(RoomEvent.ParticipantConnected, onPc);
        room.off(RoomEvent.ParticipantDisconnected, onPd);
        room.off(RoomEvent.TrackPublished, onPub);
        room.off(RoomEvent.TrackSubscribed, onSub);
        room.off(RoomEvent.TrackUnsubscribed, onUnsub);
      };
    } catch {}
  }, [room]);

  // After connect, disable adaptive stream & dynacast on this subscriber and enforce default subscription
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
        participants.forEach((p) => {
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
  }, [participants]);

  useEffect(() => {
    try {
      const infos = participants.map((p) => {
        try {
          const pubs: any[] = Array.from(((p as any)?.trackPublications?.values?.() || []) as any);
          const vids = pubs.filter((pub: any) => pub?.kind === Track.Kind.Video).length;
          return { id: (p as any)?.identity, vids };
        } catch {
          return { id: (p as any)?.identity, vids: 0 };
        }
      });
      console.log('[LK][viewer] participants:', infos);
    } catch {}
  }, [participants]);

  useEffect(() => {
    // Force subscribe to all video publications (best-effort)
    try {
      (videoPubs as any[]).forEach((pub: any) => {
        // Only RemoteTrackPublication supports setSubscribed/isSubscribed
        if (typeof pub?.setSubscribed === 'function' && pub?.isSubscribed === false) {
          try {
            pub.setSubscribed(true);
            console.log('[FLOW] Forcing subscribe to video publication', { sid: pub.trackSid, source: pub.source });
          } catch (e) {
            console.warn('[FLOW] Failed to force subscribe:', e);
          }
        }
        // Prefer highest quality layer if available
        try {
          if (typeof pub?.setVideoQuality === 'function') {
            pub.setVideoQuality(VideoQuality.HIGH);
          }
        } catch {}
      });
    } catch {}
  }, [videoPubs]);

  // Wait gate: mark ready once at least one RemoteVideoTrack is present and not muted
  useEffect(() => {
    const hasAny = (videoPubs as any[]).some((pub: any) => {
      const t = pub?.track as RemoteVideoTrack | undefined;
      return !!t && typeof t.attach === 'function' && (pub?.isMuted === false || t.isMuted === false);
    });
    if (hasAny && !ready) setReady(true);
  }, [videoPubs, ready]);

  const videoPairs = useMemo(() => {
    const pairs: { pub: any; track: RemoteVideoTrack }[] = [];
    (videoPubs as any[]).forEach((pub: any) => {
      const t = pub?.track as any;
      if (t && typeof t.attach === 'function' && (t.kind === 'video' || t.mediaStreamTrack?.kind === 'video')) {
        pairs.push({ pub, track: t as RemoteVideoTrack });
      }
    });
    return pairs;
  }, [videoPubs]);

  if (!ready || videoPairs.length === 0) {
    try { console.log('[FLOW] Waiting for remote video... pubs=', videoPubs.length); } catch {}
    return (
      <div className="w-full h-full flex items-center justify-center text-gray-300">
        Waiting for remote video...
      </div>
    );
  }

  try { console.log(`[FLOW] Rendering ${videoPairs.length} video track(s)`); } catch {}
  return (
    <div className="w-full h-full grid grid-cols-1 md:grid-cols-2 gap-2 p-2">
      {videoPairs.map(({ pub, track }, idx) => (
        <VideoRenderer key={track.sid || `vid-${idx}`} track={track} pub={pub} />
      ))}
    </div>
  );
}

function VideoRenderer({ track, pub }: { track: RemoteVideoTrack, pub: any }) {
  const ref = React.useRef<HTMLVideoElement>(null);
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

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      muted
      className="w-full h-full bg-black rounded border-2 border-green-500 shadow-lg"
      style={{ objectFit: 'contain', zIndex: 20, position: 'relative' }}
    />
  );
}

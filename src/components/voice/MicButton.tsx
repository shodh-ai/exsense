"use client";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createVoiceSession, startVoiceBot } from "@/services/voice";
import { Room, RoomEvent, createLocalAudioTrack, LocalAudioTrack, RemoteAudioTrack, Track, setLogLevel, LogLevel } from "livekit-client";

export type MicMode = "kamikaze" | "imprinter";

export interface MicButtonProps {
  roomId: string;
  identity: string; // user identity
  sessionId: string;
  thesisId: string;
  mode: MicMode;
  studentId?: string; // when mode=kamikaze
  authorId?: string; // when mode=imprinter
}

function normalizeWsUrl(url: string): string {
  if (url.startsWith("ws://") || url.startsWith("wss://")) return url;
  if (url.startsWith("https://")) return url.replace("https://", "wss://");
  if (url.startsWith("http://")) return url.replace("http://", "ws://");
  return url;
}

export default function MicButton({ roomId, identity, sessionId, thesisId, mode, studentId, authorId }: MicButtonProps) {
  const [pressed, setPressed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const roomRef = useRef<Room | null>(null);
  const localTrackRef = useRef<LocalAudioTrack | null>(null);
  const botAudioElRef = useRef<HTMLAudioElement | null>(null);
  const [botSpeaking, setBotSpeaking] = useState(false);
  const connectPromiseRef = useRef<Promise<Room> | null>(null);

  const connectIfNeeded = useCallback(async () => {
    if (roomRef.current) return roomRef.current;
    if (connectPromiseRef.current) {
      console.log("[MicButton] awaiting ongoing connect");
      return await connectPromiseRef.current;
    }
    const connectPromise = (async () => {
      setError(null);
      try { setLogLevel(LogLevel.debug); } catch {}
      console.log("[MicButton] requesting voice session", { roomId, identity });
      const { url, token } = await createVoiceSession({ room: roomId, identity });
      console.log("[MicButton] got session", { url, tokenPrefix: token.slice(0, 16) + "..." });
      const wsUrl = normalizeWsUrl(url);
      console.log("[MicButton] connecting to LiveKit", { wsUrl });
      const room = new Room();
      // Verbose room-level logs to trace connection and publications
      try { room.on(RoomEvent.ConnectionStateChanged, (state) => console.log("[MicButton] connection state", state)); } catch {}
      try { room.on(RoomEvent.ParticipantConnected, (p) => console.log("[MicButton] participant connected", (p as any)?.identity)); } catch {}
      try { room.on(RoomEvent.LocalTrackPublished, (pub, participant) => console.log("[MicButton] local track published", { name: (pub as any)?.trackName })); } catch {}
      try { room.on(RoomEvent.TrackPublished, (pub, participant) => console.log("[MicButton] remote track published", { name: (pub as any)?.trackName, participant: (participant as any)?.identity })); } catch {}
      room.on(RoomEvent.Disconnected, (reason) => {
        // cleanup local track
        try { localTrackRef.current?.stop(); } catch {}
        localTrackRef.current = null;
        // cleanup bot audio element
        if (botAudioElRef.current) {
          try { botAudioElRef.current.pause(); } catch {}
          botAudioElRef.current.remove();
          botAudioElRef.current = null;
        }
        console.log("[MicButton] room disconnected", { reason });
        roomRef.current = null;
      });
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        // If this is the bot's audio track, auto-play and show indicator
        try {
          const name = (track as any)?.name ?? (publication as any)?.trackName ?? "";
          if (track.kind === Track.Kind.Audio && String(name) === "voice-bot") {
            console.log("[MicButton] subscribed to bot track", { participant: (participant as any)?.identity, name });
            const audioEl = (track as RemoteAudioTrack).attach();
            audioEl.autoplay = true;
            botAudioElRef.current = audioEl;
            document.body.appendChild(audioEl);
            setBotSpeaking(true);
          }
        } catch {}
      });
      room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
        try {
          const name = (track as any)?.name ?? "";
          if (track.kind === Track.Kind.Audio && String(name) === "voice-bot") {
            console.log("[MicButton] unsubscribed from bot track", { participant: (participant as any)?.identity, name });
            try { (track as RemoteAudioTrack).detach(); } catch {}
            if (botAudioElRef.current) {
              try { botAudioElRef.current.pause(); } catch {}
              botAudioElRef.current.remove();
              botAudioElRef.current = null;
            }
            setBotSpeaking(false);
          }
        } catch {}
      });
      await room.connect(wsUrl, token);
      console.log("[MicButton] room connected");
      roomRef.current = room;
      return room;
    })();
    connectPromiseRef.current = connectPromise;
    try {
      return await connectPromise;
    } finally {
      connectPromiseRef.current = null;
    }
  }, [roomId, identity]);

  // Wait up to a short timeout for the bot participant to appear in the room
  const waitForBotJoin = useCallback(async (timeoutMs: number = 5000) => {
    const room = roomRef.current;
    if (!room) return;
    const started = Date.now();
    await new Promise<void>((resolve) => {
      const identityMatches = (p: any) => typeof p?.identity === 'string' && p.identity.startsWith('voice-bot-');
      const checkNow = () => {
        try {
          const has = Array.from((room as any).remoteParticipants?.values?.() || []).some(identityMatches);
          if (has || Date.now() - started > timeoutMs) {
            cleanup();
            resolve();
          }
        } catch {
          cleanup();
          resolve();
        }
      };
      const onPC = (p: any) => {
        try {
          if (identityMatches(p)) {
            cleanup();
            resolve();
          }
        } catch {}
      };
      const cleanup = () => {
        try { (room as any).off?.(RoomEvent.ParticipantConnected, onPC); } catch {}
        clearInterval(iv);
      };
      try { (room as any).on?.(RoomEvent.ParticipantConnected, onPC); } catch {}
      const iv = setInterval(checkNow, 200);
      checkNow();
    });
  }, []);

  const startPublishing = useCallback(async () => {
    try {
      const room = await connectIfNeeded();
      // Wait until fully connected (extra safety for some browsers/SDK timings)
      if ((room as any).state !== 'connected') {
        await new Promise<void>((resolve) => {
          const onConnected = () => { try { room.off(RoomEvent.Connected, onConnected); } catch {} resolve(); };
          const to = setTimeout(() => { try { room.off(RoomEvent.Connected, onConnected); } catch {} resolve(); }, 1500);
          room.on(RoomEvent.Connected, onConnected);
        });
      }
      // Ensure server-side bot is running FIRST, then publish mic so the bot always sees it
      console.debug("[MicButton] starting voice bot", { roomId, sessionId, thesisId, mode, studentId, authorId });
      await startVoiceBot({ room: roomId, sessionId, thesisId, mode, studentId, authorId });
      console.debug("[MicButton] start bot request sent; waiting for bot join...");
      await waitForBotJoin(4000);
      // Enable microphone via LiveKit API (handles getUserMedia + publish internally)
      console.debug("[MicButton] enabling microphone via setMicrophoneEnabled(true)");
      await room.localParticipant.setMicrophoneEnabled(true, {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      } as any);
    } catch (e: any) {
      setError(e?.message || String(e));
      console.error("[MicButton] error in startPublishing", e);
      setPressed(false);
    }
  }, [connectIfNeeded, waitForBotJoin, roomId, sessionId, thesisId, mode, studentId, authorId]);

  const stopPublishing = useCallback(async () => {
    try {
      const room = roomRef.current;
      if (room) {
        try { await room.localParticipant.setMicrophoneEnabled(false); console.debug("[MicButton] microphone disabled"); } catch {}
      }
    } catch (e: any) {
      setError(e?.message || String(e));
      console.error("[MicButton] error in stopPublishing", e);
    }
  }, []);

  useEffect(() => {
    return () => {
      // cleanup on unmount
      stopPublishing();
      try { roomRef.current?.disconnect(); } catch {}
      roomRef.current = null;
    };
  }, [stopPublishing]);

  const onDown = useCallback(() => {
    if (pressed) return;
    setPressed(true);
    void startPublishing();
  }, [pressed, startPublishing]);

  const onUp = useCallback(() => {
    if (!pressed) return;
    setPressed(false);
    void stopPublishing();
  }, [pressed, stopPublishing]);

  return (
    <div className="flex items-center gap-2">
      <button
        onMouseDown={onDown}
        onMouseUp={onUp}
        onTouchStart={(e) => { e.preventDefault(); onDown(); }}
        onTouchEnd={(e) => { e.preventDefault(); onUp(); }}
        className={`px-4 py-2 rounded-full text-white text-sm ${pressed ? 'bg-red-600' : 'bg-emerald-600'} active:opacity-90`}
        title={pressed ? 'Release to stop' : 'Hold to speak'}
      >
        {pressed ? 'Release to stop' : 'Hold to Speak'}
      </button>
      {botSpeaking && (
        <span className="text-xs px-2 py-1 rounded bg-indigo-600 text-white animate-pulse select-none">
          Bot speaking
        </span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}

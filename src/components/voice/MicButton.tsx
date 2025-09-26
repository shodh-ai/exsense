"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, createLocalAudioTrack, LocalAudioTrack, RemoteAudioTrack, Track, setLogLevel, LogLevel } from "livekit-client";
import { createVoiceSession, startVoiceBot } from "@/services/voice";

export type VoiceMode = "kamikaze" | "imprinter";

interface MicButtonProps {
  roomId: string;
  identity: string;
  sessionId: string;
  thesisId: string;
  mode: VoiceMode;
  studentId?: string;
  authorId?: string;
  className?: string;
}

export default function MicButton(props: MicButtonProps) {
  const { roomId, identity, sessionId, thesisId, mode, studentId, authorId, className } = props;

  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "publishing" | "published" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const micRef = useRef<LocalAudioTrack | null>(null);
  const agentAudioElRef = useRef<HTMLAudioElement | null>(null);

  const connect = useCallback(async () => {
    try {
      setLogLevel(LogLevel.debug);
      setError(null);
      setStatus("connecting");

      const { url, token } = await createVoiceSession({ room: roomId, identity });

      const room = new Room();
      // Observability hooks
      room.on(RoomEvent.Connected, () => console.log("[MicButton] connected"));
      room.on(RoomEvent.ConnectionStateChanged, (s) => console.log("[MicButton] conn state", s));
      room.on(RoomEvent.ParticipantConnected, (p) => console.log("[MicButton] participant connected", (p as any)?.identity));
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        const name = (track as any)?.name ?? (publication as any)?.trackName ?? "";
        console.log("[MicButton] track subscribed", { name, participant: (participant as any)?.identity });
        if (track.kind === Track.Kind.Audio) {
          const el = (track as RemoteAudioTrack).attach();
          el.autoplay = true;
          agentAudioElRef.current = el;
          document.body.appendChild(el);
        }
      });
      room.on(RoomEvent.Disconnected, () => {
        try { micRef.current?.stop(); } catch {}
        micRef.current = null;
        if (agentAudioElRef.current) {
          try { agentAudioElRef.current.pause(); } catch {}
          try { agentAudioElRef.current.remove(); } catch {}
          agentAudioElRef.current = null;
        }
        roomRef.current = null;
        setStatus("idle");
      });

      await room.connect(url, token);
      roomRef.current = room;

      setStatus("publishing");
      const mic = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      micRef.current = mic;

      // publish with a couple retries for engine settle
      for (let i = 0; i < 3; i++) {
        try {
          await room.localParticipant.publishTrack(mic);
          setStatus("published");
          break;
        } catch (err: any) {
          const msg = String(err?.message || err);
          if (/not connected/i.test(msg)) {
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
          throw err;
        }
      }

      // Ask backend/agent to join & start
      await startVoiceBot({ room: roomId, sessionId, thesisId, mode, studentId, authorId });
    } catch (e: any) {
      console.error("[MicButton] connect error", e);
      setError(e?.message || "Failed to connect");
      setStatus("error");
    }
  }, [roomId, identity, sessionId, thesisId, mode, studentId, authorId]);

  const disconnect = useCallback(async () => {
    try {
      const room = roomRef.current;
      const mic = micRef.current;
      if (room && mic) {
        try { await room.localParticipant.unpublishTrack(mic); } catch {}
        try { mic.stop(); } catch {}
      }
      micRef.current = null;
      if (room) {
        try { await room.disconnect(); } catch {}
      }
      roomRef.current = null;
      setStatus("idle");
    } catch (e) {
      console.warn("[MicButton] disconnect error", e);
    }
  }, []);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      disconnect();
    };
  }, [disconnect]);

  const onClick = async () => {
    if (status === "idle" || status === "error") {
      await connect();
    } else {
      await disconnect();
    }
  };

  const label = status === "idle" || status === "error" ? "Enable mic" : "Disable mic";
  const isBusy = status === "connecting" || status === "publishing";

  return (
    <button
      onClick={onClick}
      disabled={isBusy}
      className={`px-3 py-1 rounded text-white text-sm ${status === "published" ? "bg-rose-600" : "bg-sky-600"} ${className || ""}`}
      title={error || label}
    >
      {isBusy ? "Connecting..." : status === "published" ? "Mic On" : "Mic Off"}
    </button>
  );
}

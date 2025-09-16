"use client";
import React, { useCallback, useRef, useState } from "react";
import { Room, RoomEvent, createLocalAudioTrack, RemoteAudioTrack, Track, setLogLevel, LogLevel, LocalAudioTrack } from "livekit-client";
import { createVoiceSession, startVoiceBot } from "@/services/voice";

function normalizeWsUrl(url: string): string {
  if (url.startsWith("ws://") || url.startsWith("wss://")) return url;
  if (url.startsWith("https://")) return url.replace("https://", "wss://");
  if (url.startsWith("http://")) return url.replace("http://", "ws://");
  return url;
}

export default function TestLiveKitClient() {
  const [status, setStatus] = useState<string>("idle");
  const [roomName, setRoomName] = useState<string>("test-room");
  const [identity, setIdentity] = useState<string>("student_1");
  const [sessionId, setSessionId] = useState<string>(() => `s_${Date.now()}`);
  const [thesisId, setThesisId] = useState<string>("thesis1");
  const roomRef = useRef<Room | null>(null);
  const localTrackRef = useRef<LocalAudioTrack | null>(null);
  const botAudioElRef = useRef<HTMLAudioElement | null>(null);

  const connectAndPublish = useCallback(async () => {
    try {
      setLogLevel(LogLevel.debug);
      setStatus("requesting session");
      const { url, token } = await createVoiceSession({ room: roomName, identity });
      console.log("[Test] got session", { url, tokenPrefix: token.slice(0, 16) + "..." });
      const wsUrl = normalizeWsUrl(url);

      const room = new Room();
      room.on(RoomEvent.ConnectionStateChanged, (state) => console.log("[Test] connection state", state));
      room.on(RoomEvent.Connected, () => console.log("[Test] room connected"));
      room.on(RoomEvent.ParticipantConnected, (p) => console.log("[Test] participant connected", (p as any)?.identity));
      room.on(RoomEvent.LocalTrackPublished, (pub) => console.log("[Test] local track published", { name: (pub as any)?.trackName }));
      room.on(RoomEvent.TrackPublished, (pub, p) => console.log("[Test] remote track published", { name: (pub as any)?.trackName, participant: (p as any)?.identity }));
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        const name = (track as any)?.name ?? (publication as any)?.trackName ?? "";
        console.log("[Test] track subscribed", { name, participant: (participant as any)?.identity });
        if (track.kind === Track.Kind.Audio && String(name) === "voice-bot") {
          const audioEl = (track as RemoteAudioTrack).attach();
          audioEl.autoplay = true;
          botAudioElRef.current = audioEl;
          document.body.appendChild(audioEl);
        }
      });
      room.on(RoomEvent.Disconnected, (reason) => {
        console.log("[Test] room disconnected", { reason });
        try { localTrackRef.current?.stop(); } catch {}
        localTrackRef.current = null;
        if (botAudioElRef.current) {
          try { botAudioElRef.current.pause(); } catch {}
          try { botAudioElRef.current.remove(); } catch {}
          botAudioElRef.current = null;
        }
        roomRef.current = null;
      });

      setStatus("connecting");
      await room.connect(wsUrl, token);
      roomRef.current = room;
      setStatus("creating mic");

      const mic = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
      localTrackRef.current = mic;
      setStatus("publishing mic");

      // small settle wait
      await new Promise((r) => setTimeout(r, 200));
      for (let i = 0; i < 5; i++) {
        try {
          console.log("[Test] publish attempt", i + 1);
          await room.localParticipant.publishTrack(mic);
          console.log("[Test] publish success");
          setStatus("published");
          break;
        } catch (err: any) {
          const msg = String(err?.message || err);
          console.warn("[Test] publish failed", { attempt: i + 1, msg });
          if (/engine not connected/i.test(msg) || /not connected/i.test(msg)) {
            await new Promise((r) => setTimeout(r, 300));
            continue;
          }
          throw err;
        }
      }
    } catch (e) {
      console.error("[Test] connectAndPublish error", e);
      setStatus("error");
    }
  }, [roomName, identity]);

  const startBot = useCallback(async () => {
    try {
      setStatus("starting bot");
      await startVoiceBot({ room: roomName, sessionId, thesisId, mode: "kamikaze", studentId: identity });
      console.log("[Test] start bot request sent");
      setStatus("bot started");
    } catch (e) {
      console.error("[Test] startBot error", e);
      setStatus("error");
    }
  }, [roomName, sessionId, thesisId, identity]);

  const disconnect = useCallback(async () => {
    try {
      const room = roomRef.current;
      const track = localTrackRef.current;
      if (room && track) {
        try { await room.localParticipant.unpublishTrack(track); } catch {}
        try { track.stop(); } catch {}
      }
      localTrackRef.current = null;
      if (room) {
        try { await room.disconnect(); } catch {}
      }
      roomRef.current = null;
      setStatus("disconnected");
    } catch (e) {
      console.error("[Test] disconnect error", e);
    }
  }, []);

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-lg font-semibold">LiveKit Connection Test</h1>
      <div className="flex gap-2 items-center">
        <label className="text-sm">Room</label>
        <input className="border px-2 py-1 rounded text-sm" value={roomName} onChange={(e) => setRoomName(e.target.value)} />
        <label className="text-sm">Identity</label>
        <input className="border px-2 py-1 rounded text-sm" value={identity} onChange={(e) => setIdentity(e.target.value)} />
        <label className="text-sm">ThesisId</label>
        <input className="border px-2 py-1 rounded text-sm" value={thesisId} onChange={(e) => setThesisId(e.target.value)} />
      </div>
      <div className="flex gap-2">
        <button onClick={connectAndPublish} className="px-3 py-1 rounded bg-emerald-600 text-white text-sm">Connect & Publish</button>
        <button onClick={startBot} className="px-3 py-1 rounded bg-indigo-600 text-white text-sm">Start Bot</button>
        <button onClick={disconnect} className="px-3 py-1 rounded bg-slate-600 text-white text-sm">Disconnect</button>
      </div>
      <div className="text-xs text-slate-500">Status: {status}</div>
      <div className="text-xs text-slate-500">Open DevTools Console to see detailed logs.</div>
      <div className="text-xs text-amber-600">Tip: test from http://localhost:3000 (not LAN IP) so microphone permissions work without HTTPS.</div>
    </div>
  );
}

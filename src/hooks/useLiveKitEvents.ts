import { useEffect } from 'react';
import type { Room } from 'livekit-client';
import { RoomEvent } from 'livekit-client';

interface LiveKitEventHandlers {
  onConnected: () => void | Promise<void>;
  onDisconnected: () => void | Promise<void>;
  onDataReceived: (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => void | Promise<void>;
  onTrackSubscribed: (track: any, publication: any, participant: any) => void | Promise<void>;
  onTrackUnsubscribed: (track: any, publication: any, participant: any) => void | Promise<void>;
  onTranscriptionReceived: (segments: any, participant?: any, publication?: any) => void | Promise<void>;
}

export function useLiveKitEvents(room: Room | null | undefined, handlers: LiveKitEventHandlers) {
  useEffect(() => {
    if (!room) return;

    const {
      onConnected,
      onDisconnected,
      onDataReceived,
      onTrackSubscribed,
      onTrackUnsubscribed,
      onTranscriptionReceived,
    } = handlers;

    room.on(RoomEvent.Connected, onConnected);
    room.on(RoomEvent.Disconnected, onDisconnected);
    room.on(RoomEvent.DataReceived, onDataReceived as any);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribed as any);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed as any);
    room.on(RoomEvent.TranscriptionReceived, onTranscriptionReceived as any);

    return () => {
      room.off(RoomEvent.Connected, onConnected);
      room.off(RoomEvent.Disconnected, onDisconnected);
      room.off(RoomEvent.DataReceived, onDataReceived as any);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribed as any);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribed as any);
      room.off(RoomEvent.TranscriptionReceived, onTranscriptionReceived as any);
    };
  }, [room, handlers]);
}

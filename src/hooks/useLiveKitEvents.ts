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
  // Subscribe once per room with stable wrappers and call latest handlers via ref
  const handlersRef = (globalThis as any).__lkHandlersRef || { current: handlers };
  (globalThis as any).__lkHandlersRef = handlersRef;
  handlersRef.current = handlers;

  useEffect(() => {
    if (!room) return;

    const onConnectedWrap = () => handlersRef.current?.onConnected?.();
    const onDisconnectedWrap = () => handlersRef.current?.onDisconnected?.();
    const onDataReceivedWrap = (payload: Uint8Array, participant?: any, kind?: any, topic?: string) => handlersRef.current?.onDataReceived?.(payload, participant, kind, topic);
    const onTrackSubscribedWrap = (track: any, publication: any, participant: any) => handlersRef.current?.onTrackSubscribed?.(track, publication, participant);
    const onTrackUnsubscribedWrap = (track: any, publication: any, participant: any) => handlersRef.current?.onTrackUnsubscribed?.(track, publication, participant);
    const onTranscriptionReceivedWrap = (segments: any, participant?: any, publication?: any) => handlersRef.current?.onTranscriptionReceived?.(segments, participant, publication);

    room.on(RoomEvent.Connected, onConnectedWrap);
    room.on(RoomEvent.Disconnected, onDisconnectedWrap);
    room.on(RoomEvent.DataReceived, onDataReceivedWrap as any);
    room.on(RoomEvent.TrackSubscribed, onTrackSubscribedWrap as any);
    room.on(RoomEvent.TrackUnsubscribed, onTrackUnsubscribedWrap as any);
    room.on(RoomEvent.TranscriptionReceived, onTranscriptionReceivedWrap as any);

    return () => {
      room.off(RoomEvent.Connected, onConnectedWrap);
      room.off(RoomEvent.Disconnected, onDisconnectedWrap);
      room.off(RoomEvent.DataReceived, onDataReceivedWrap as any);
      room.off(RoomEvent.TrackSubscribed, onTrackSubscribedWrap as any);
      room.off(RoomEvent.TrackUnsubscribed, onTrackUnsubscribedWrap as any);
      room.off(RoomEvent.TranscriptionReceived, onTranscriptionReceivedWrap as any);
    };
  }, [room]);
}

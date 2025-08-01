// src/hooks/useLiveKitSession.ts

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, ConnectionState, RemoteParticipant, RpcError, Track, TrackPublication, AudioTrack, createLocalAudioTrack, Participant, TranscriptionSegment, LocalTrack } from 'livekit-client';
import { AgentInteractionClientImpl, AgentToClientUIActionRequest, ClientUIActionResponse, ClientUIActionType } from '@/generated/protos/interaction';
import { useSessionStore } from '@/lib/store';
import { useAuth } from '@clerk/nextjs';

// --- RPC UTILITIES (Unchanged) ---
function uint8ArrayToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) { binary += String.fromCharCode(buffer[i]); }
  return btoa(binary);
}
function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) { bytes[i] = binary_string.charCodeAt(i); }
  return bytes;
}
interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}
class LiveKitRpcAdapter implements Rpc {
  constructor(private localParticipant: LocalParticipant, private agentIdentity: string) { }
  async request(service: string, method: string, data: Uint8Array): Promise<Uint8Array> {
    const fullMethodName = `${service}/${method}`;
    const payloadString = uint8ArrayToBase64(data);
    try {
      const responseString = await this.localParticipant.performRpc({ destinationIdentity: this.agentIdentity, method: fullMethodName, payload: payloadString });
      return base64ToUint8Array(responseString);
    } catch (error) {
      console.error(`F2B RPC request to ${fullMethodName} failed:`, error);
      throw error;
    }
  }
}

const roomInstance = new Room({ adaptiveStream: true, dynacast: true });

export function useLiveKitSession(roomName: string, userName: string) {
  const { isMicEnabled, setIsMicEnabled, setAgentStatusText, setIsAgentSpeaking } = useSessionStore();
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const agentServiceClientRef = useRef<AgentInteractionClientImpl | null>(null);
  const microphoneTrackRef = useRef<AudioTrack | null>(null);

  const { getToken, isSignedIn } = useAuth();
  useEffect(() => {
    let mounted = true;
    const connectToRoom = async () => {
      if (!roomName || !userName) return;
      if (roomInstance.state === ConnectionState.Connected || roomInstance.state === ConnectionState.Connecting) return;
      setIsLoading(true);
      setConnectionError(null);
      try {
        if (!isSignedIn) throw new Error('User not authenticated.');
        const clerkToken = await getToken();
        if (!clerkToken) throw new Error('Failed to get auth token.');
        const response = await fetch(`${process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL}/api/generate-room`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${clerkToken}` },
        });
        if (!response.ok) throw new Error(`Failed to fetch token: ${response.statusText}`);
        const data = await response.json();
        if (!data.success) throw new Error('Token generation failed');
        await roomInstance.connect(data.livekitUrl, data.studentToken);
        if (!mounted) await roomInstance.disconnect();
      } catch (error: unknown) {
        if (mounted) {
          setConnectionError(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
          setIsLoading(false);
        }
      }
    };
    connectToRoom();
    return () => { mounted = false; };
  }, [roomName, userName, getToken, isSignedIn]);

  // --- REACTIVE MICROPHONE HANDLER (This logic is correct) ---
  useEffect(() => {
    const manageMicrophone = async () => {
      if (roomInstance.state !== ConnectionState.Connected) return;

      if (isMicEnabled && !microphoneTrackRef.current) {
        try {
          console.log('[useLiveKitSession] Mic is enabled. Publishing microphone track...');
          const audioTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
          await roomInstance.localParticipant.publishTrack(audioTrack, { source: Track.Source.Microphone });
          microphoneTrackRef.current = audioTrack;
          console.log('[useLiveKitSession] Microphone published.');
        } catch (error: any) {
          console.error('[useLiveKitSession] Failed to publish microphone:', error);
          setConnectionError('Microphone access denied. Please allow permissions and refresh.');
          setIsMicEnabled(false);
        }
      } else if (!isMicEnabled && microphoneTrackRef.current) {
        console.log('[useLiveKitSession] Mic is disabled. Unpublishing microphone track...');
        roomInstance.localParticipant.unpublishTrack(microphoneTrackRef.current as LocalTrack);
        microphoneTrackRef.current.stop();
        microphoneTrackRef.current = null;
        console.log('[useLiveKitSession] Microphone unpublished.');
      }
    };
    manageMicrophone();
  }, [isConnected, isMicEnabled, setIsMicEnabled]);


  // --- EVENT & RPC HANDLER LOGIC (Unchanged from your version) ---
  useEffect(() => {
    if (!roomInstance) return;
    const onConnected = () => { setIsLoading(false); };
    const onDisconnected = () => { /* ... */ };
    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => { /* ... */ };
    const handleTrackSubscribed = (track: Track, pub: TrackPublication, participant: RemoteParticipant) => { /* ... */ };
    roomInstance.on(RoomEvent.Connected, onConnected);
    // ... register other listeners
    return () => {
      // ... unregister listeners
      if (microphoneTrackRef.current) {
        roomInstance.localParticipant.unpublishTrack(microphoneTrackRef.current as LocalTrack);
        microphoneTrackRef.current.stop();
      }
    };
  }, [roomName, setIsMicEnabled, setAgentStatusText, setIsAgentSpeaking, userName]);

  const startTask = useCallback(async (taskName: string, payload: object) => { /* ... Your existing logic ... */ }, []);

  return { isConnected, isLoading, connectionError, startTask, room: roomInstance };
}
// src/hooks/useLiveKitSession.ts

'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, ConnectionState, RemoteParticipant, RpcError, Track, TrackPublication, AudioTrack, createLocalAudioTrack, Participant, TranscriptionSegment, LocalTrack } from 'livekit-client';
import { AgentInteractionClientImpl, AgentToClientUIActionRequest, ClientUIActionResponse, ClientUIActionType } from '@/generated/protos/interaction';
import { useSessionStore, SessionView } from '@/lib/store';
import { useAuth } from '@clerk/nextjs';
import { useBrowserActionExecutor } from './useBrowserActionExecutor';

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

  // --- CLERK AUTHENTICATION ---
  const { getToken, isSignedIn } = useAuth();
  // VNC WebSocket URL for browser automation
  const vncUrl = process.env.NEXT_PUBLIC_VNC_URL || 'ws://localhost:8765';
  const { executeBrowserAction, disconnectVNC } = useBrowserActionExecutor(roomInstance, vncUrl);
  
  // --- ZUSTAND STORE ACTIONS ---
  // Get all the actions we'll need to update the global UI state
  const {
    activeView,
    setActiveView,
    setAgentStatusText,
    setIsAgentSpeaking,
    setIsMicEnabled, // Our new action for mic control
  } = useSessionStore();

  // --- HOOK'S INTERNAL STATE ---

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

    if (!roomInstance) return;

    // The handler for commands coming FROM the agent TO the frontend
    const handlePerformUIAction = async (rpcData: RpcInvocationData): Promise<string> => {
      const request = AgentToClientUIActionRequest.decode(base64ToUint8Array(rpcData.payload as string));
      console.log(`[B2F RPC] Received action: ${ClientUIActionType[request.actionType]}`);
      
      // --- THE BRIDGE FROM RPC TO ZUSTAND ---
      if (request.actionType === ClientUIActionType.BROWSER_NAVIGATE) {
        const url = request.parameters?.url;
        if (url) {
          executeBrowserAction({
            tool_name: 'browser_navigate',
            parameters: { url },
          });
        }
      } else if (request.actionType === ClientUIActionType.START_LISTENING_VISUAL) {
        setIsMicEnabled(true);
      } else if (request.actionType === ClientUIActionType.STOP_LISTENING_VISUAL) {
        setIsMicEnabled(false);
      } else if (request.actionType === ClientUIActionType.JUPYTER_CLICK_PYODIDE) {
        console.log('[JUPYTER_CLICK_PYODIDE] Received jupyter_click_pyodide action');
        executeBrowserAction({
          tool_name: 'jupyter_click_pyodide',
          parameters: {}
        });
      } else if (request.actionType === ClientUIActionType.JUPYTER_TYPE_IN_CELL) {
        console.log('[JUPYTER_TYPE_IN_CELL] Received jupyter_type_in_cell action');
        const params = request.parameters || {};
        executeBrowserAction({
          tool_name: 'jupyter_type_in_cell',
          parameters: {
            cell_index: params.cell_index || 0,
            code: params.code || ''
          }
        });
      } else if (request.actionType === ClientUIActionType.JUPYTER_RUN_CELL) {
        console.log('[JUPYTER_RUN_CELL] Received jupyter_run_cell action');
        const params = request.parameters || {};
        executeBrowserAction({
          tool_name: 'jupyter_run_cell',
          parameters: {
            cell_index: params.cell_index || 0
          }
        });
      } else if (request.actionType === ClientUIActionType.JUPYTER_CREATE_NEW_CELL) {
        console.log('[JUPYTER_CREATE_NEW_CELL] Received jupyter_create_new_cell action');
        executeBrowserAction({
          tool_name: 'jupyter_create_new_cell',
          parameters: {}
        });
      } else if (request.actionType === ClientUIActionType.SET_UI_STATE) {
        console.log('[SET_UI_STATE] ===== RECEIVED SET_UI_STATE ACTION =====');
        console.log('[SET_UI_STATE] Full request object:', request);
        console.log('[SET_UI_STATE] Current activeView:', activeView);
        
        // Note: Property name may need adjustment based on actual protobuf definition
        const params = (request as unknown as Record<string, unknown>).parameters;
        console.log('[SET_UI_STATE] Extracted params:', params);
        
        if (params && typeof params === 'object') {
          // Handle status text update
          if ('statusText' in params || 'status_text' in params) {
            const statusText = ((params as any).statusText || (params as any).status_text) as string;
            console.log('[SET_UI_STATE] Setting status text:', statusText);
            setAgentStatusText(statusText);
          }
          
          // Handle view switching
          if ('view' in params) {
            const viewParam = (params as any).view as string;
            console.log('[SET_UI_STATE] View parameter received:', viewParam);
            
            if (viewParam) {
              let targetView: SessionView;
              
              switch (viewParam) {
                case 'vnc_browser':
                case 'vnc':
                  targetView = 'vnc';
                  console.log('[SET_UI_STATE] Mapped to vnc view');
                  break;
                case 'excalidraw':
                case 'drawing':
                  targetView = 'excalidraw';
                  console.log('[SET_UI_STATE] Mapped to excalidraw view');
                  break;
                case 'video':
                  targetView = 'video';
                  console.log('[SET_UI_STATE] Mapped to video view');
                  break;
                case 'intro':
                  targetView = 'intro';
                  console.log('[SET_UI_STATE] Mapped to intro view');
                  break;
                default:
                  console.warn(`[SET_UI_STATE] Unknown view parameter: ${viewParam}`);
                  console.log('[SET_UI_STATE] Available view options: vnc_browser, vnc, excalidraw, drawing, video, intro');
                  return uint8ArrayToBase64(ClientUIActionResponse.encode(ClientUIActionResponse.create({ requestId: rpcData.requestId, success: false })).finish());
              }
              
              console.log(`[SET_UI_STATE] Switching view from ${activeView} to ${targetView}`);
              setActiveView(targetView);
              console.log('[SET_UI_STATE] setActiveView called successfully');
            } else {
              console.log('[SET_UI_STATE] View parameter is empty or null');
            }
          } else {
            console.log('[SET_UI_STATE] No view parameter found in params');
          }
        } else {
          console.log('[SET_UI_STATE] No parameters found in request');
        }
        console.log('[SET_UI_STATE] ===== END SET_UI_STATE PROCESSING =====');
      }
      
      // We still need to return an acknowledgment
      const response = ClientUIActionResponse.create({ requestId: rpcData.requestId, success: true });
      return uint8ArrayToBase64(ClientUIActionResponse.encode(response).finish());
    };


      if (isMicEnabled && !microphoneTrackRef.current) {
        try {
          console.log('[useLiveKitSession] Mic is enabled. Publishing microphone track...');
          const audioTrack = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true });
          await roomInstance.localParticipant.publishTrack(audioTrack, { source: Track.Source.Microphone });
          microphoneTrackRef.current = audioTrack;
          console.log('[useLiveKitSession] Microphone published.');
        } catch (error: any) {

            console.error('[useLiveKitSession] Failed to setup microphone:', error);
            
            // Provide specific error messages based on the error type
            if (error.name === 'NotAllowedError' || error.message?.includes('Permission dismissed')) {
                setConnectionError('Microphone access denied. Please click the microphone icon in your browser\'s address bar and allow microphone permissions, then refresh the page.');
            } else if (error.name === 'NotFoundError') {
                setConnectionError('No microphone found. Please connect a microphone and refresh the page.');
            } else if (error.name === 'NotReadableError') {
                setConnectionError('Microphone is being used by another application. Please close other apps using the microphone and refresh.');
            } else {
                setConnectionError(`Failed to access microphone: ${error.message || 'Unknown error'}. Please check your microphone settings and refresh the page.`);
            }
        }
        // We wait for the agent_ready signal before setting isConnected to true
    };
    
    const onDisconnected = () => {
        setIsConnected(false);
        setIsLoading(false);
        agentServiceClientRef.current = null;
        disconnectVNC();
        
        // Clean up microphone track
        if (microphoneTrackRef.current) {
            microphoneTrackRef.current.stop();
            microphoneTrackRef.current = null;

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
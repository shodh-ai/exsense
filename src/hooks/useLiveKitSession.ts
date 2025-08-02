'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, ConnectionState, RemoteParticipant, RpcError, Track, TrackPublication, AudioTrack, createLocalAudioTrack, Participant, TranscriptionSegment } from 'livekit-client';
import { AgentInteractionClientImpl, AgentToClientUIActionRequest, ClientUIActionResponse, ClientUIActionType } from '@/generated/protos/interaction';
import { useSessionStore, SessionView } from '@/lib/store';
import { useAuth } from '@clerk/nextjs';
import { useBrowserActionExecutor } from './useBrowserActionExecutor';

// File: exsense/src/hooks/useLiveKitSession.ts



// --- RPC UTILITIES ---
// These helpers are essential for the hook's operation.
function uint8ArrayToBase64(buffer: Uint8Array): string {
  let binary = '';
  const len = buffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binary_string = atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes;
}

interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
}

class LiveKitRpcAdapter implements Rpc {
  constructor(private localParticipant: LocalParticipant, private agentIdentity: string) {}
  async request(service: string, method: string, data: Uint8Array): Promise<Uint8Array> {
    const fullMethodName = `${service}/${method}`;
    const payloadString = uint8ArrayToBase64(data);
    try {
      console.log(`F2B RPC Request: To=${this.agentIdentity}, Method=${fullMethodName}`);
      const responseString = await this.localParticipant.performRpc({
        destinationIdentity: this.agentIdentity,
        method: fullMethodName,
        payload: payloadString,
      });
      return base64ToUint8Array(responseString);
    } catch (error) {
      console.error(`F2B RPC request to ${fullMethodName} failed:`, error);
      throw error;
    }
  }
}

// A single room instance to survive React Strict Mode re-mounts.
const roomInstance = new Room({
    adaptiveStream: true,
    dynacast: true,
});

// Main hook
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

  // --- TOKEN FETCHING & CONNECTION LOGIC ---
  useEffect(() => {
    // THIS IS YOUR PROVEN TOKEN-FETCHING LOGIC FROM `LiveKitSession.tsx`.
    // It can be pasted here directly without changes. It will manage its own
    // loading/error states and eventually call `roomInstance.connect(...)`.
    // For this example, we'll represent it with a simplified version.
    
    let mounted = true;
    const connectToRoom = async () => {
        console.log('useLiveKitSession - connectToRoom called:', { roomName, userName });
        if (!roomName || !userName) {
            console.log('Missing roomName or userName, skipping connection');
            return;
        }
        if (roomInstance.state === ConnectionState.Connected || roomInstance.state === ConnectionState.Connecting) {
            console.log('Room already connected/connecting, skipping');
            return;
        }

        console.log('Starting LiveKit connection process');
        setIsLoading(true);
        setConnectionError(null);
        try {
            // Check Clerk authentication
            if (!isSignedIn) {
                throw new Error('User not authenticated. Please login first.');
            }

            const clerkToken = await getToken();
            if (!clerkToken) {
                throw new Error('Failed to get authentication token from Clerk.');
            }

            console.log('Fetching LiveKit token and room from webrtc-token-service...');
            const response = await fetch(`${process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL}/api/generate-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${clerkToken}`,
                },
            });
            
            console.log('Token fetch response status:', response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('Token fetch response data:', data);
            if (!data.success) {
                throw new Error('Token generation failed');
            }
            
            const { studentToken: token, livekitUrl: wsUrl, roomName: actualRoomName } = data;
            
            // Update the room name with the one generated by the backend
            console.log(`[useLiveKitSession] Using backend-generated room: ${actualRoomName}`);
            
            if (!token || !wsUrl) {
                throw new Error('Invalid token response from backend');
            }

            await roomInstance.connect(wsUrl, token);
            if(mounted) {
                // Connection success is handled by the event listeners below
            }
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


  // --- EVENT & RPC HANDLER LOGIC ---
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

    const onConnected = async () => {
        setIsLoading(false);
        // Enable microphone and publish audio track so agent can hear user
        try {
            console.log('[useLiveKitSession] Setting up microphone...');
            const audioTrack = await createLocalAudioTrack({
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
            });
            
            if (roomInstance.localParticipant) {
                await roomInstance.localParticipant.publishTrack(audioTrack, {
                    source: Track.Source.Microphone,
                });
                microphoneTrackRef.current = audioTrack;
                console.log('[useLiveKitSession] Microphone enabled and published');
            }
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
    };

    // The handler for the agent's "I'm ready" signal
    // Handler for audio tracks (agent voice output)
    const handleTrackSubscribed = (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
        console.log(`[useLiveKitSession] Track subscribed:`, {
            kind: track.kind,
            source: publication.source,
            participant: participant.identity
        });
        
        if (track.kind === Track.Kind.Audio) {
            console.log(`[useLiveKitSession] Audio track received from agent ${participant.identity}`);
            const audioTrack = track as AudioTrack;
            
            // Attach the audio track to play agent voice
            const audioElement = audioTrack.attach();
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            
            // Add to DOM temporarily to ensure playback
            document.body.appendChild(audioElement);
            
            // Clean up when track ends
            track.on('ended', () => {
                if (audioElement.parentNode) {
                    audioElement.parentNode.removeChild(audioElement);
                }
            });
            
            setIsAgentSpeaking(true);
        }
    };
    
    const handleTrackUnsubscribed = (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
        console.log(`[useLiveKitSession] Track unsubscribed:`, {
            kind: track.kind,
            source: publication.source,
            participant: participant.identity
        });
        
        if (track.kind === Track.Kind.Audio) {
            setIsAgentSpeaking(false);
        }
    };
    
    // Handler for transcription data
    const handleTranscriptionReceived = (transcriptions: TranscriptionSegment[], participant?: Participant, publication?: TrackPublication) => {
        console.log(`[useLiveKitSession] Transcription received:`, transcriptions);
        // Handle transcription data if needed
    };

    const handleDataReceived = async (payload: Uint8Array, participant?: RemoteParticipant) => {
        if (!participant) return;
        try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'agent_ready' && roomInstance.localParticipant) {
                console.log(`[useLiveKitSession] Agent ready signal received from ${participant.identity}`);
                const adapter = new LiveKitRpcAdapter(roomInstance.localParticipant, participant.identity);
                agentServiceClientRef.current = new AgentInteractionClientImpl(adapter as any);
                
                // Send confirmation RPC to agent to complete handshake
                try {
                    console.log(`[useLiveKitSession] Sending confirmation RPC to agent...`);
                    const confirmationResponse = await roomInstance.localParticipant.performRpc({
                        destinationIdentity: participant.identity,
                        method: 'rox.interaction.AgentInteraction/TestPing',
                        payload: uint8ArrayToBase64(new TextEncoder().encode(JSON.stringify({
                            message: 'Frontend connected and ready',
                            timestamp: Date.now(),
                            userId: userName,
                            roomName: roomName
                        })))
                    });
                    
                    console.log(`[useLiveKitSession] Agent confirmation response:`, confirmationResponse);
                    setIsConnected(true); // NOW we are fully connected and ready to interact
                    
                } catch (rpcError) {
                    console.error(`[useLiveKitSession] Failed to send confirmation RPC to agent:`, rpcError);
                    // Still set connected as the agent is ready, even if confirmation failed
                    setIsConnected(true);
                }
            }
        } catch (error) {
            console.error("Failed to parse agent data packet:", error);
        }
    };
    
    roomInstance.on(RoomEvent.Connected, onConnected);
    roomInstance.on(RoomEvent.Disconnected, onDisconnected);
    roomInstance.on(RoomEvent.DataReceived, handleDataReceived);
    roomInstance.on(RoomEvent.TrackSubscribed, handleTrackSubscribed);
    roomInstance.on(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    roomInstance.on(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);

    if (roomInstance.localParticipant) {
      try {
        roomInstance.localParticipant.registerRpcMethod("rox.interaction.ClientSideUI/PerformUIAction", handlePerformUIAction);
      } catch (e) {
        if (e instanceof RpcError && e.message.includes("already registered")) {
            console.warn("RPC method already registered. This is expected with React Strict Mode / HMR.");
        } else {
            console.error("Failed to register client-side RPC handler:", e);
        }
      }
    }

    return () => {
      roomInstance.off(RoomEvent.Connected, onConnected);
      roomInstance.off(RoomEvent.Disconnected, onDisconnected);
      roomInstance.off(RoomEvent.DataReceived, handleDataReceived);
      roomInstance.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      roomInstance.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      roomInstance.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
    };
  }, [roomName, setIsMicEnabled, setAgentStatusText, setIsAgentSpeaking, userName]); // Add all dependencies


  // --- API EXPOSED TO THE COMPONENTS ---
  // This is the clean interface your UI components will use to talk to the agent.
  const startTask = useCallback(async (taskName: string, payload: object) => {
    if (!agentServiceClientRef.current) {
      setConnectionError("Cannot start task: Agent is not ready.");
      console.error("Agent is not ready, cannot start task.");
      return;
    }
    try {
      console.log(`[F2B RPC] Starting task: ${taskName}`);
      const request = {
        taskName: taskName,
        jsonPayload: JSON.stringify(payload),
      };
      await agentServiceClientRef.current.InvokeAgentTask(request);
    } catch (e) {
      console.error("Failed to start agent task:", e);
      setConnectionError(`Failed to start task: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  return { isConnected, isLoading, connectionError, startTask, room: roomInstance };
}
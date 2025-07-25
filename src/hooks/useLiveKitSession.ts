'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, ConnectionState, DataPacket_Kind, RemoteParticipant, RpcError } from 'livekit-client';
import { AgentInteractionClientImpl, AgentToClientUIActionRequest, ClientUIActionResponse, ClientUIActionType } from '@/generated/protos/interaction';
import { useSessionStore } from '@/lib/store';

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
  // --- ZUSTAND STORE ACTIONS ---
  // Get all the actions we'll need to update the global UI state
  const {
    setActiveView,
    setAgentStatusText,
    setIsAgentSpeaking,
    setIsStudentTurn,
    setIsMicEnabled, // Our new action for mic control
  } = useSessionStore();

  // --- HOOK'S INTERNAL STATE ---
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  
  const agentServiceClientRef = useRef<AgentInteractionClientImpl | null>(null);

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
            // Fetch token from pronity-backend with authentication
            const authToken = localStorage.getItem('authToken');
            console.log('Auth token found:', !!authToken);
            if (!authToken) {
                throw new Error('No authentication token found. Please login first.');
            }

            console.log('Fetching LiveKit token from backend...');
            const response = await fetch(`http://localhost:8000/api/generate-token`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
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
        } catch (error: any) {
            if (mounted) {
                setConnectionError(`Failed to connect: ${error.message}`);
                setIsLoading(false);
            }
        }
    };
    connectToRoom();

    return () => { mounted = false; };
  }, [roomName, userName]);


  // --- EVENT & RPC HANDLER LOGIC ---
  useEffect(() => {
    if (!roomInstance) return;

    // The handler for commands coming FROM the agent TO the frontend
    const handlePerformUIAction = async (rpcData: RpcInvocationData): Promise<string> => {
      const request = AgentToClientUIActionRequest.decode(base64ToUint8Array(rpcData.payload as string));
      console.log(`[B2F RPC] Received action: ${ClientUIActionType[request.actionType]}`);
      
      // --- THE BRIDGE FROM RPC TO ZUSTAND ---
      if (request.actionType === ClientUIActionType.START_LISTENING_VISUAL) {
        setIsMicEnabled(true);
      } else if (request.actionType === ClientUIActionType.STOP_LISTENING_VISUAL) {
        setIsMicEnabled(false);
      } else if (request.actionType === ClientUIActionType.SET_UI_STATE) {
        const params = request.setUiStatePayload;
        if (params?.statusText) setAgentStatusText(params.statusText);
        // ... update other Zustand state based on payload
      }
      
      // We still need to return an acknowledgment
      const response = ClientUIActionResponse.create({ requestId: rpcData.requestId, success: true });
      return uint8ArrayToBase64(ClientUIActionResponse.encode(response).finish());
    };

    const onConnected = () => {
        setIsLoading(false);
        // We wait for the agent_ready signal before setting isConnected to true
    };
    
    const onDisconnected = () => {
        setIsConnected(false);
        setIsLoading(false);
        agentServiceClientRef.current = null;
    };

    // The handler for the agent's "I'm ready" signal
    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
        if (!participant) return;
        try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            if (data.type === 'agent_ready' && roomInstance.localParticipant) {
                console.log(`[useLiveKitSession] Agent ready signal received from ${participant.identity}`);
                const adapter = new LiveKitRpcAdapter(roomInstance.localParticipant, participant.identity);
                agentServiceClientRef.current = new AgentInteractionClientImpl(adapter);
                setIsConnected(true); // NOW we are fully connected and ready to interact
            }
        } catch (error) {
            console.error("Failed to parse agent data packet:", error);
        }
    };
    
    roomInstance.on(RoomEvent.Connected, onConnected);
    roomInstance.on(RoomEvent.Disconnected, onDisconnected);
    roomInstance.on(RoomEvent.DataReceived, handleDataReceived);

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
    };
  }, [setIsMicEnabled, setAgentStatusText]); // Add all Zustand setters as dependencies


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
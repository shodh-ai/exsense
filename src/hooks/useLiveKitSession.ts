//hooks the main one
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Observable, firstValueFrom } from 'rxjs';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, ConnectionState, RemoteParticipant, RpcError, Track, TrackPublication, AudioTrack, createLocalAudioTrack, Participant, TranscriptionSegment } from 'livekit-client';
import { AgentInteractionClientImpl, AgentToClientUIActionRequest, ClientUIActionResponse, ClientUIActionType } from '@/generated/protos/interaction';
import { useSessionStore, SessionView } from '@/lib/store';
import { useAuth } from '@clerk/nextjs';
import { useBrowserActionExecutor } from './useBrowserActionExecutor';
import { transcriptEventEmitter } from '@/lib/TranscriptEventEmitter';

// File: exsense/src/hooks/useLiveKitSession.ts

const LIVEKIT_DEBUG = false;
const SESSION_FLOW_DEBUG = true;
const DELETE_ON_UNLOAD = (process.env.NEXT_PUBLIC_SESSION_DELETE_ON_UNLOAD || 'true').toLowerCase() === 'true';

// Type declaration for Mermaid debug interface
declare global {
  interface Window {
    __mermaidDebug?: {
      setDiagram: (diagram: string) => void;
    };
  }
}


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

// Map an external session-manager status URL to our local Next.js proxy route to avoid CORS
function toLocalStatusUrl(externalUrl: string): string {
  try {
    // If already relative, keep it
    if (!/^https?:/i.test(externalUrl)) return externalUrl;
    // Extract job id from .../status/<jobId>
    const match = externalUrl.match(/\/status\/([^/?#]+)/);
    if (match && match[1]) {
      return `/api/sessions/status/${match[1]}`;
    }
  } catch {}
  return externalUrl; // fallback
}

interface Rpc {
  request(service: string, method: string, data: Uint8Array): Promise<Uint8Array>;
  clientStreamingRequest(service: string, method: string, data: Observable<Uint8Array>): Promise<Uint8Array>;
  serverStreamingRequest(service: string, method: string, data: Uint8Array): Observable<Uint8Array>;
  bidirectionalStreamingRequest(service: string, method: string, data: Observable<Uint8Array>): Observable<Uint8Array>;
}

class LiveKitRpcAdapter implements Rpc {
  constructor(private localParticipant: LocalParticipant, private agentIdentity: string) {}

  async request(service: string, method: string, data: Uint8Array): Promise<Uint8Array> {
    const fullMethodName = `${service}/${method}`;
    const payloadString = uint8ArrayToBase64(data);
    try {
      if (LIVEKIT_DEBUG) console.log(`F2B RPC Request: To=${this.agentIdentity}, Method=${fullMethodName}`);
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

  // LiveKit RPC currently supports unary request/response. We emulate server-streaming
  // by returning a single-emission Observable wrapping the unary result.
  serverStreamingRequest(service: string, method: string, data: Uint8Array): Observable<Uint8Array> {
    return new Observable<Uint8Array>((subscriber) => {
      this.request(service, method, data)
        .then((resp) => {
          subscriber.next(resp);
          subscriber.complete();
        })
        .catch((err) => subscriber.error(err));
    });
  }

  // Not supported in current transport
  clientStreamingRequest(): Promise<Uint8Array> {
    return Promise.reject(new Error('clientStreamingRequest is not supported by LiveKitRpcAdapter'));
  }

  // Not supported in current transport
  bidirectionalStreamingRequest(): Observable<Uint8Array> {
    return new Observable<Uint8Array>((subscriber) => {
      subscriber.error(new Error('bidirectionalStreamingRequest is not supported by LiveKitRpcAdapter'));
    });
  }
}

// A single room instance to survive React Strict Mode re-mounts.
// For reliability, disable adaptiveStream/dynacast so remote video is always delivered.
const roomInstance = new Room({
    adaptiveStream: false,
    dynacast: false,
});

// Main hook
export interface UseLiveKitSessionReturn {
  isConnected: boolean;
  isLoading: boolean;
  connectionError: string | null;
  startTask: (taskName: string, payload: object) => Promise<void>;
  room: Room;
  agentIdentity: string | null;
  transcriptionMessages: string[];
  statusMessages: string[];
  selectSuggestedResponse: (suggestion: { id: string; text: string; reason?: string }) => Promise<void>;
  livekitUrl: string;
  livekitToken: string;
  deleteSessionNow: () => Promise<void>;
  sendBrowserInteraction: (payload: object) => Promise<void>;
  sessionStatusUrl?: string | null;
  sessionManagerSessionId?: string | null;
  // --- Browser tab controls ---
  openNewTab: (name: string, url: string) => Promise<void>;
  switchTab: (tabId: string) => Promise<void>;
  closeTab: (tabId: string) => Promise<void>;
}

export interface LiveKitSpawnOptions {
  spawnAgent?: boolean;
  spawnBrowser?: boolean;
}

export function useLiveKitSession(roomName: string, userName: string, courseId?: string, options?: LiveKitSpawnOptions): UseLiveKitSessionReturn {
  // --- CLERK AUTHENTICATION ---
  const { getToken, isSignedIn } = useAuth();
  const visualizerBaseUrl = process.env.NEXT_PUBLIC_VISUALIZER_URL;
  const { executeBrowserAction } = useBrowserActionExecutor(roomInstance);
  
  // --- ZUSTAND STORE ACTIONS ---
  // Select only needed actions to avoid broad subscription re-renders
  const setActiveView = useSessionStore((s) => s.setActiveView);
  const setAgentStatusText = useSessionStore((s) => s.setAgentStatusText);
  const setIsAgentSpeaking = useSessionStore((s) => s.setIsAgentSpeaking);
  const setIsMicEnabled = useSessionStore((s) => s.setIsMicEnabled); // mic control
  const setIsMicActivatingPending = useSessionStore((s) => s.setIsMicActivatingPending);
  const setSuggestedResponses = useSessionStore((s) => s.setSuggestedResponses);
  const clearSuggestedResponses = useSessionStore((s) => s.clearSuggestedResponses);
  // Browser tab actions from store
  const addTab = useSessionStore((s) => s.addTab);
  const removeTab = useSessionStore((s) => s.removeTab);
  const setActiveTabIdInStore = useSessionStore((s) => s.setActiveTabId);

  // --- HOOK'S INTERNAL STATE ---
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [agentIdentity, setAgentIdentity] = useState<string | null>(null);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [livekitToken, setLivekitToken] = useState<string>('');
  const [sessionStatusUrlState, setSessionStatusUrlState] = useState<string | null>(null);
  const [sessionManagerSessionIdState, setSessionManagerSessionIdState] = useState<string | null>(null);
  // Prevent duplicate connect/token fetch during Strict Mode/HMR
  const connectStartedRef = useRef<boolean>(false);
  // Track session-manager sessionId for cleanup (pod deletion)
  const sessionIdRef = useRef<string | null>(null);
  const sessionStatusUrlRef = useRef<string | null>(null);
  // Ensure we only send the initial navigate once per session
  const initialNavSentRef = useRef<boolean>(false);
  // Expose a deletion helper that multiple event hooks can call
  const sendDeleteNowRef = useRef<null | (() => Promise<void>)>(null);
  // Track if we are actually unloading the page (not just React unmount/HMR)
  const isUnloadingRef = useRef<boolean>(false);
  
  // New state for UI display
  const [transcriptionMessages, setTranscriptionMessages] = useState<string[]>([]);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  
  const agentServiceClientRef = useRef<AgentInteractionClientImpl | null>(null);
  const microphoneTrackRef = useRef<AudioTrack | null>(null);

  // LOG 1: Is the hook even running?
  console.log('[DIAGNOSTIC] 1. useLiveKitSession hook has started.');

  // --- TOKEN FETCHING & CONNECTION LOGIC ---
  useEffect(() => {
    // THIS IS YOUR PROVEN TOKEN-FETCHING LOGIC FROM `LiveKitSession.tsx`.
    // It can be pasted here directly without changes. It will manage its own
    // loading/error states and eventually call `roomInstance.connect(...)`.
    // For this example, we'll represent it with a simplified version.
    
    let mounted = true;
    const connectToRoom = async () => {
        // LOG 2: Is the connect function being called?
        console.log('[DIAGNOSTIC] 2. connectToRoom function called.');
        if (LIVEKIT_DEBUG) console.log('useLiveKitSession - connectToRoom called:', { roomName, userName });
        if (!roomName || !userName || !courseId) {
            if (LIVEKIT_DEBUG) console.log('Missing roomName, userName, or courseId, skipping connection');
            setIsLoading(false);
            if (!courseId) setConnectionError('Missing courseId. Please provide a valid courseId in the URL.');
            return;
        }
        if (roomInstance.state === ConnectionState.Connected || roomInstance.state === ConnectionState.Connecting) {
            if (LIVEKIT_DEBUG) console.log('Room already connected/connecting, skipping');
            return;
        }
        if (connectStartedRef.current) {
            if (SESSION_FLOW_DEBUG) console.log('[FLOW] connectToRoom already started; skipping duplicate');
            return;
        }

        if (LIVEKIT_DEBUG) console.log('Starting LiveKit connection process');
        setIsLoading(true);
        setConnectionError(null);
        try {
            connectStartedRef.current = true;
            // Check Clerk authentication
            if (!isSignedIn) {
                throw new Error('User not authenticated. Please login first.');
            }

            const clerkToken = await getToken();
            if (!clerkToken) {
                throw new Error('Failed to get authentication token from Clerk.');
            }
            if (SESSION_FLOW_DEBUG) console.log('[FLOW] Clerk auth OK, acquired session token');

            const tokenServiceUrl = process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL;
            if (!tokenServiceUrl) {
                throw new Error('Missing NEXT_PUBLIC_WEBRTC_TOKEN_URL');
            }

            console.log(`[FLOW] Requesting token+room from ${tokenServiceUrl}/api/generate-room (courseId=${courseId})`);
            const response = await fetch(`${tokenServiceUrl}/api/generate-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${clerkToken}`,
                },
                body: JSON.stringify({
                    curriculum_id: courseId,
                    // Default behavior: spawn both unless explicitly disabled by caller
                    spawn_agent: options?.spawnAgent !== false,
                    spawn_browser: options?.spawnBrowser !== false,
                }),
            });
            
            console.log('[FLOW] Token service response status:', response.status);
            if (!response.ok) {
                throw new Error(`Failed to fetch token: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            // LOG 3: Did we get a valid token from our service?
            console.log('[DIAGNOSTIC] 3. Token fetched successfully. Preparing to connect to LiveKit.');
            console.log('[FLOW] Token service response data:', data);
            if (!data.success) {
                throw new Error('Token generation failed');
            }

            const { studentToken: token, livekitUrl: wsUrl, roomName: actualRoomName } = data;
            // NEW: capture sessionId immediately if provided by token service
            try {
                const sid = (data.sessionId as string | null) || null;
                if (sid && typeof sid === 'string' && sid.startsWith('sess-')) {
                  sessionIdRef.current = sid;
                  setSessionManagerSessionIdState(sid);
                  if (SESSION_FLOW_DEBUG) console.log('[FLOW] Captured sessionId from token service response:', sid);
                }
            } catch {}
            const sessionStatusUrl: string | undefined = (data.sessionStatusUrl as string | undefined) || undefined;
            if (sessionStatusUrl) {
              const proxied = toLocalStatusUrl(sessionStatusUrl);
              sessionStatusUrlRef.current = proxied;
              setSessionStatusUrlState(proxied);
            }
            
            // Update the room name with the one generated by the backend
            console.log(`[FLOW] Using backend-generated room: ${actualRoomName}`);
            
            if (!token || !wsUrl) {
                throw new Error('Invalid token response from backend');
            }

            // Save for UI components (e.g., LiveKitViewer)
            setLivekitUrl(wsUrl);
            setLivekitToken(token);
            console.log(`[FLOW] Connecting to LiveKit at ${wsUrl} with issued token...`);
            // LOG 4: Are we about to call the connect method?
            console.log('[DIAGNOSTIC] 4. Calling roomInstance.connect() NOW.');
            await roomInstance.connect(wsUrl, token);
            // LOG 5: Did the connect method complete without throwing an error?
            console.log('[DIAGNOSTIC] 5. roomInstance.connect() has completed.');
            try {
                // Debug: expose room for console inspection and add event listeners
                // You can inspect window.lkRoom.remoteParticipants in DevTools
                // and see trackPublications when they arrive.
                (window as any).lkRoom = roomInstance;
                roomInstance.on('participantConnected', (p: any) => {
                    try { console.log('[LK] participantConnected:', p?.identity); } catch {}
                    try {
                        p.on?.('trackSubscribed', (track: any, pub: any, participant: any) => {
                            try { console.log('[LK] trackSubscribed:', { kind: track?.kind, sid: pub?.trackSid, from: participant?.identity }); } catch {}
                        });
                        p.on?.('trackPublished', (pub: any) => {
                            try { console.log('[LK] trackPublished from', p?.identity, pub?.trackSid); } catch {}
                        });
                    } catch {}
                });
                // Attach listeners for already present participants
                Array.from(roomInstance.remoteParticipants.values()).forEach((p: any) => {
                    try {
                        p.on?.('trackSubscribed', (track: any, pub: any, participant: any) => {
                            try { console.log('[LK] trackSubscribed (existing p):', { kind: track?.kind, sid: pub?.trackSid, from: participant?.identity }); } catch {}
                        });
                    } catch {}
                });
            } catch {}
            
            // --- Capture sessionId for cleanup regardless of reconnect setting ---
            if (sessionStatusUrl) {
                // background task to fetch sessionId once READY (faster: immediate + 2s polling)
                (async () => {
                    try {
                        const tryFetch = async () => {
                            const statusUrl = sessionStatusUrlRef.current || sessionStatusUrl;
                            const stResp = await fetch(statusUrl, { cache: 'no-store' });
                            if (stResp.ok) {
                                const st = await stResp.json();
                                const sessId = st?.sessionId as string | undefined;
                                if (sessId && sessId.startsWith('sess-')) {
                                    sessionIdRef.current = sessId;
                                    setSessionManagerSessionIdState(sessId);
                                    if (SESSION_FLOW_DEBUG) console.log('[FLOW] Captured sessionId for cleanup:', sessId);
                                    return true;
                                  }
                            }
                            return false;
                        };
                        // Immediate attempt
                        if (await tryFetch()) return;
                        // Poll every 2s up to 60s
                        const MAX_ATTEMPTS = 30;
                        for (let i = 0; i < MAX_ATTEMPTS && mounted; i++) {
                            await new Promise(r => setTimeout(r, 2000));
                            if (await tryFetch()) return;
                        }
                    } catch (e) {
                        console.warn('[FLOW] Could not capture sessionId for cleanup:', e);
                    }
                })();
            }

            // --- DEV OPTION A (gated): Poll session-manager and reconnect viewer to sess-<id> room when READY ---
            const DEV_FORCE_RECONNECT = (process.env.NEXT_PUBLIC_LK_DEV_RECONNECT || '').toLowerCase() === 'true';
            if (sessionStatusUrl && DEV_FORCE_RECONNECT) {
                (async () => {
                    try {
                        const statusUrl = sessionStatusUrlRef.current || sessionStatusUrl;
                        if (SESSION_FLOW_DEBUG) console.log('[FLOW] Polling session status URL:', statusUrl);
                        // Give some time for the browser pod to join and publish to the initial room.
                        // If a video track arrives, we will skip the dev reconnect.
                        await new Promise(r => setTimeout(r, 12000));
                        const MAX_ATTEMPTS = 24; // ~2 minutes @5s
                        for (let i = 0; i < MAX_ATTEMPTS && mounted; i++) {
                            const stResp = await fetch(statusUrl);
                            if (!stResp.ok) {
                                if (SESSION_FLOW_DEBUG) console.warn('[FLOW] Session status HTTP', stResp.status);
                            } else {
                                const st = await stResp.json();
                                const status = st?.status as string | undefined;
                                const sessId = st?.sessionId as string | undefined;
                                if (SESSION_FLOW_DEBUG) console.log(`[FLOW] Session status attempt ${i+1}:`, status, sessId);
                                if (status === 'READY' && sessId) {
                                    // If we already have a remote video track, don't switch rooms.
                                    try {
                                        const anyVideo = Array.from(roomInstance.remoteParticipants.values()).some((p: RemoteParticipant) => {
                                            return Array.from(p.trackPublications.values()).some((pub: TrackPublication) => {
                                                return (pub.isSubscribed === true) || (!!pub.track);
                                            });
                                        });
                                        if (anyVideo) {
                                            if (SESSION_FLOW_DEBUG) console.log('[FLOW] Remote video already present; skipping dev reconnect');
                                            break;
                                        }
                                    } catch (chkErr) {
                                        console.warn('[FLOW] Could not check for remote video presence:', chkErr);
                                    }
                                    // Request a token for the session room
                                    const tokenServiceUrl = process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL as string;
                                    const bearer = await getToken();
                                    const devResp = await fetch(`${tokenServiceUrl}/api/dev/token-for-room`, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            ...(bearer ? { 'Authorization': `Bearer ${bearer}` } : {}),
                                        },
                                        body: JSON.stringify({ room_name: sessId })
                                    });
                                    if (!devResp.ok) {
                                        console.error('[FLOW] token-for-room failed:', devResp.status, devResp.statusText);
                                        break;
                                    }
                                    const devData = await devResp.json();
                                    const newToken = devData?.studentToken as string | undefined;
                                    const newUrl = devData?.livekitUrl as string | undefined;
                                    if (!newToken || !newUrl) {
                                        console.error('[FLOW] token-for-room missing fields');
                                        break;
                                    }
                                    if (SESSION_FLOW_DEBUG) console.log(`[FLOW] Reconnecting viewer to session room: ${sessId}`);
                                    try {
                                        await roomInstance.disconnect();
                                    } catch {}
                                    // allow reconnect
                                    connectStartedRef.current = false;
                                    setLivekitUrl(newUrl);
                                    setLivekitToken(newToken);
                                    await roomInstance.connect(newUrl, newToken);
                                    if (SESSION_FLOW_DEBUG) console.log('[FLOW] Viewer reconnected to session room');
                                    break;
                                }
                                if (status === 'FAILED') {
                                    console.error('[FLOW] Session-manager reported FAILED:', st?.error);
                                    break;
                                }
                            }
                            await new Promise(r => setTimeout(r, 5000));
                        }
                    } catch (err) {
                        console.error('[FLOW] Error while polling/reconnecting to session room:', err);
                    }
                })();
            }
            if(mounted) {
                // Connection success is handled by the event listeners below
            }
        } catch (error: unknown) {
            // LOG E: If anything fails in the try block
            console.error('[DIAGNOSTIC] ERROR in connectToRoom:', error);
            if (mounted) {
                setConnectionError(`Failed to connect: ${error instanceof Error ? error.message : String(error)}`);
                setIsLoading(false);
                connectStartedRef.current = false; // allow retry on error
            }
        }
    };
    connectToRoom();

    return () => { mounted = false; };
  }, [roomName, userName, courseId, options?.spawnAgent, options?.spawnBrowser, getToken, isSignedIn]);


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
        // Safety net: ensure pending flag is cleared when backend enables mic
        try { setIsMicActivatingPending(false); } catch {}
        // Enable microphone so user can be heard
        if (roomInstance.localParticipant) {
          await roomInstance.localParticipant.setMicrophoneEnabled(true);
          const statusMsg = 'Microphone enabled - user can now speak';
          console.log(`[useLiveKitSession] ${statusMsg}`);
          setStatusMessages(prev => [...prev.slice(-9), statusMsg]); // Keep last 10 status messages
        }
      } else if (request.actionType === ClientUIActionType.STOP_LISTENING_VISUAL) {
        setIsMicEnabled(false);
        // Disable microphone so user cannot be heard
        if (roomInstance.localParticipant) {
          await roomInstance.localParticipant.setMicrophoneEnabled(false);
          const statusMsg = 'Microphone disabled - user cannot be heard';
          console.log(`[useLiveKitSession] ${statusMsg}`);
          setStatusMessages(prev => [...prev.slice(-9), statusMsg]); // Keep last 10 status messages
        }
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
        console.log('[SET_UI_STATE] Current activeView:', useSessionStore.getState().activeView);
        
        // Note: Property name may need adjustment based on actual protobuf definition
        const params = (request as unknown as Record<string, unknown>).parameters;
        console.log('[SET_UI_STATE] Extracted params:', params);
        
        // --- Lightweight request/response hook: GET_BLOCK_CONTENT ---
        try {
          const innerAction = ((params as any)?.action || (params as any)?.Action || '').toString();
          if (innerAction === 'GET_BLOCK_CONTENT') {
            const blockId = ((params as any)?.block_id || (params as any)?.blockId || (params as any)?.id || '').toString();
            let result: any = null;
            if (blockId) {
              const { whiteboardBlocks } = useSessionStore.getState();
              const found = (whiteboardBlocks || []).find(b => b.id === blockId);
              if (found) result = found;
            }
            const response = ClientUIActionResponse.create({
              requestId: rpcData.requestId,
              success: !!result,
              message: result ? JSON.stringify(result) : ''
            });
            return uint8ArrayToBase64(ClientUIActionResponse.encode(response).finish());
          }
        } catch (e) {
          console.warn('[SET_UI_STATE] Inline GET_BLOCK_CONTENT handling error:', e);
        }

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
              
              console.log(`[SET_UI_STATE] Switching view from ${useSessionStore.getState().activeView} to ${targetView}`);
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
      } else if (request.actionType === ClientUIActionType.SUGGESTED_RESPONSES) {
        console.log('[B2F RPC] Handling SUGGESTED_RESPONSES');
        const payload = request.suggestedResponsesPayload;
        if (payload && Array.isArray(payload.suggestions)) {
          const now = Date.now();
          const suggestions = payload.suggestions.map((s: any, idx: number) => {
            const idRaw = s?.id;
            const id = typeof idRaw === 'string' && idRaw.trim().length > 0 ? idRaw : `s_${now}_${idx}`;
            const textRaw = s?.text;
            const text = typeof textRaw === 'string' ? textRaw : String(textRaw ?? '');
            return { id, text, reason: s?.reason } as { id: string; text: string; reason?: string };
          });
          try {
            setSuggestedResponses(suggestions, payload.title);
            console.log(`[B2F RPC] Set ${suggestions.length} suggested responses${payload.title ? ` with title: ${payload.title}` : ''}`);
          } catch (e) {
            console.error('[B2F RPC] Failed to set suggested responses in store:', e);
          }
        } else {
          // --- Fallback: some agents send suggestions via request.parameters ---
          const params = (request as any).parameters || {};
          const parseMaybeJson = (v: unknown) => {
            if (typeof v === 'string') {
              try { return JSON.parse(v); } catch { return v; }
            }
            return v;
          };
          const candidate = parseMaybeJson(params.suggestions ?? params.suggested_responses);
          const titleParam = (params.title ?? params.suggested_title) as string | undefined;
          if (candidate) {
            let suggestions: { id: string; text: string; reason?: string }[] = [];
            if (Array.isArray(candidate)) {
              if (candidate.length > 0 && typeof candidate[0] === 'string') {
                suggestions = (candidate as string[]).map((t, idx) => ({ id: `s_${Date.now()}_${idx}`, text: t }));
              } else {
                suggestions = (candidate as any[]).map((s: any, idx: number) => ({ id: s.id || `s_${Date.now()}_${idx}` , text: s.text || String(s), reason: s.reason }));
              }
            } else if (typeof candidate === 'string') {
              // Single string -> one suggestion
              suggestions = [{ id: `s_${Date.now()}_0`, text: candidate }];
            }
            if (suggestions.length > 0) {
              try {
                setSuggestedResponses(suggestions, titleParam);
                console.log(`[B2F RPC] Set ${suggestions.length} suggested responses from parameters${titleParam ? ` with title: ${titleParam}` : ''}`);
              } catch (e) {
                console.error('[B2F RPC] Failed to set suggested responses (parameters) in store:', e);
              }
            } else {
              console.warn('[B2F RPC] Parameters present but could not derive suggestions:', candidate);
            }
          } else {
            console.warn('[B2F RPC] SUGGESTED_RESPONSES payload missing or invalid, and no parsable parameters found:', { payload, params });
          }
        }
      } else if (
        // Prefer enum when available, but also handle numeric value for backward compatibility
        (ClientUIActionType as any).RRWEB_REPLAY ?
          request.actionType === (ClientUIActionType as any).RRWEB_REPLAY :
          (request.actionType as number) === 73
      ) {
        console.log('[B2F RPC] Handling RRWEB_REPLAY');
        const url = (request as any).parameters?.events_url;
        if (url && typeof url === 'string') {
          try {
            // Add rrweb replay as a block in the whiteboard feed
            const params = (request as any).parameters || {};
            const id = params.id || `rrweb_${Date.now()}`;
            const summary = params.summary || params.title || 'Session Replay';
            const block = { id, type: 'rrweb', summary, eventsUrl: url } as any;
            useSessionStore.getState().addBlock(block);
            // Switch to whiteboard view so the user sees the replay
            try { setActiveView('excalidraw' as SessionView); } catch {}
            console.log('[B2F RPC] rrweb replay block added to whiteboard feed');
          } catch (e) {
            console.error('[B2F RPC] Failed to add rrweb replay block:', e);
          }
        } else {
          console.error('[B2F RPC] RRWEB_REPLAY action received without a valid events_url.');
        }
      } else if (
        // SET_UI_STATE is used for a lightweight request/response hook as well
        (ClientUIActionType as any).SET_UI_STATE ?
          request.actionType === (ClientUIActionType as any).SET_UI_STATE :
          (request.actionType as number) === 41
      ) {
        // If the agent is asking for block content, return it in the response message
        try {
          const p = (request as any).parameters || {};
          const inner = typeof p === 'object' ? p : {};
          const innerAction = (inner.action || inner.Action || '').toString();
          if (innerAction === 'GET_BLOCK_CONTENT') {
            const blockId = (inner.block_id || inner.blockId || inner.id || '').toString();
            let result: any = null;
            if (blockId) {
              const { whiteboardBlocks } = useSessionStore.getState();
              const found = (whiteboardBlocks || []).find(b => b.id === blockId);
              if (found) result = found;
            }
            const response = ClientUIActionResponse.create({
              requestId: rpcData.requestId,
              success: !!result,
              message: result ? JSON.stringify(result) : ''
            });
            return uint8ArrayToBase64(ClientUIActionResponse.encode(response).finish());
          }
        } catch (e) {
          console.warn('[B2F RPC] SET_UI_STATE handler error:', e);
        }
        // default ack
        const response = ClientUIActionResponse.create({ requestId: rpcData.requestId, success: true });
        return uint8ArrayToBase64(ClientUIActionResponse.encode(response).finish());
      } else if (
        // Prefer enum when available, but also handle numeric value for backward compatibility
        (ClientUIActionType as any).EXCALIDRAW_CLEAR_CANVAS ?
          request.actionType === (ClientUIActionType as any).EXCALIDRAW_CLEAR_CANVAS :
          (request.actionType as number) === 64
      ) { // EXCALIDRAW_CLEAR_CANVAS
        console.log('[B2F RPC] Handling EXCALIDRAW_CLEAR_CANVAS');
        // Clear canvas via debug functions if available
        if (typeof window !== 'undefined' && window.__excalidrawDebug) {
          try {
            window.__excalidrawDebug.clearCanvas();
            console.log('[B2F RPC] ✅ Canvas cleared successfully');
          } catch (error) {
            console.error('[B2F RPC] ❌ Failed to clear canvas:', error);
          }
        } else {
          console.warn('[B2F RPC] ⚠️ Excalidraw debug functions not available for canvas clear');
        }
      } else if (
        (ClientUIActionType as any).GENERATE_VISUALIZATION ?
          request.actionType === (ClientUIActionType as any).GENERATE_VISUALIZATION :
          (request.actionType as number) === 49
      ) { // GENERATE_VISUALIZATION
        console.log('[B2F RPC] Handling GENERATE_VISUALIZATION');
        try {
          const params = request.parameters || {} as any;
          // Path A: Precomputed elements provided
          const elements = params.elements ? JSON.parse(params.elements) : null;
          if (elements && Array.isArray(elements)) {
            console.log(`[B2F RPC] Parsed ${elements.length} elements from RPC`);
            const { setVisualizationData } = useSessionStore.getState();
            if (setVisualizationData) {
              console.log('[B2F RPC] Setting visualization data in store...');
              setVisualizationData(elements);
            } else {
              console.warn('[B2F RPC] Store setVisualizationData not available, using direct method');
              if (typeof window !== 'undefined' && window.__excalidrawDebug) {
                const excalidrawElements = window.__excalidrawDebug.convertSkeletonToExcalidraw(elements);
                window.__excalidrawDebug.setElements(excalidrawElements);
                console.log('[B2F RPC] ✅ Direct visualization rendering completed');
              }
            }
          } else {
          // Path B: Only prompt provided -> call Visualizer service from frontend
          const prompt = params.prompt as string | undefined;
          const topicContext = (params.topic_context as string | undefined) || '';
          if (!prompt) {
            console.error('[B2F RPC] ❌ GENERATE_VISUALIZATION missing both elements and prompt');
          } else {
            console.log('[B2F RPC] Optimistic UI: showing placeholder and calling Visualizer...');
            // --- Optimistic UI: show placeholder immediately ---
            const placeholderSkeleton = [
              {
                id: 'generating_placeholder',
                type: 'text',
                text: '🎨 Generating diagram...',
                x: 100,
                y: 80,
                width: 260,
                height: 40,
                fontSize: 20,
                strokeColor: '#1e1e1e'
              }
            ];
            try {
              const { setVisualizationData } = useSessionStore.getState();
              if (setVisualizationData) {
                setVisualizationData(placeholderSkeleton as any);
              } else if (typeof window !== 'undefined' && window.__excalidrawDebug) {
                const excalidrawElements = window.__excalidrawDebug.convertSkeletonToExcalidraw(placeholderSkeleton);
                window.__excalidrawDebug.setElements(excalidrawElements);
              }
            } catch (phErr) {
              console.warn('[B2F RPC] Placeholder render failed (non-fatal):', phErr);
            }
            // Call the Visualizer to get Mermaid text and let the client convert it
            const { setDiagramDefinition, setIsDiagramGenerating } = useSessionStore.getState();
            try {
              if (!visualizerBaseUrl) {
                throw new Error('NEXT_PUBLIC_VISUALIZER_URL is not set');
              }
              setIsDiagramGenerating?.(true);
              const resp = await fetch(`${visualizerBaseUrl}/generate-mermaid-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic_context: topicContext, text_to_visualize: prompt })
              });
              if (!resp.ok) {
                throw new Error(`Visualizer service returned ${resp.status}`);
              }
              const text = (await resp.text()).trim();
              // Send to debug window (optional) and update centralized state
              if (text && typeof window !== 'undefined' && (window as any).__mermaidDebug?.setDiagram) {
                try { (window as any).__mermaidDebug.setDiagram(text); } catch {}
              }
              setDiagramDefinition?.(text);
              if (LIVEKIT_DEBUG) console.log('[B2F RPC] ✅ Mermaid text received and state updated');
            } catch (svcErr) {
              console.error('[B2F RPC] ❌ Failed to call Visualizer service:', svcErr);
              // Replace placeholder with an error message on failure
              try {
                const errorSkeleton = [
                  {
                    id: 'generating_error',
                    type: 'text',
                    text: '⚠️ Could not generate diagram.'
                  }
                ];
                const { setVisualizationData } = useSessionStore.getState();
                if (setVisualizationData) {
                  setVisualizationData(errorSkeleton as any);
                } else if (typeof window !== 'undefined' && window.__excalidrawDebug) {
                  const excalidrawElements = window.__excalidrawDebug.convertSkeletonToExcalidraw(errorSkeleton);
                  window.__excalidrawDebug.setElements(excalidrawElements);
                }
              } catch (errRender) {
                console.warn('[B2F RPC] Error placeholder render failed (non-fatal):', errRender);
              }
            } finally {
              try { setIsDiagramGenerating?.(false); } catch {}
            }
          }
          // Close the outer `else` branch for when no precomputed elements are provided
        }
        } catch (error) {
          console.error('[B2F RPC] GENERATE_VISUALIZATION handler failed:', error);
        }
      } else if (
        // ADD_EXCALIDRAW_BLOCK: fall back to numeric if enum not present
        (ClientUIActionType as any).ADD_EXCALIDRAW_BLOCK ?
          request.actionType === (ClientUIActionType as any).ADD_EXCALIDRAW_BLOCK :
          (request.actionType as number) === 201
      ) {
        console.log('[B2F RPC] Handling ADD_EXCALIDRAW_BLOCK');
        try {
          const params = (request as any).parameters || {};
          const id = params.id || `exb_${Date.now()}`;
          const summary = params.summary || params.title || 'Diagram';
          let elements: any[] = [];
          const raw = params.elements;
          if (Array.isArray(raw)) {
            elements = raw as any[];
          } else if (typeof raw === 'string') {
            try { elements = JSON.parse(raw); } catch { elements = []; }
          }
          const block = { id, type: 'excalidraw', summary, elements } as any;
          useSessionStore.getState().addBlock(block);
          // Switch to whiteboard view so the user sees the block
          try { setActiveView('excalidraw' as SessionView); } catch {}
        } catch (e) {
          console.error('[B2F RPC] Failed to add excalidraw block:', e);
        }
      } else if (
        (ClientUIActionType as any).UPDATE_EXCALIDRAW_BLOCK ?
          request.actionType === (ClientUIActionType as any).UPDATE_EXCALIDRAW_BLOCK :
          (request.actionType as number) === 202
      ) {
        console.log('[B2F RPC] Handling UPDATE_EXCALIDRAW_BLOCK');
        try {
          const params = (request as any).parameters || {};
          const blockId = params.id || params.block_id || params.blockId;
          if (!blockId) throw new Error('Missing block id');
          let elements: any[] | undefined = undefined;
          const raw = params.elements;
          if (Array.isArray(raw)) {
            elements = raw as any[];
          } else if (typeof raw === 'string') {
            try { elements = JSON.parse(raw); } catch { elements = undefined; }
          }
          if (elements) {
            useSessionStore.getState().updateBlock(blockId, { elements } as any);
            // Ensure the user sees the updated block
            try { setActiveView('excalidraw' as SessionView); } catch {}
          }
        } catch (e) {
          console.error('[B2F RPC] Failed to update excalidraw block:', e);
        }
      } else if (
        (ClientUIActionType as any).FOCUS_ON_BLOCK ?
          request.actionType === (ClientUIActionType as any).FOCUS_ON_BLOCK :
          (request.actionType as number) === 203
      ) {
        console.log('[B2F RPC] Handling FOCUS_ON_BLOCK');
        try {
          const params = (request as any).parameters || {};
          const blockId = params.id || params.block_id || params.blockId;
          if (blockId && typeof document !== 'undefined') {
            const el = document.getElementById(String(blockId));
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
          try { setActiveView('excalidraw' as SessionView); } catch {}
        } catch (e) {
          console.error('[B2F RPC] Failed to focus on block:', e);
        }
      } else {
        if (LIVEKIT_DEBUG) console.log('[B2F RPC] Unknown action type:', request.actionType);
      }
      
      // We still need to return an acknowledgment
      const response = ClientUIActionResponse.create({ requestId: rpcData.requestId, success: true });
      return uint8ArrayToBase64(ClientUIActionResponse.encode(response).finish());
    };

    const onConnected = async () => {
        // LOG 6: The final goal - did the event fire?
        console.log('[DIAGNOSTIC] 6. The onConnected event handler has FIRED!');
        console.log('[FLOW] LiveKit Connected');
        setIsLoading(false);
        
        if (roomInstance.localParticipant) {
            try {
                console.log("!!!!!!!!!! ATTEMPTING TO REGISTER RPC HANDLER NOW !!!!!!!!!!");
                roomInstance.localParticipant.registerRpcMethod("rox.interaction.ClientSideUI/PerformUIAction", handlePerformUIAction);
                console.log('[useLiveKitSession] Registered RPC handler for rox.interaction.ClientSideUI/PerformUIAction');
            } catch (e) {
                if (e instanceof RpcError && (e as any).message?.includes("already registered")) {
                    console.warn("RPC method already registered. This is expected with React Strict Mode / HMR.");
                } else {
                    console.error("Failed to register client-side RPC handler:", e);
                }
            }
        }
        // Set up microphone but keep it disabled by default
        try {
            if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Setting up microphone...');
            
            if (roomInstance.localParticipant) {
                // Enable microphone to set up the track
                if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Enabling microphone to create track...');
                await roomInstance.localParticipant.setMicrophoneEnabled(true);
                
                // Wait a moment for the track to be properly created
                await new Promise(resolve => setTimeout(resolve, 100));
                
                // Now disable it so user can't be heard by default
                if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Disabling microphone - user should not be heard by default');
                await roomInstance.localParticipant.setMicrophoneEnabled(false);
                
                // Verify the actual state after disabling
                const micTrack = roomInstance.localParticipant.getTrackPublication(Track.Source.Microphone);
                const actualMicEnabled = micTrack ? !micTrack.isMuted : false;
                if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Microphone setup complete - LiveKit mic state:', {
                    hasTrack: !!micTrack,
                    isMuted: micTrack?.isMuted,
                    actualMicEnabled: actualMicEnabled
                });
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
        console.log('[FLOW] LiveKit Disconnected');
        setIsConnected(false);
        setIsLoading(false);
        agentServiceClientRef.current = null;
        connectStartedRef.current = false; // allow reconnect after disconnect
        
        // Clean up microphone track
        if (microphoneTrackRef.current) {
            microphoneTrackRef.current.stop();
            microphoneTrackRef.current = null;
        }
    };

    // The handler for the agent's "I'm ready" signal
    // Handler for audio tracks (agent voice output)
    const handleTrackSubscribed = (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
        if (LIVEKIT_DEBUG) console.log(`[useLiveKitSession] Track subscribed:`, {
            kind: track.kind,
            source: publication.source,
            participant: participant.identity
        });
        
        if (track.kind === Track.Kind.Audio) {
            if (LIVEKIT_DEBUG) console.log(`[useLiveKitSession] Audio track received from agent ${participant.identity}`);
            const audioTrack = track as AudioTrack;
            
            // Attach the audio track to play agent voice
            const audioElement = audioTrack.attach();
            audioElement.autoplay = true;
            audioElement.volume = 1.0;
            audioElement.muted = false;
            
            // Add to DOM temporarily to ensure playback
            document.body.appendChild(audioElement);
            
            // Try to proactively start audio playback (best-effort; may be blocked until user gesture)
            try { (roomInstance as any)?.startAudio?.(); } catch {}
            try {
                const p = audioElement.play();
                if (p && typeof p.catch === 'function') {
                    p.catch((e: any) => {
                        console.warn('[FLOW] Agent audio autoplay may be blocked. Interact with the page to enable sound.', e);
                    });
                }
            } catch (e) {
                console.warn('[FLOW] Agent audio autoplay call failed (non-fatal):', e);
            }
            
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
        if (LIVEKIT_DEBUG) console.log(`[useLiveKitSession] Track unsubscribed:`, {
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
        if (LIVEKIT_DEBUG) console.log(`[useLiveKitSession] Transcription received:`, transcriptions);
        
        // Forward transcript text to global emitter and maintain legacy message list
        transcriptions.forEach(segment => {
            const text = segment.text?.trim();
            if (text) {
                // Emit plain text for the avatar bubble UI
                try { transcriptEventEmitter.emitTranscript(text); } catch {}

                // Preserve speaker-tagged history for any consumers still using it
                const speaker = participant?.identity || 'Unknown';
                const message = `${speaker}: ${text}`;
                setTranscriptionMessages(prev => [...prev.slice(-19), message]); // Keep last 20 messages
            }
        });
    };

    const handleDataReceived = async (payload: Uint8Array, participant?: RemoteParticipant, kind?: any, topic?: string) => {
        if (!participant) return;
        try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            console.log('[DataReceived] Packet from', participant.identity, { kind, topic, data });

            // --- Handle initial tab created by backend ---
            if (data?.type === 'initial_tab_created' && data?.tab_id) {
                console.log('[Tabs] Received initial tab from backend:', data);
                try {
                    const tab = {
                        id: data.tab_id,
                        name: data.name || 'Home',
                        url: data.url || 'about:blank'
                    };
                    addTab(tab);
                    setActiveTabIdInStore(data.tab_id);
                    console.log('[Tabs] Registered initial tab in store:', tab);
                } catch (e) {
                    console.warn('[Tabs] Failed to register initial tab:', e);
                }
                return; // Stop further processing for this packet
            }

            // --- Handle AI debrief question relayed by the browser pod ---
            if (data?.type === 'ai_debrief_question' && typeof data?.text === 'string' && data.text.length > 0) {
                console.log('[FLOW] Received AI debrief question from pod:', data.text);
                try {
                    const { setDebriefMessage, setImprintingMode, setActiveView, setConceptualStarted, setIsAwaitingAIResponse } = useSessionStore.getState();
                    // Stop global loading when AI response arrives
                    try { setIsAwaitingAIResponse(false); } catch {}
                    setDebriefMessage({ text: data.text });
                    setImprintingMode('DEBRIEF_CONCEPTUAL');
                    setActiveView('excalidraw');
                    setConceptualStarted(true);
                    console.log('[FLOW] Store updated for debrief; UI will re-render.');
                } catch (e) {
                    console.warn('[FLOW] Failed to apply debrief update to store:', e);
                }
                return; // Stop further processing for this packet
            }
            if (data.type === 'agent_ready' && roomInstance.localParticipant) {
                console.log(`[FLOW] Agent ready signal received from ${participant.identity}`);
                setAgentIdentity(participant.identity); // Store the agent identity
                const adapter = new LiveKitRpcAdapter(roomInstance.localParticipant, participant.identity);
                agentServiceClientRef.current = new AgentInteractionClientImpl(adapter as any);
                
                // Send confirmation RPC to agent to complete handshake
                try {
                    console.log(`[FLOW] Sending confirmation RPC to agent...`);
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
                    console.log(`[FLOW] Agent confirmation response:`, confirmationResponse);
                    setIsConnected(true); // NOW we are fully connected and ready to interact
                    console.log('[FLOW] Frontend ready (agent connected)');
                    
                } catch (rpcError) {
                    console.error(`[FLOW] Failed to send confirmation RPC to agent:`, rpcError);
                    // Still set connected as the agent is ready, even if confirmation failed
                    setIsConnected(true);
                    console.log('[FLOW] Frontend ready (agent connected, handshake error ignored)');
                }
            }

            // Detect suggested responses sent via generic data channel messages
            try {
                const deepFind = (obj: any): { items?: any; title?: string } | undefined => {
                    if (!obj || typeof obj !== 'object') return undefined;
                    // direct
                    const meta = obj.metadata || obj.meta || obj;
                    if (meta && (meta.suggested_responses || meta.suggestedResponses)) {
                        return { items: meta.suggested_responses || meta.suggestedResponses, title: meta.title || meta.suggested_title };
                    }
                    // search children
                    for (const key of Object.keys(obj)) {
                        const child = obj[key];
                        if (child && typeof child === 'object') {
                            const found = deepFind(child);
                            if (found) return found;
                        } else if (typeof child === 'string') {
                            const trimmed = child.trim();
                            if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
                                try {
                                    const parsed = JSON.parse(trimmed);
                                    const found = deepFind(parsed);
                                    if (found) return found;
                                } catch {}
                            }
                        }
                    }
                    return undefined;
                };

                const found = deepFind(data);
                if (found && found.items) {
                    const candidate = found.items;
                    const title = found.title || 'Suggestions';
                    let suggestions: { id: string; text: string; reason?: string }[] = [];
                    if (Array.isArray(candidate)) {
                        if (candidate.length > 0 && typeof candidate[0] === 'string') {
                            suggestions = (candidate as string[]).map((t, idx) => ({ id: `s_${Date.now()}_${idx}`, text: t }));
                        } else {
                            suggestions = (candidate as any[]).map((s: any, idx: number) => ({ id: s.id || `s_${Date.now()}_${idx}`, text: s.text || String(s), reason: s.reason }));
                        }
                    } else if (typeof candidate === 'string') {
                        suggestions = [{ id: `s_${Date.now()}_0`, text: candidate }];
                    }
                    if (suggestions.length > 0) {
                        console.log(`[DataReceived] Setting ${suggestions.length} suggested responses from data channel${title ? ` with title: ${title}` : ''}`);
                        setSuggestedResponses(suggestions, title);
                    }
                } else {
                    console.debug('[DataReceived] No suggested responses found in packet');
                }
            } catch (srErr) {
                console.warn('[DataReceived] Failed to extract suggested responses from packet (non-fatal):', srErr);
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

    // RPC handler is registered inside onConnected to ensure localParticipant exists.

    return () => {
      roomInstance.off(RoomEvent.Connected, onConnected);
      roomInstance.off(RoomEvent.Disconnected, onDisconnected);
      roomInstance.off(RoomEvent.DataReceived, handleDataReceived);
      roomInstance.off(RoomEvent.TrackSubscribed, handleTrackSubscribed);
      roomInstance.off(RoomEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      roomInstance.off(RoomEvent.TranscriptionReceived, handleTranscriptionReceived);
    };
  }, [roomName, setIsMicEnabled, setAgentStatusText, setIsAgentSpeaking, setActiveView, setSuggestedResponses, userName]); // Add all dependencies


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
      // Generate a per-action trace id for distributed tracing
      const traceId = uuidv4();
      // Expose for devtools debugging
      try { (window as any).__lastTraceId = traceId; } catch {}
      const request = {
        taskName: taskName,
        // Inject trace_id into the payload so downstream services can correlate
        jsonPayload: JSON.stringify({ ...(payload as any), trace_id: traceId }),
      };
      // InvokeAgentTask returns an Observable<AgentResponse> (server-streaming).
      // Our transport currently yields a single response; await the first emission.
      await firstValueFrom(agentServiceClientRef.current.InvokeAgentTask(request));
    } catch (e) {
      console.error("Failed to start agent task:", e);
      setConnectionError(`Failed to start task: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

  // --- TAB MANAGEMENT FUNCTIONS --- (declared after sendBrowserInteraction below)

  // --- Kickstart: send an initial navigate over LiveKit DataChannel so the pod draws content ---
  useEffect(() => {
    if (!isConnected) return;
    if (initialNavSentRef.current) return;
    initialNavSentRef.current = true;
    try {
      const startUrl = process.env.NEXT_PUBLIC_BROWSER_START_URL || 'https://example.com';
      const payload = JSON.stringify({ action: 'navigate', url: startUrl });
      const bytes = new TextEncoder().encode(payload);
      try {
        roomInstance?.localParticipant?.publishData(bytes);
        if (SESSION_FLOW_DEBUG) console.log('[FLOW] Sent initial navigate to', startUrl);
      } catch (e) {
        console.warn('[FLOW] Failed to publish initial navigate:', e);
      }
    } catch {}
  }, [isConnected]);

  // --- Send restored_feed_summary to the agent once after connect ---
  const sentSummaryRef = useRef(false);
  useEffect(() => {
    if (!isConnected || sentSummaryRef.current) return;
    try {
      const blocks = (useSessionStore.getState().whiteboardBlocks || []).map((b: any) => {
        if (b?.type === 'excalidraw') {
          return { id: b.id, type: b.type, summary: b.summary || '', elements_count: Array.isArray(b.elements) ? b.elements.length : 0 };
        } else if (b?.type === 'rrweb') {
          return { id: b.id, type: b.type, summary: b.summary || '', eventsUrl: (b as any).eventsUrl || null };
        }
        return { id: b?.id, type: b?.type };
      });
      const payload = { restored_feed_summary: { blocks } };
      // Fire-and-forget: if this fails, normal flow continues
      void startTask('start_tutoring_session', payload);
      sentSummaryRef.current = true;
      console.log('[F2B RPC] Sent start_tutoring_session with restored_feed_summary');
    } catch (e) {
      console.warn('[F2B RPC] Failed to send restored_feed_summary (non-fatal):', e);
    }
  }, [isConnected, startTask]);

  // --- Deletion helper shared by multiple event hooks ---
  useEffect(() => {
    const sendDelete = async () => {
      try {
        let sessId = sessionIdRef.current;
        if (!sessId) {
          // Try to resolve sessionId synchronously from status URL if set
          const statusUrl = sessionStatusUrlRef.current;
          if (statusUrl) {
            try {
              const ctrl = new AbortController();
              const t = setTimeout(() => ctrl.abort(), 1500);
              const stResp = await fetch(statusUrl, { signal: ctrl.signal, cache: 'no-store' });
              clearTimeout(t);
              if (stResp.ok) {
                const st = await stResp.json();
                const id = st?.sessionId as string | undefined;
                if (id && id.startsWith('sess-')) {
                  sessId = id;
                  sessionIdRef.current = id;
                  if (SESSION_FLOW_DEBUG) console.log('[FLOW] Resolved sessionId during unload:', id);
                }
              }
            } catch {}
          }
          // Poll for sessionId for 2 seconds
          if (!sessId) {
            for (let i = 0; i < 10; i++) {
              await new Promise(resolve => setTimeout(resolve, 200));
              sessId = sessionIdRef.current;
              if (sessId) break;
            }
          }
        }
        if (!sessId) return;
        // Use Next.js API proxy so we don't depend on external origin/CORS
        const url = `/api/sessions/${sessId}?_method=DELETE`;
        // Prefer keepalive fetch on unload
        try {
          await fetch(url, {
            method: 'DELETE',
            keepalive: true,
            mode: 'cors',
          });
        } catch {
          // fallback to sendBeacon
          try {
            if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
              const blob = new Blob([], { type: 'text/plain' });
              (navigator as any).sendBeacon(url, blob);
            }
          } catch {}
        }
        if (SESSION_FLOW_DEBUG) console.log('[FLOW] Sent session delete beacon for', sessId);
      } catch (e) {
        console.warn('[FLOW] Session delete beacon failed (non-fatal):', e);
      }
    };
    // Expose for other effects
    sendDeleteNowRef.current = () => sendDelete();
    // Register only real unload events to avoid premature deletion
    if (DELETE_ON_UNLOAD) {
      const onUnload = () => { try { isUnloadingRef.current = true; void sendDelete(); } catch {} };
      window.addEventListener('beforeunload', onUnload);
      return () => {
        window.removeEventListener('beforeunload', onUnload);
        // Do NOT send delete on React unmount/HMR
        if (isUnloadingRef.current) {
          // In the narrow case cleanup runs during a real unload, deletion was already fired above
        }
      };
    } else {
      if (SESSION_FLOW_DEBUG) console.log('[FLOW] Auto-delete on unload is disabled via NEXT_PUBLIC_SESSION_DELETE_ON_UNLOAD');
      return () => {};
    }
  }, []);

  // --- Do NOT auto-delete on transient LiveKit disconnects ---
  useEffect(() => {
    // Keep this effect to ensure listeners are cleaned if added in future
    return () => {};
  }, []);

  // Convenience method for Suggested Responses selection
  const selectSuggestedResponse = useCallback(async (suggestion: { id: string; text: string; reason?: string }) => {
    try {
      await startTask('select_suggested_response', {
        id: suggestion.id,
        text: suggestion.text,
        reason: suggestion.reason ?? null,
      });
    } finally {
      try { clearSuggestedResponses(); } catch {}
    }
  }, [startTask, clearSuggestedResponses]);

  // Expose an imperative deletion helper so pages can terminate the pod when leaving route
  const deleteSessionNow = useCallback(async () => {
    try {
      const fn = sendDeleteNowRef.current;
      if (typeof fn === 'function') {
        await fn();
      }
    } catch (e) {
      if (SESSION_FLOW_DEBUG) console.warn('[FLOW] deleteSessionNow error (non-fatal):', e);
    }
  }, []);

  // Publish arbitrary interaction payloads over LiveKit Data Channel to the browser bot
  const sendBrowserInteraction = useCallback(async (payload: object) => {
    try {
      if (roomInstance.state !== ConnectionState.Connected) {
        console.warn('[Interaction] Cannot send, room not connected');
        return;
      }
      // Attach a trace id for correlation with backend actions
      const traceId = (payload as any)?.trace_id || uuidv4();
      const json = JSON.stringify({ ...(payload as any), trace_id: traceId });
      const bytes = new TextEncoder().encode(json);
      await roomInstance.localParticipant.publishData(bytes);
    } catch (e) {
      console.error('[Interaction] Failed to publish data:', e);
    }
  }, []);

  // --- NEW TAB MANAGEMENT FUNCTIONS ---
  const openNewTab = useCallback(async (name: string, url: string) => {
    try {
      const tabId = uuidv4();
      await sendBrowserInteraction({ action: 'open_tab', tab_id: tabId, url });
      addTab({ id: tabId, name, url });
      setActiveTabIdInStore(tabId);
    } catch (e) {
      console.error('[Tabs] openNewTab failed:', e);
    }
  }, [sendBrowserInteraction, addTab, setActiveTabIdInStore]);

  const switchTab = useCallback(async (tabId: string) => {
    try {
      const currentActive = useSessionStore.getState().activeTabId;
      if (currentActive === tabId) return;
      await sendBrowserInteraction({ action: 'switch_tab', tab_id: tabId });
      setActiveTabIdInStore(tabId);
    } catch (e) {
      console.error('[Tabs] switchTab failed:', e);
    }
  }, [sendBrowserInteraction, setActiveTabIdInStore]);

  const closeTab = useCallback(async (tabIdToClose: string) => {
    try {
      // Prevent closing the last remaining tab
      const tabsState = useSessionStore.getState().tabs;
      if (tabsState.length <= 1) {
        console.warn('Cannot close the last tab.');
        return;
      }

      // Snapshot before removing to decide fallback active tab
      const currentTabs = tabsState;
      const currentActiveTabId = useSessionStore.getState().activeTabId;

      // 1) Tell backend to close the actual browser page
      await sendBrowserInteraction({ action: 'close_tab', tab_id: tabIdToClose });

      // 2) Update frontend state
      removeTab(tabIdToClose);

      // 3) If we closed the active tab, pick another tab and switch to it
      if (currentActiveTabId === tabIdToClose) {
        const newActiveTab = currentTabs.find(t => t.id !== tabIdToClose);
        if (newActiveTab) {
          await switchTab(newActiveTab.id);
        }
      }
    } catch (e) {
      console.error('[Tabs] closeTab failed:', e);
    }
  }, [sendBrowserInteraction, removeTab, switchTab]);

  return { 
    isConnected, 
    isLoading, 
    connectionError, 
    startTask, 
    room: roomInstance, 
    agentIdentity,
    transcriptionMessages,
    statusMessages,
    selectSuggestedResponse,
    livekitUrl,
    livekitToken,
    deleteSessionNow,
    sendBrowserInteraction,
    sessionStatusUrl: sessionStatusUrlState,
    sessionManagerSessionId: sessionManagerSessionIdState,
    // tabs
    openNewTab,
    switchTab,
    closeTab,
  };
}
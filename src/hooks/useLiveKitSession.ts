'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { Observable, firstValueFrom } from 'rxjs';
import { Room, RoomEvent, LocalParticipant, RpcInvocationData, ConnectionState, RemoteParticipant, RpcError, Track, TrackPublication, AudioTrack, createLocalAudioTrack, Participant, TranscriptionSegment } from 'livekit-client';
import { AgentInteractionClientImpl, AgentToClientUIActionRequest, ClientUIActionResponse, ClientUIActionType } from '@/generated/protos/interaction';
import { useSessionStore, SessionView } from '@/lib/store';
import { useAuth } from '@clerk/nextjs';
import { useBrowserActionExecutor } from './useBrowserActionExecutor';
import { transcriptEventEmitter } from '@/lib/TranscriptEventEmitter';

const LIVEKIT_DEBUG = false;

// --- START of MODIFICATION ---
// Extend the global Window interface to let TypeScript know about our custom functions.
// This prevents type errors when calling our globally exposed Excalidraw actions.
declare global {
  interface Window {
    __mermaidDebug?: {
      setDiagram: (diagram: string) => void;
    };
    __excalidrawActions?: {
        getSceneElements: () => any[];
        highlightElements: (elementIds: string[]) => void;
        removeHighlighting: () => void;
        focusOnElements: (elementIds: string[]) => void;
    };
  }
}
// --- END of MODIFICATION ---


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

  clientStreamingRequest(): Promise<Uint8Array> {
    return Promise.reject(new Error('clientStreamingRequest is not supported by LiveKitRpcAdapter'));
  }

  bidirectionalStreamingRequest(): Observable<Uint8Array> {
    return new Observable<Uint8Array>((subscriber) => {
      subscriber.error(new Error('bidirectionalStreamingRequest is not supported by LiveKitRpcAdapter'));
    });
  }
}

const roomInstance = new Room({
    adaptiveStream: true,
    dynacast: true,
});

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
}

export function useLiveKitSession(roomName: string, userName: string, courseId?: string): UseLiveKitSessionReturn {
  const { getToken, isSignedIn } = useAuth();
  const vncUrlPrimary = process.env.NEXT_PUBLIC_VNC_URL;
  const vncUrlFallback = process.env.NEXT_PUBLIC_VNC_WEBSOCKET_URL || 'ws://localhost:8765';
  const vncUrl = vncUrlPrimary || vncUrlFallback;
  if (!vncUrlPrimary) {
    console.warn('[useLiveKitSession] NEXT_PUBLIC_VNC_URL not set; using fallback:', vncUrl);
  }
  const visualizerBaseUrl = process.env.NEXT_PUBLIC_VISUALIZER_URL;
  const { executeBrowserAction, disconnectVNC } = useBrowserActionExecutor(roomInstance, vncUrl);

  const setActiveView = useSessionStore((s) => s.setActiveView);
  const setAgentStatusText = useSessionStore((s) => s.setAgentStatusText);
  const setIsAgentSpeaking = useSessionStore((s) => s.setIsAgentSpeaking);
  const setIsMicEnabled = useSessionStore((s) => s.setIsMicEnabled);
  const setSuggestedResponses = useSessionStore((s) => s.setSuggestedResponses);
  const clearSuggestedResponses = useSessionStore((s) => s.clearSuggestedResponses);

  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [agentIdentity, setAgentIdentity] = useState<string | null>(null);

  const [transcriptionMessages, setTranscriptionMessages] = useState<string[]>([]);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);

  const agentServiceClientRef = useRef<AgentInteractionClientImpl | null>(null);
  const microphoneTrackRef = useRef<AudioTrack | null>(null);

  useEffect(() => {
    let mounted = true;
    const connectToRoom = async () => {
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

        if (LIVEKIT_DEBUG) console.log('Starting LiveKit connection process');
        setIsLoading(true);
        setConnectionError(null);
        try {
            if (!isSignedIn) {
                throw new Error('User not authenticated. Please login first.');
            }

            const clerkToken = await getToken();
            if (!clerkToken) {
                throw new Error('Failed to get authentication token from Clerk.');
            }

            const tokenServiceUrl = process.env.NEXT_PUBLIC_WEBRTC_TOKEN_URL;
            if (!tokenServiceUrl) {
                throw new Error('Missing NEXT_PUBLIC_WEBRTC_TOKEN_URL');
            }

            console.log(`Fetching LiveKit token from ${tokenServiceUrl}...`);
            const response = await fetch(`${tokenServiceUrl}/api/generate-room`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${clerkToken}`,
                },
                body: JSON.stringify({
                    curriculum_id: courseId,
                }),
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

            console.log(`[useLiveKitSession] Using backend-generated room: ${actualRoomName}`);

            if (!token || !wsUrl) {
                throw new Error('Invalid token response from backend');
            }

            await roomInstance.connect(wsUrl, token);
            if(mounted) {
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
  }, [roomName, userName, courseId, getToken, isSignedIn]);

  useEffect(() => {
    if (!roomInstance) return;

    const handlePerformUIAction = async (rpcData: RpcInvocationData): Promise<string> => {
      const request = AgentToClientUIActionRequest.decode(base64ToUint8Array(rpcData.payload as string));
      console.log(`[B2F RPC] Received action: ${ClientUIActionType[request.actionType]}`);
      
      if (request.actionType === ClientUIActionType.EXCALIDRAW_HIGHLIGHT_ELEMENTS) {
          console.log('[B2F RPC] Handling EXCALIDRAW_HIGHLIGHT_ELEMENTS');
          const params = request.parameters || {};
          const idsString = params.element_ids || '[]';
          try {
              const elementIds = JSON.parse(idsString);
              if (Array.isArray(elementIds) && elementIds.length > 0) {
                  if (window.__excalidrawActions?.highlightElements) {
                      window.__excalidrawActions.highlightElements(elementIds);
                      console.log(`[B2F RPC] Highlighted elements: ${elementIds.join(', ')}`);
                  } else {
                      console.warn('[B2F RPC] __excalidrawActions.highlightElements not available.');
                  }
              }
          } catch(e) {
              console.error('[B2F RPC] Failed to parse element_ids for highlighting:', idsString, e);
          }
      } else if (request.actionType === ClientUIActionType.EXCALIDRAW_FOCUS_ON_ELEMENTS) {
          console.log('[B2F RPC] Handling EXCALIDRAW_FOCUS_ON_ELEMENTS');
          const params = request.parameters || {};
          const idsString = params.element_ids || '[]';
          try {
              const elementIds = JSON.parse(idsString);
              if (Array.isArray(elementIds) && elementIds.length > 0) {
                  if (window.__excalidrawActions?.focusOnElements) {
                      window.__excalidrawActions.focusOnElements(elementIds);
                      console.log(`[B2F RPC] Focusing on elements: ${elementIds.join(', ')}`);
                  } else {
                      console.warn('[B2F RPC] __excalidrawActions.focusOnElements not available.');
                  }
              }
          } catch(e) {
              console.error('[B2F RPC] Failed to parse element_ids for focusing:', idsString, e);
          }
      } else if (request.actionType === ClientUIActionType.EXCALIDRAW_CLEAR_CANVAS) {
          console.log('[B2F RPC] Handling EXCALIDRAW_CLEAR_CANVAS');
          if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
            try {
              (window as any).__excalidrawDebug.clearCanvas();
              console.log('[B2F RPC] Canvas cleared successfully');
            } catch (error) {
              console.error('[B2F RPC] Failed to clear canvas:', error);
            }
          } else {
            console.warn('[B2F RPC] Excalidraw debug functions not available for canvas clear');
          }
      } else if (request.actionType === ClientUIActionType.BROWSER_NAVIGATE) {
        const url = request.parameters?.url;
        if (url) {
          executeBrowserAction({
            tool_name: 'browser_navigate',
            parameters: { url },
          });
        }
      } else if (request.actionType === ClientUIActionType.START_LISTENING_VISUAL) {
        setIsMicEnabled(true);
        if (roomInstance.localParticipant) {
          await roomInstance.localParticipant.setMicrophoneEnabled(true);
          const statusMsg = 'Microphone enabled - user can now speak';
          console.log(`[useLiveKitSession] ${statusMsg}`);
          setStatusMessages(prev => [...prev.slice(-9), statusMsg]);
          
          if (window.__excalidrawActions?.removeHighlighting) {
            window.__excalidrawActions.removeHighlighting();
            console.log('[useLiveKitSession] Cleared highlights on user input');
          }
        }
      } else if (request.actionType === ClientUIActionType.STOP_LISTENING_VISUAL) {
        setIsMicEnabled(false);
        if (roomInstance.localParticipant) {
          await roomInstance.localParticipant.setMicrophoneEnabled(false);
          const statusMsg = 'Microphone disabled - user cannot be heard';
          console.log(`[useLiveKitSession] ${statusMsg}`);
          setStatusMessages(prev => [...prev.slice(-9), statusMsg]);
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

        const params = (request as unknown as Record<string, unknown>).parameters;
        console.log('[SET_UI_STATE] Extracted params:', params);

        if (params && typeof params === 'object') {
          if ('statusText' in params || 'status_text' in params) {
            const statusText = ((params as any).statusText || (params as any).status_text) as string;
            console.log('[SET_UI_STATE] Setting status text:', statusText);
            setAgentStatusText(statusText);
          }

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
      } else if ((request.actionType as number) === 64) {
        console.log('[B2F RPC] Handling EXCALIDRAW_CLEAR_CANVAS');
        if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
          try {
            (window as any).__excalidrawDebug.clearCanvas();
            console.log('[B2F RPC] Canvas cleared successfully');
          } catch (error) {
            console.error('[B2F RPC] Failed to clear canvas:', error);
          }
        } else {
          console.warn('[B2F RPC] Excalidraw debug functions not available for canvas clear');
        }
      } else if ((request.actionType as number) === 49) {
        console.log('[B2F RPC] Handling GENERATE_VISUALIZATION');
        try {
          const params = request.parameters || {} as any;
          const elements = params.elements ? JSON.parse(params.elements) : null;
          if (elements && Array.isArray(elements)) {
            console.log(`[B2F RPC] Parsed ${elements.length} elements from RPC`);
            const { setVisualizationData } = useSessionStore.getState();
            if (setVisualizationData) {
              console.log('[B2F RPC] Setting visualization data in store...');
              setVisualizationData(elements);
            } else {
              console.warn('[B2F RPC] Store setVisualizationData not available, using direct method');
              if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
                const excalidrawElements = (window as any).__excalidrawDebug.convertSkeletonToExcalidraw(elements);
                (window as any).__excalidrawDebug.setElements(excalidrawElements);
                console.log('[B2F RPC] Direct visualization rendering completed');
              }
            }
          } else {
          const prompt = params.prompt as string | undefined;
          const topicContext = (params.topic_context as string | undefined) || '';
          if (!prompt) {
            console.error('[B2F RPC] GENERATE_VISUALIZATION missing both elements and prompt');
          } else {
            console.log('[B2F RPC] Optimistic UI: showing placeholder and calling Visualizer...');
            const placeholderSkeleton = [
              {
                id: 'generating_placeholder',
                type: 'text',
                text: 'Generating diagram...',
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
              } else if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
                const excalidrawElements = (window as any).__excalidrawDebug.convertSkeletonToExcalidraw(placeholderSkeleton);
                (window as any).__excalidrawDebug.setElements(excalidrawElements);
              }
            } catch (phErr) {
              console.warn('[B2F RPC] Placeholder render failed (non-fatal):', phErr);
            }

            console.log('[B2F RPC] Attempting streaming Visualizer service...');
            try {
              if (!visualizerBaseUrl) {
                throw new Error('NEXT_PUBLIC_VISUALIZER_URL is not set');
              }
              const streamingResp = await fetch(`${visualizerBaseUrl}/generate-diagram-stream`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ topic_context: topicContext, text_to_visualize: prompt })
              });

              if (streamingResp.ok && streamingResp.body) {
                const reader = streamingResp.body.getReader();
                const decoder = new TextDecoder('utf-8');
                let buffered = '';
                let gotAny = false;
                const byId = new Map<string, any>();
                const byKey = new Map<string, any>();
                let ordered: any[] = [];
                let localSkeleton: any[] = [];
                try {
                  const { setVisualizationData } = useSessionStore.getState();
                  if (setVisualizationData) {
                    setVisualizationData([] as any);
                  } else if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
                    (window as any).__excalidrawDebug.setElements([]);
                  }
                } catch {}

                while (true) {
                  const { value, done } = await reader.read();
                  if (done) break;
                  buffered += decoder.decode(value, { stream: true });
                  gotAny = true;

                  try {
                    if (typeof window !== 'undefined' && window.__mermaidDebug) {
                      window.__mermaidDebug.setDiagram(buffered.trim());
                    }
                  } catch (mermaidErr) {
                    console.warn('[B2F RPC] Mermaid update failed:', mermaidErr);
                  }
                }
                if (!gotAny) {
                  console.warn('[B2F RPC] Streaming returned no elements, falling back to batch endpoint');
                  throw new Error('No streaming elements');
                }
                if (LIVEKIT_DEBUG) console.log('[B2F RPC] Streaming visualization completed');
              } else {
                throw new Error(`Streaming not available: status ${streamingResp.status}`);
              }
            } catch (streamErr) {
              console.warn('[B2F RPC] Streaming failed, falling back to non-streaming:', streamErr);
              try {
                if (!visualizerBaseUrl) {
                  throw new Error('NEXT_PUBLIC_VISUALIZER_URL is not set');
                }
                const resp = await fetch(`${visualizerBaseUrl}/generate-diagram`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ topic_context: topicContext, text_to_visualize: prompt })
                });
                if (!resp.ok) {
                  throw new Error(`Visualizer service returned ${resp.status}`);
                }
                const diagramData = await resp.json();
                const returned = Array.isArray(diagramData?.elements) ? diagramData.elements : [];
                if (returned.length === 0) {
                  console.warn('[B2F RPC] Visualizer returned no elements');
                }
                const { setVisualizationData } = useSessionStore.getState();
                if (setVisualizationData) {
                  setVisualizationData(returned);
                } else if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
                  const excalidrawElements = (window as any).__excalidrawDebug.convertSkeletonToExcalidraw(returned);
                  (window as any).__excalidrawDebug.setElements(excalidrawElements);
                }
                if (LIVEKIT_DEBUG) console.log('[B2F RPC] Visualization generated via Visualizer service');
              } catch (svcErr) {
                console.error('[B2F RPC] Failed to call Visualizer service:', svcErr);
                try {
                  const errorSkeleton = [
                    {
                      id: 'generating_error',
                      type: 'text',
                      text: 'Could not generate diagram.'
                    }
                  ];
                  const { setVisualizationData } = useSessionStore.getState();
                  if (setVisualizationData) {
                    setVisualizationData(errorSkeleton as any);
                  } else if (typeof window !== 'undefined' && (window as any).__excalidrawDebug) {
                    const excalidrawElements = (window as any).__excalidrawDebug.convertSkeletonToExcalidraw(errorSkeleton);
                    (window as any).__excalidrawDebug.setElements(excalidrawElements);
                  }
                } catch (errRender) {
                  console.warn('[B2F RPC] Error placeholder render failed (non-fatal):', errRender);
                }
              }
            }
          }
        }
        } catch (error) {
          console.error('[B2F RPC] GENERATE_VISUALIZATION handler failed:', error);
        }
      } else {
        if (LIVEKIT_DEBUG) console.log('[B2F RPC] Unknown action type:', request.actionType);
      }

      const response = ClientUIActionResponse.create({ requestId: rpcData.requestId, success: true });
      return uint8ArrayToBase64(ClientUIActionResponse.encode(response).finish());
    };

    const onConnected = async () => {
        setIsLoading(false);
        try {
            if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Setting up microphone...');

            if (roomInstance.localParticipant) {
                if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Enabling microphone to create track...');
                await roomInstance.localParticipant.setMicrophoneEnabled(true);

                await new Promise(resolve => setTimeout(resolve, 100));

                if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Disabling microphone - user should not be heard by default');
                await roomInstance.localParticipant.setMicrophoneEnabled(false);

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
    };

    const onDisconnected = () => {
        setIsConnected(false);
        setIsLoading(false);
        agentServiceClientRef.current = null;
        disconnectVNC();

        if (microphoneTrackRef.current) {
            microphoneTrackRef.current.stop();
            microphoneTrackRef.current = null;
        }

        try { transcriptEventEmitter.emitTranscript(''); } catch {}
    };

    const handleTrackSubscribed = (track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
        if (LIVEKIT_DEBUG) console.log(`[useLiveKitSession] Track subscribed:`, {
            kind: track.kind,
            source: publication.source,
            participant: participant.identity
        });

        if (track.kind === Track.Kind.Audio) {
            if (LIVEKIT_DEBUG) console.log(`[useLiveKitSession] Audio track received from agent ${participant.identity}`);
            const audioTrack = track as AudioTrack;

            const audioElement = audioTrack.attach();
            audioElement.autoplay = true;
            audioElement.volume = 1.0;

            document.body.appendChild(audioElement);

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

    const handleTranscriptionReceived = (transcriptions: TranscriptionSegment[], participant?: Participant, publication?: TrackPublication) => {
        if (LIVEKIT_DEBUG) console.log(`[useLiveKitSession] Transcription received:`, transcriptions);

        transcriptions.forEach(segment => {
            const text = segment.text?.trim();
            if (text) {
                try { transcriptEventEmitter.emitTranscript(text); } catch {}

                const speaker = participant?.identity || 'Unknown';
                const message = `${speaker}: ${text}`;
                setTranscriptionMessages(prev => [...prev.slice(-19), message]);
            }
        });
    };

    const handleDataReceived = async (payload: Uint8Array, participant?: RemoteParticipant, kind?: any, topic?: string) => {
        if (!participant) return;
        try {
            const data = JSON.parse(new TextDecoder().decode(payload));
            console.log('[DataReceived] Packet from', participant.identity, { kind, topic, data });
            if (data.type === 'agent_ready' && roomInstance.localParticipant) {
                console.log(`[useLiveKitSession] Agent ready signal received from ${participant.identity}`);
                setAgentIdentity(participant.identity);
                const adapter = new LiveKitRpcAdapter(roomInstance.localParticipant, participant.identity);
                agentServiceClientRef.current = new AgentInteractionClientImpl(adapter as any);

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
                    setIsConnected(true);

                } catch (rpcError) {
                    console.error(`[useLiveKitSession] Failed to send confirmation RPC to agent:`, rpcError);
                    setIsConnected(true);
                }
            }

            try {
                const deepFind = (obj: any): { items?: any; title?: string } | undefined => {
                    if (!obj || typeof obj !== 'object') return undefined;
                    const meta = obj.metadata || obj.meta || obj;
                    if (meta && (meta.suggested_responses || meta.suggestedResponses)) {
                        return { items: meta.suggested_responses || meta.suggestedResponses, title: meta.title || meta.suggested_title };
                    }
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

    if (roomInstance.localParticipant) {
      try {
        roomInstance.localParticipant.registerRpcMethod("rox.interaction.ClientSideUI/PerformUIAction", handlePerformUIAction);
        console.log('[useLiveKitSession] Registered RPC handler for rox.interaction.ClientSideUI/PerformUIAction');
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
  }, [roomName, setIsMicEnabled, setAgentStatusText, setIsAgentSpeaking, setActiveView, setSuggestedResponses, userName, disconnectVNC, executeBrowserAction]);

  const startTask = useCallback(async (taskName: string, payload: object) => {
    // --- START of MODIFICATION ---
    // Added a check to remove highlights before proceeding with the new task.
    // This ensures the UI is clean for the AI's next action.
    if (window.__excalidrawActions?.removeHighlighting) {
      window.__excalidrawActions.removeHighlighting();
      console.log('[LiveKitSession] Cleared highlights before starting new task.');
    }
    // --- END of MODIFICATION ---

    if (!agentServiceClientRef.current) {
      setConnectionError("Cannot start task: Agent is not ready.");
      console.error("Agent is not ready, cannot start task.");
      return;
    }
    try {
      let finalPayload: Record<string, any> = { ...payload };
      if (window.__excalidrawActions?.getSceneElements) {
        try {
            const whiteboardState = window.__excalidrawActions.getSceneElements();
            if (Array.isArray(whiteboardState) && whiteboardState.length > 0) {
                finalPayload.whiteboard_state = whiteboardState;
                console.log(`[F2B RPC] Attaching ${whiteboardState.length} whiteboard elements to task payload.`);
            }
        } catch (e) {
            console.error("Failed to get whiteboard state:", e);
        }
      }

      console.log(`[F2B RPC] Starting task: ${taskName}`);
      const request = {
        taskName: taskName,
        jsonPayload: JSON.stringify(finalPayload),
      };
      
      await firstValueFrom(agentServiceClientRef.current.InvokeAgentTask(request));
    } catch (e) {
      console.error("Failed to start agent task:", e);
      setConnectionError(`Failed to start task: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, []);

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
  };
}
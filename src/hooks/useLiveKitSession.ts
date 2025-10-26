//hooks the main one
'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Observable } from 'rxjs';
import { Room, RoomEvent, LocalParticipant, ConnectionState, RemoteParticipant, RpcError, Track, TrackPublication, AudioTrack, createLocalAudioTrack, Participant, TranscriptionSegment, VideoPresets } from 'livekit-client';
import { roomInstance } from '@/lib/livekit-room';
// Deprecated RPC UI path removed; DataChannel handles UI actions
import { useSessionStore, SessionView } from '@/lib/store';
import { useAuth } from '@clerk/nextjs';
import { useBrowserActionExecutor } from './useBrowserActionExecutor';
import { handleUiAction } from './uiActionHandler';
import { usePTT } from './usePTT';
import { useSessionCleanup } from './useSessionCleanup';
import { useLiveKitEvents } from './useLiveKitEvents';
import { useLiveKitConnection } from './useLiveKitConnection';

// File: exsense/src/hooks/useLiveKitSession.ts

const LIVEKIT_DEBUG = false;
const SESSION_FLOW_DEBUG = true;
const DELETE_ON_UNLOAD = (process.env.NEXT_PUBLIC_SESSION_DELETE_ON_UNLOAD || 'true').toLowerCase() === 'true';
const AGENT_RPC_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_AGENT_RPC_TIMEOUT_MS || '30000') || 30000;

// THIS IS THE NEW SINGLETON GUARD. It will survive all re-mounts.
let hasConnectStarted = false;

// Type declaration for Mermaid debug interface
declare global {
  interface Window {
    __mermaidDebug: {
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
    const doOnce = async () => {
      return await this.localParticipant.performRpc({
        destinationIdentity: this.agentIdentity,
        method: fullMethodName,
        payload: payloadString,
        responseTimeout: AGENT_RPC_TIMEOUT_MS,
      });
    };
    let attempts = 0;
    const maxAttempts = 2;
    while (true) {
      try {
        if (LIVEKIT_DEBUG) console.log(`F2B RPC Request: To=${this.agentIdentity}, Method=${fullMethodName}, attempt=${attempts+1}`);
        const responseString = await doOnce();
        return base64ToUint8Array(responseString);
      } catch (error: any) {
        const msg = String(error?.message || '').toLowerCase();
        attempts += 1;
        if (attempts < maxAttempts && (msg.includes('timeout') || msg.includes('connection'))) {
          await new Promise(r => setTimeout(r, 500));
          continue;
        }
        console.error(`F2B RPC request to ${fullMethodName} failed:`, error);
        throw error;
      }
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
  // --- Push To Talk helpers ---
  startPushToTalk: () => Promise<void>;
  stopPushToTalk: () => Promise<void>;
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
  const setVisualizationData = useSessionStore((s) => s.setVisualizationData);
  const setIsDiagramGenerating = useSessionStore((s) => s.setIsDiagramGenerating);
  const isPushToTalkActive = useSessionStore((s) => s.isPushToTalkActive);
  const setIsPushToTalkActive = useSessionStore((s) => s.setIsPushToTalkActive);
  const setIsAwaitingAIResponse = useSessionStore((s) => s.setIsAwaitingAIResponse);
  const setShowWaitingPill = useSessionStore((s) => s.setShowWaitingPill);
  // Browser tab actions from store
  const addTab = useSessionStore((s) => s.addTab);
  const removeTab = useSessionStore((s) => s.removeTab);
  const setActiveTabIdInStore = useSessionStore((s) => s.setActiveTabId);
  // Demo mode actions
  const setUserRole = useSessionStore((s) => s.setUserRole);
  const setCurrentRoomName = useSessionStore((s) => s.setCurrentRoomName);

  // --- HOOK'S INTERNAL STATE ---
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [agentIdentity, setAgentIdentity] = useState<string | null>(null);
  const [agentRpcReady, setAgentRpcReady] = useState<boolean>(false);
  const [livekitUrl, setLivekitUrl] = useState<string>('');
  const [livekitToken, setLivekitToken] = useState<string>('');
  const [sessionStatusUrlState, setSessionStatusUrlState] = useState<string | null>(null);
  const [sessionManagerSessionIdState, setSessionManagerSessionIdState] = useState<string | null>(null);
  // Prevent duplicate connect/token fetch during Strict Mode/HMR (moved to module scope: hasConnectStarted)
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
  
  const agentServiceClientRef = useRef<any | null>(null); // deprecated RPC client (unused; DataChannel is used now)
  const pendingTasksRef = useRef<{ name: string; payload: any }[]>([]);
  const microphoneTrackRef = useRef<AudioTrack | null>(null);
  const isPushToTalkActiveRef = useRef<boolean>(false);
  const pttBufferRef = useRef<string[]>([]);
  const agentAudioElsRef = useRef<HTMLAudioElement[]>([]);
  const thinkingTimeoutRef = useRef<number | null>(null);
  const thinkingTimeoutMsRef = useRef<number>(Number(process.env.NEXT_PUBLIC_AI_THINKING_TIMEOUT_MS) || 8000);
  // Track whether we've registered the RPC handler to avoid duplicate registrations under StrictMode/HMR
  // RPC handler is deprecated; UI actions come over DataChannel now

  useEffect(() => {
    isPushToTalkActiveRef.current = isPushToTalkActive;
  }, [isPushToTalkActive]);

  // LOG 1: Is the hook even running?
  console.log('[DIAGNOSTIC] 1. useLiveKitSession hook has started.');

  // --- TOKEN FETCHING & CONNECTION LOGIC (moved to hook) ---
  const { connectToRoom, resetConnectGuard } = useLiveKitConnection({
    room: roomInstance,
    isSignedIn: !!isSignedIn,
    getToken,
    roomName,
    userName,
    courseId,
    options,
    setIsLoading,
    setConnectionError,
    setLivekitUrl,
    setLivekitToken,
    setUserRole,
    setCurrentRoomName,
    setSessionManagerSessionIdState,
    setSessionStatusUrlState,
    sessionIdRef,
    sessionStatusUrlRef,
  });

  useEffect(() => {
    connectToRoom();
  }, [connectToRoom]);


  // --- EVENT & DATA CHANNEL HANDLERS ---

    const onConnected = useCallback(async () => {
        // LOG 6: The final goal - did the event fire?
        console.log('[DIAGNOSTIC] 6. The onConnected event handler has FIRED!');
        console.log('[FLOW] LiveKit Connected');
        setIsLoading(false);
        
        // RPC registration removed; UI actions handled via DataChannel
        // Set up microphone but keep it disabled by default
        // ⭐ CRITICAL: Skip microphone setup for viewers - they cannot publish
        const currentUserRole = useSessionStore.getState().userRole;
        if (currentUserRole === 'viewer') {
            console.log('[useLiveKitSession] Viewer mode: skipping microphone setup');
        } else {
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
        }
        // On first connect: start in 'AI is Thinking...' until first TTS or timeout
        try {
          setIsAwaitingAIResponse(true);
          setShowWaitingPill(false);
          if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; }
          thinkingTimeoutRef.current = window.setTimeout(() => {
            try { setIsAwaitingAIResponse(false); } catch {}
            try { setShowWaitingPill(true); } catch {}
            thinkingTimeoutRef.current = null;
          }, thinkingTimeoutMsRef.current);
        } catch {}

        // Fallback: if 'agent_ready' data message was missed, try to infer agent identity
        // and validate with a TestPing to establish RPC client.
        (async () => {
          try {
            // Poll a few times in case remote participant arrives slightly after connect
            const MAX_ATTEMPTS = 6; // ~6s
            for (let i = 0; i < MAX_ATTEMPTS && !agentServiceClientRef.current; i++) {
              await new Promise(r => setTimeout(r, 1000));
              if (agentServiceClientRef.current) return;
              // If handshake already set identity, stop
              if (agentServiceClientRef.current) return;
              // Infer candidate: any non-browser remote participant
              const candidates = Array.from(roomInstance.remoteParticipants.keys()).filter(id => !String(id).startsWith('browser-bot-'));
              if (candidates.length > 0 && roomInstance.localParticipant) {
                const pid = String(candidates[0]);
                try {
                  console.log('[FLOW] Fallback inferred agent identity:', pid, '- waiting for agent_ready to enable RPC');
                  setAgentIdentity(pid);
                  // Do NOT set agentServiceClientRef or isConnected here. Wait for 'agent_ready'.
                  return;
                } catch (e) {
                  console.warn('[FLOW] Fallback bind failed; will retry if attempts remain', e);
                  // Reset and retry next loop
                  try { setAgentIdentity(null); } catch {}
                  agentServiceClientRef.current = null;
                }
              }
            }
          } catch (e) {
            console.warn('[FLOW] Fallback handshake watcher error (non-fatal):', e);
          }
        })();
        // We wait for the agent_ready signal before setting isConnected to true
    }, [setIsLoading, setConnectionError, setIsAwaitingAIResponse, setShowWaitingPill, thinkingTimeoutRef, thinkingTimeoutMsRef]);
    
    const onDisconnected = useCallback(() => {
        console.log('[FLOW] LiveKit Disconnected');
        setIsConnected(false);
        setIsLoading(false);
        agentServiceClientRef.current = null;
        hasConnectStarted = false; // allow reconnect after disconnect
        try { resetConnectGuard(); } catch {}
        
        // Clean up microphone track
        if (microphoneTrackRef.current) {
            microphoneTrackRef.current.stop();
            microphoneTrackRef.current = null;
        }
        // No RPC unregistration needed
    }, [setIsConnected, setIsLoading, resetConnectGuard]);

    // Handler for audio tracks (agent voice output)
    const handleTrackSubscribed = useCallback((track: Track, publication: TrackPublication, participant: RemoteParticipant) => {
      if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Track subscribed:', { kind: track.kind, source: publication.source, participant: participant.identity });
      if (track.kind !== Track.Kind.Audio) return;
      const audioTrack = track as AudioTrack;
      const audioElement = audioTrack.attach();
      audioElement.autoplay = true;
      audioElement.volume = 1.0;
      audioElement.muted = false;
      document.body.appendChild(audioElement);
      try { agentAudioElsRef.current.push(audioElement); } catch {}
      try { (roomInstance as any)?.startAudio?.(); } catch {}
      setIsAgentSpeaking(true);
      try { setIsAwaitingAIResponse(false); } catch {}
      // Clear any pending thinking timeout
      try { if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; } } catch {}
      try { setShowWaitingPill(false); } catch {}
      track.on('ended', () => {
        try {
          const idx = agentAudioElsRef.current.indexOf(audioElement);
          if (idx >= 0) agentAudioElsRef.current.splice(idx, 1);
          if (audioElement.parentNode) audioElement.parentNode.removeChild(audioElement);
        } catch {}
        // When TTS finishes, mark agent not speaking and not awaiting
        try { setIsAgentSpeaking(false); } catch {}
        try { setIsAwaitingAIResponse(false); } catch {}
        try { setShowWaitingPill(true); } catch {}
      });
    }, [setIsAgentSpeaking, setIsAwaitingAIResponse, setShowWaitingPill]);

    // Turn detection via ActiveSpeakers removed

    const handleTrackUnsubscribed = useCallback((_track: Track, _publication: TrackPublication, _participant: RemoteParticipant) => {
      setIsAgentSpeaking(false);
      try { setIsAwaitingAIResponse(false); } catch {}
      try { setShowWaitingPill(true); } catch {}
    }, [setIsAgentSpeaking, setIsAwaitingAIResponse, setShowWaitingPill]);

    // Handler for transcription data (LiveKit STT)
    const handleTranscriptionReceived = useCallback((transcriptions: TranscriptionSegment[], participant?: Participant, _publication?: TrackPublication) => {
      if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Transcription received:', transcriptions);
      try {
        const isLocal = participant && roomInstance.localParticipant && (participant.identity === roomInstance.localParticipant.identity);
        if (isLocal && isPushToTalkActiveRef.current) {
          transcriptions.forEach((seg) => {
            const t = seg?.text;
            if (typeof t === 'string' && t.trim()) {
              pttBufferRef.current.push(t.trim());
            }
          });
        }
      } catch {}
      transcriptions.forEach((segment) => {
        const text = segment.text?.trim();
        if (text) {
          const speaker = participant?.identity || 'Unknown';
          const message = `${speaker}: ${text}`;
          setTranscriptionMessages((prev) => [...prev.slice(-19), message]);
        }
      });
    }, [setTranscriptionMessages]);

    const handleDataReceived = useCallback(async (payload: Uint8Array, participant?: RemoteParticipant, kind?: any, topic?: string) => {
      if (!participant) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        console.log('[DataReceived] Packet from', participant.identity, { kind, topic, data });

        // --- Handle initial tab created by backend ---
        if (data?.type === 'initial_tab_created' && data?.tab_id) {
          console.log('[Tabs] Received initial tab from backend:', data);
          try {
            const tab = { id: data.tab_id, name: data.name || 'Home', url: data.url || 'about:blank' };
            addTab(tab);
            setActiveTabIdInStore(data.tab_id);
            console.log('[Tabs] Registered initial tab in store:', tab);
          } catch (e) {
            console.warn('[Tabs] Failed to register initial tab:', e);
          }
          return;
        }

        // --- Handle AI debrief question relayed by the browser pod ---
        if (data?.type === 'ai_debrief_question' && typeof data?.text === 'string' && data.text.length > 0) {
          console.log('[FLOW] Received AI debrief question from pod:', data.text);
          try {
            const { setDebriefMessage, setImprintingMode, setActiveView, setConceptualStarted, setIsAwaitingAIResponse } = useSessionStore.getState();
            try { setIsAwaitingAIResponse(false); } catch {}
            setDebriefMessage({ text: data.text });
            setImprintingMode('DEBRIEF_CONCEPTUAL');
            setActiveView('excalidraw');
            setConceptualStarted(true);
          } catch (e) {
            console.warn('[FLOW] Failed to apply debrief update to store:', e);
          }
          return;
        }

        if (data.type === 'agent_ready' && roomInstance.localParticipant) {
          const advertisedAgent = (data && (data as any).agent_identity) ? String((data as any).agent_identity) : String(participant.identity || '');
          console.log(`[FLOW] Agent ready signal received from ${participant.identity}. Advertised agent identity: ${advertisedAgent}`);
          if (advertisedAgent.startsWith('browser-bot-')) {
            console.warn('[FLOW] agent_ready from browser-bot ignored for agent binding');
            return;
          }
          setAgentIdentity(advertisedAgent);
          setIsConnected(true);
          console.log('[FLOW] Frontend ready (DataChannel established; using DataChannel for agent tasks)');
          try {
            const queued = [...pendingTasksRef.current];
            pendingTasksRef.current = [];
            for (const t of queued) {
              try {
                const traceId = uuidv4();
                const envelope = { type: 'agent_task', taskName: t.name, payload: { ...(t.payload || {}), trace_id: traceId } };
                const bytes = new TextEncoder().encode(JSON.stringify(envelope));
                try {
                  await roomInstance.localParticipant.publishData(bytes, { destinationIdentities: [advertisedAgent], reliable: true } as any);
                } catch {
                  await roomInstance.localParticipant.publishData(bytes);
                }
                console.log('[FLOW] Flushed queued task over DataChannel:', t.name);
              } catch (e) {
                console.warn('[FLOW] Failed to flush queued task:', t?.name, e);
              }
            }
          } catch {}
          return;
        }

        if (data.type === 'ui') {
          try {
            const action = String((data as any).action || '');
            const params = ((data as any).parameters || {}) as any;
            try { console.log('[B2F DC][UI] Received action', action, params); } catch {}
            await handleUiAction(action, params, { executeBrowserAction, visualizerBaseUrl });
          } catch (e) {
            console.warn('[B2F DC] Unified UI action handler failed:', e);
          }
          return;
        }

        // --- Handle backend-sent transcript fallback ---
        if (data?.type === 'transcript' && typeof data?.text === 'string') {
          const spk = (typeof data.speaker === 'string' && data.speaker.trim().length > 0) ? data.speaker : (participant?.identity || 'Student');
          const line = `${spk}: ${data.text}`;
          setTranscriptionMessages((prev) => [...prev.slice(-19), line]);
          return;
        }

        // --- Detect suggested responses ---
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
        console.error('Failed to parse agent data packet:', error);
      }
    }, [addTab, setActiveTabIdInStore, executeBrowserAction, visualizerBaseUrl, setTranscriptionMessages, setSuggestedResponses, setAgentIdentity, setIsConnected]);
    
    // Wire LiveKit events via shared hook
    useLiveKitEvents(roomInstance, {
      onConnected,
      onDisconnected,
      onDataReceived: handleDataReceived as any,
      onTrackSubscribed: handleTrackSubscribed as any,
      onTrackUnsubscribed: handleTrackUnsubscribed as any,
      onTranscriptionReceived: handleTranscriptionReceived as any,
    });

  // --- API EXPOSED TO THE COMPONENTS ---
  // This is the clean interface your UI components will use to talk to the agent.
  const startTask = useCallback(async (taskName: string, payload: object) => {
    const dcId = `dc_${uuidv4()}`;
    console.log(`%c[F2B DC PREP] ID: ${dcId}`, 'color: orange;', `Task: ${taskName}`, {
      roomState: roomInstance.state,
      agentIdentity,
    });
    if (!agentIdentity) {
      pendingTasksRef.current.push({ name: taskName, payload });
      console.warn(`[F2B DC QUEUED] ID: ${dcId} - Agent not ready; queued task '${taskName}'.`);
      return;
    }
    try {
      console.log(`%c[F2B DC SEND] ID: ${dcId}`, 'color: orange;', `Starting task: ${taskName}`);
      const traceId = uuidv4();
      try { (window as any).__lastTraceId = traceId; } catch {}
      const envelope = {
        type: 'agent_task',
        taskName,
        payload: { ...(payload as any), trace_id: traceId, _dcId: dcId },
      };
      const bytes = new TextEncoder().encode(JSON.stringify(envelope));
      try {
        await roomInstance.localParticipant.publishData(bytes, { destinationIdentities: [agentIdentity], reliable: true } as any);
      } catch {
        await roomInstance.localParticipant.publishData(bytes);
      }
      console.log(`%c[F2B DC SUCCESS] ID: ${dcId}`, 'color: green;');
    } catch (e) {
      console.error(`%c[F2B DC FAIL] ID: ${dcId}`, 'color: red;', 'Failed to send agent task:', e);
      setConnectionError(`Failed to start task: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [agentIdentity]);

  // --- Push To Talk helpers (LiveKit STT) ---
  const { startPushToTalk, stopPushToTalk } = usePTT({
    roomInstance,
    agentAudioElsRef,
    pttBufferRef,
    thinkingTimeoutRef,
    thinkingTimeoutMsRef,
    setIsPushToTalkActive,
    setIsMicEnabled,
    setIsAwaitingAIResponse,
    setShowWaitingPill,
    startTask,
  });

  // --- TAB MANAGEMENT FUNCTIONS --- (declared after sendBrowserInteraction below)

  // --- Kickstart: send an initial navigate over LiveKit DataChannel so the pod draws content ---
  useEffect(() => {
    if (!isConnected) return;
    if (initialNavSentRef.current) return;
    initialNavSentRef.current = true;
    try {
      const startUrl = process.env.NEXT_PUBLIC_BROWSER_START_URL;
      if (startUrl && startUrl.trim().length > 0) {
        const payload = JSON.stringify({ action: 'navigate', url: startUrl });
        const bytes = new TextEncoder().encode(payload);
        try {
          roomInstance?.localParticipant?.publishData(bytes);
          if (SESSION_FLOW_DEBUG) console.log('[FLOW] Sent initial navigate to', startUrl);
        } catch (e) {
          console.warn('[FLOW] Failed to publish initial navigate:', e);
        }
      } else {
        if (SESSION_FLOW_DEBUG) console.log('[FLOW] No NEXT_PUBLIC_BROWSER_START_URL set; skipping initial navigate');
      }
    } catch {}
  }, [isConnected]);

  // --- Send restored_feed_summary via UpdateAgentContext once after connect ---
  const sentSummaryRef = useRef(false);
  useEffect(() => {
    if (!isConnected || !agentIdentity || sentSummaryRef.current) return;
    try {
      const blocks = (useSessionStore.getState().whiteboardBlocks || []).map((b: any) => {
        if (b?.type === 'excalidraw') {
          return { id: b.id, type: b.type, summary: b.summary || '', elements_count: Array.isArray(b.elements) ? b.elements.length : 0 };
        } else if (b?.type === 'rrweb') {
          return { id: b.id, type: b.type, summary: b.summary || '', eventsUrl: (b as any).eventsUrl || null };
        }
        return { id: b?.id, type: b?.type };
      });
      const contextPayload = { restored_feed_summary: { blocks } };
      // Fire-and-forget: pass context to agent via DataChannel
      const envelope = {
        type: 'agent_context',
        action: 'UPDATE_AGENT_CONTEXT',
        parameters: { jsonContextPayload: JSON.stringify(contextPayload) },
      };
      const bytes = new TextEncoder().encode(JSON.stringify(envelope));
      try {
        // Non-async effect: chain promises instead of await
        roomInstance.localParticipant
          .publishData(bytes, { destinationIdentities: [agentIdentity], reliable: true } as any)
          .catch(() => roomInstance.localParticipant.publishData(bytes).catch(() => {}));
      } catch {}
      sentSummaryRef.current = true;
      console.log('[F2B DC] Sent UpdateAgentContext with restored_feed_summary');
    } catch (e) {
      console.warn('[F2B DC] Failed to send restored_feed_summary context (non-fatal):', e);
    }
  }, [isConnected, agentIdentity]);

  // --- Deletion helper shared by multiple event hooks ---
  useSessionCleanup({
    DELETE_ON_UNLOAD,
    isUnloadingRef,
    sessionIdRef,
    sessionStatusUrlRef,
    sendDeleteNowRef,
  });

  // --- Do NOT auto-delete on transient LiveKit disconnects ---
  useEffect(() => {
    // Keep this effect to ensure listeners are cleaned if added in future
    return () => {};
  }, []);

  // Convenience method for Suggested Responses selection (no-op)
  const selectSuggestedResponse = useCallback(async (_suggestion: { id: string; text: string; reason?: string }) => {
    console.log('[UI] selectSuggestedResponse suppressed; no backend RPC will be sent.');
    try { clearSuggestedResponses(); } catch {}
  }, [clearSuggestedResponses]);

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
    // ptt
    startPushToTalk,
    stopPushToTalk,
  };
}
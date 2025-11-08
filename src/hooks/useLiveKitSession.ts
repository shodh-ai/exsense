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
  // --- Derived UI values ---
  latestTranscriptWindowed: string;
}

export interface LiveKitSpawnOptions {
  spawnAgent?: boolean;
  spawnBrowser?: boolean;
}

export function useLiveKitSession(roomName: string, userName: string, courseId?: string, options?: LiveKitSpawnOptions): UseLiveKitSessionReturn {
  // --- CLERK AUTHENTICATION ---
  const { getToken, isSignedIn, userId } = useAuth();
  const visualizerBaseUrl = process.env.NEXT_PUBLIC_VISUALIZER_URL;
  const [browserIdentity, setBrowserIdentity] = useState<string | null>(null);
  const { executeBrowserAction } = useBrowserActionExecutor(roomInstance, browserIdentity || undefined);
  
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
  const [latestTranscriptWindowed, setLatestTranscriptWindowed] = useState<string>('');

  const agentServiceClientRef = useRef<any | null>(null); // deprecated RPC client (unused; DataChannel is used now)
  const pendingTasksRef = useRef<{ name: string; payload: any }[]>([]);
  const microphoneTrackRef = useRef<AudioTrack | null>(null);
  const isPushToTalkActiveRef = useRef<boolean>(false);
  const pttBufferRef = useRef<string[]>([]);
  const pttAcceptUntilTsRef = useRef<number>(0);
  const pttRecentTextsRef = useRef<string[]>([]);
  const agentAudioElsRef = useRef<HTMLAudioElement[]>([]);
  const thinkingTimeoutRef = useRef<number | null>(null);
  const thinkingTimeoutMsRef = useRef<number>(Number(process.env.NEXT_PUBLIC_AI_THINKING_TIMEOUT_MS) || 8000);
  // Dedupe guard for startTask student_spoke_or_acted
  const lastSentTaskNameRef = useRef<string>('');
  const lastSentTranscriptRef = useRef<string>('');
  const lastSentAtMsRef = useRef<number>(0);
  // Ensure we only issue one RPC TestPing per session
  const testPingSentRef = useRef<boolean>(false);
  // Track whether we've registered the RPC handler to avoid duplicate registrations under StrictMode/HMR
  // RPC handler is deprecated; UI actions come over DataChannel now
  // Rolling 10-word window and auto-clear timer for transcript bubble
  const rollingWordsRef = useRef<string[]>([]);
  const latestClearTimerRef = useRef<number | null>(null);

  const updateTranscriptWindow = useCallback((text: string) => {
    try {
      const newWords = String(text || '').trim().split(/\s+/).filter(Boolean);
      if (newWords.length === 0) return;
      const next = [...rollingWordsRef.current, ...newWords].slice(-10);
      rollingWordsRef.current = next;
      setLatestTranscriptWindowed(next.join(' '));
      if (latestClearTimerRef.current) {
        clearTimeout(latestClearTimerRef.current);
        latestClearTimerRef.current = null;
      }
      latestClearTimerRef.current = window.setTimeout(() => {
        rollingWordsRef.current = [];
        setLatestTranscriptWindowed('');
        latestClearTimerRef.current = null;
      }, 5000);
    } catch {}
  }, []);

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
    userId: userId || undefined,
    courseId,
    options,
    setIsLoading,
    setConnectionError,
    setLivekitUrl,
    setLivekitToken,
    setCurrentRoomName,
    setSessionManagerSessionIdState,
    setSessionStatusUrlState,
    sessionIdRef,
    sessionStatusUrlRef,
  });

  const connectToRoomRef = useRef(connectToRoom);
  useEffect(() => {
    connectToRoomRef.current = connectToRoom;
  }, [connectToRoom]);
  const readyToConnect = !!userName && !!courseId;
  useEffect(() => {
    if (readyToConnect) {
      connectToRoomRef.current();
    }
  }, [readyToConnect]);


  // --- EVENT & DATA CHANNEL HANDLERS ---

    const onConnected = useCallback(async () => {
        console.log('[DIAGNOSTIC] 6. The onConnected event handler has FIRED!');
        console.log('[FLOW] LiveKit Connected');
        setIsLoading(false);
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
        // Removed fallback agent identity inference. We rely solely on 'agent_ready'.
        // We wait for the agent_ready signal before setting isConnected to true
    }, [setIsLoading, setIsAwaitingAIResponse, setShowWaitingPill, thinkingTimeoutRef, thinkingTimeoutMsRef]);
    
    const onDisconnected = useCallback(() => {
      console.log('[FLOW] LiveKit Disconnected');
      setIsConnected(false);
      setIsLoading(false);
      agentServiceClientRef.current = null;
      hasConnectStarted = false; // allow reconnect after disconnect
      try { resetConnectGuard(); } catch {}
      try { testPingSentRef.current = false; } catch {}
        
        // Clean up microphone track
        if (microphoneTrackRef.current) {
            microphoneTrackRef.current.stop();
            microphoneTrackRef.current = null;
        }
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

    // Helper: append unique transcript text to PTT buffer
    const appendUniquePTT = useCallback((raw: string) => {
      try {
        const norm = String(raw || '').trim();
        if (!norm) return;
        const recent = pttRecentTextsRef.current || [];
        // Simple dedupe: avoid exact repeats within recent window of 10 entries
        if (recent.includes(norm)) return;
        pttBufferRef.current.push(norm);
        recent.push(norm);
        if (recent.length > 10) recent.shift();
        pttRecentTextsRef.current = recent;
      } catch {}
    }, []);

    // Handler for transcription data (LiveKit STT)
    // ============================= FIX START ==============================
    const handleTranscriptionReceived = useCallback((transcriptions: TranscriptionSegment[], participant?: Participant) => {
      if (!transcriptions || transcriptions.length === 0) return;
  
      if (LIVEKIT_DEBUG) console.log('[useLiveKitSession] Transcription received:', transcriptions);
  
      // --- PTT Buffer Logic (for sending user speech to agent) ---
      // This part buffers your own speech when Push-To-Talk is active.
      try {
        const now = Date.now();
        const acceptWindow = now <= (pttAcceptUntilTsRef.current || 0) || !!isPushToTalkActiveRef.current;
        const speakerId = participant?.identity || '';
        const isLocal = !!participant && !!roomInstance.localParticipant && (speakerId === roomInstance.localParticipant.identity);
        const isAgentLike = typeof speakerId === 'string' && speakerId.startsWith('simulated-agent-');
        const isAgentById = !!agentIdentity && speakerId === agentIdentity;
        const accept = acceptWindow && (isLocal || (!isAgentLike && !isAgentById) || !participant);
  
        if (accept) {
          transcriptions.forEach((seg) => {
            const t = seg?.text;
            const isFinal = seg?.final === true || (seg as any)?.isFinal === true || (seg as any)?.type === 'final';
            if (typeof t === 'string' && t.trim()) {
              if (("final" in (seg || {})) || ("isFinal" in (seg || {})) || ("type" in (seg || {}))) {
                if (isFinal) appendUniquePTT(t);
              } else {
                appendUniquePTT(t);
              }
            }
          });
        }
      } catch (e) {
        console.warn('PTT buffering failed:', e);
      }
  
      // --- UI Display Logic (to fix the "flash") ---
  
      // 1. Find the most complete text from the current batch of segments.
      // The final segment is the most accurate, so we prefer its text.
      const finalSegment = transcriptions.find(seg => seg.final);
      const fullText = (finalSegment?.text || transcriptions.map(s => s.text).join('')).trim();
  
      if (!fullText) return;
  
      // 2. ALWAYS update the live, animated transcript window.
      // This will show both interim and final results for a smooth animation.
      updateTranscriptWindow(fullText);
  
      // 3. ONLY update the persistent "chat history" IF the transcript is final.
      // This prevents the full sentence from flashing on the screen prematurely.
      if (finalSegment) {
        const speaker = participant?.identity || 'Unknown';
        const message = `${speaker}: ${fullText}`;
        setTranscriptionMessages((prev) => [...prev.slice(-19), message]);
      }
    }, [agentIdentity, appendUniquePTT, setTranscriptionMessages, updateTranscriptWindow]);
    // ============================= FIX END ================================

    const handleDataReceived = useCallback(async (payload: Uint8Array, participant?: RemoteParticipant, kind?: any, topic?: string) => {
      if (!participant) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        console.log('[DataReceived] Packet from', participant.identity, { kind, topic, data });
        try {
          if (typeof participant.identity === 'string' && participant.identity.startsWith('browser-bot-')) {
            setBrowserIdentity(participant.identity);
          }
        } catch {}

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

        // --- Handle backend-emitted tab events ---
        if (data?.type === 'tab_opened' && typeof data.tab_id === 'string') {
          try {
            const tab = { id: data.tab_id, name: data.name || 'New Tab', url: data.url || 'about:blank' };
            addTab(tab);
            console.log('[Tabs] tab_opened registered:', tab);
          } catch (e) {
            console.warn('[Tabs] Failed to process tab_opened:', e);
          }
          return;
        }

        if (data?.type === 'tab_switched' && typeof data.tab_id === 'string') {
          try {
            setActiveTabIdInStore(data.tab_id);
            console.log('[Tabs] tab_switched ->', data.tab_id);
          } catch (e) {
            console.warn('[Tabs] Failed to process tab_switched:', e);
          }
          return;
        }

        if (data?.type === 'tab_closed' && typeof data.closed_tab_id === 'string') {
          try {
            removeTab(data.closed_tab_id);
            if (typeof data.active_tab_id === 'string' && data.active_tab_id) {
              setActiveTabIdInStore(data.active_tab_id);
            }
            console.log('[Tabs] tab_closed ->', data.closed_tab_id, 'active now ->', data.active_tab_id);
          } catch (e) {
            console.warn('[Tabs] Failed to process tab_closed:', e);
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

        // --- Agent handshake: bind identity and send TestPing once ---
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
            if (roomInstance?.localParticipant) {
              const sessKey = (sessionIdRef.current && sessionIdRef.current.trim().length > 0)
                ? `rox_testping_${sessionIdRef.current}`
                : (`rox_testping_${roomInstance?.name || roomName || 'unknown'}`);
              const alreadyPinged = (typeof window !== 'undefined') ? sessionStorage.getItem(sessKey) === '1' : false;
              if (!testPingSentRef.current && !alreadyPinged) {
                const rpc = new LiveKitRpcAdapter(roomInstance.localParticipant, advertisedAgent);
                try {
                  await rpc.request('rox.interaction.AgentInteraction', 'TestPing', new Uint8Array());
                  testPingSentRef.current = true;
                  try { sessionStorage.setItem(sessKey, '1'); } catch {}
                  console.log('[FLOW] RPC TestPing sent to agent (once)');
                } catch (e) {
                  console.warn('[FLOW] RPC TestPing failed:', e);
                }
              } else {
                console.log('[FLOW] Skipping RPC TestPing; already sent for this session/room');
              }
            }
          } catch {}
          // Flush any queued tasks now that agent identity is known
          try {
            const queued = [...pendingTasksRef.current];
            pendingTasksRef.current = [];
            for (const t of queued) {
              try {
                const traceId = uuidv4();
                const envelope = { type: 'agent_task', taskName: t.name, payload: { ...(t.payload || {}), trace_id: traceId } };
                const bytes = new TextEncoder().encode(JSON.stringify(envelope));
                try {
                  // Use positional signature: publishData(data, reliable, destinationIdentities)
                  await (roomInstance.localParticipant.publishData as any)(bytes, true, [advertisedAgent]);
                  try { console.log('[F2B DC VARIANT] queued flush: positional reliable+destinationIdentities'); } catch {}
                } catch (e) {
                  console.warn('[FLOW] Failed to flush queued task to agent:', e);
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
          // Update rolling 10-word window for UI bubble
          try { updateTranscriptWindow(String(data.text)); } catch {}
          // Also buffer into PTT when active or in linger window, if speaker is local student or unknown
          try {
            const now = Date.now();

            const accept = now <= (pttAcceptUntilTsRef.current || 0) || !!isPushToTalkActiveRef.current;
            const localId = roomInstance?.localParticipant?.identity || '';
            const isAgentLike = typeof spk === 'string' && spk.startsWith('simulated-agent-');
            const isAgentById = !!agentIdentity && spk === agentIdentity;
            const isBrowserBot = typeof spk === 'string' && spk.startsWith('browser-bot-');
            const isStudentLike = (!isAgentLike && !isAgentById && !isBrowserBot) && (!!spk);
            if (accept && (spk === localId || isStudentLike)) {
              const t = String(data.text || '').trim();
              if (t) appendUniquePTT(t);
            }
          } catch {}
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
    }, [addTab, setActiveTabIdInStore, executeBrowserAction, visualizerBaseUrl, setTranscriptionMessages, setSuggestedResponses, setAgentIdentity, setIsConnected, updateTranscriptWindow, appendUniquePTT, agentIdentity]);
    
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
    // Idempotency: suppress identical transcript resends within a short window
    try {
      if (taskName === 'student_spoke_or_acted') {
        const norm = String((payload as any)?.transcript || '').trim();
        const lastName = lastSentTaskNameRef.current || '';
        const lastNorm = (lastSentTranscriptRef.current || '').trim();
        const lastAt = lastSentAtMsRef.current || 0;
        const now = Date.now();
        if (norm && lastName === 'student_spoke_or_acted' && lastNorm === norm && (now - lastAt) < 25000) {
          console.log('[F2B DC] Suppressing duplicate student_spoke_or_acted within window');
          return;
        }
      }
    } catch {}
    const dcId = `dc_${uuidv4()}`;
    console.log(`%c[F2B DC PREP] ID: ${dcId}`, 'color: orange;', `Task: ${taskName}`, { roomState: roomInstance.state, agentIdentity });
    if (!agentIdentity || agentIdentity.startsWith('browser-bot-')) {
      pendingTasksRef.current.push({ name: taskName, payload });
      console.warn(`[F2B DC QUEUED] ID: ${dcId} - Invalid agentIdentity='${agentIdentity || 'null'}'; queued '${taskName}' until agent_ready.`);
      return;
    }
    try {
      console.log(`[F2B DC TARGET] agentIdentity='${agentIdentity}'`);
      console.log(`%c[F2B DC SEND] ID: ${dcId}`, 'color: orange;', `Starting task: ${taskName}`);
      try {
        const lp: any = roomInstance?.localParticipant as any;
        const perms = lp?.permissions || (lp?._permissions) || null;
        const rem = Array.from(roomInstance?.remoteParticipants?.keys?.() || []);
        console.log('[F2B DC DIAG]', { localIdentity: lp?.identity, permissions: perms, remoteParticipants: rem });
      } catch {}
      const traceId = uuidv4();
      try { (window as any).__lastTraceId = traceId; } catch {}
      const envelope = {
        type: 'agent_task',
        taskName,
        payload: { ...(payload as any), trace_id: traceId, _dcId: dcId },
      };
      const bytes = new TextEncoder().encode(JSON.stringify(envelope));
      // Primary: legacy positional targeted send (broadest compatibility)
      let sent = false;
      try {
        await (roomInstance.localParticipant.publishData as any)(bytes, true, [agentIdentity]);
        sent = true;
        try { console.log('[F2B DC VARIANT] primary=positional'); } catch {}
      } catch (posErr) {
        console.warn('[F2B DC VARIANT] positional failed, trying identity options', posErr);
      }
      if (!sent) {
        // Secondary: identity options (destinationIdentities)
        const optsId: any = { destinationIdentities: [agentIdentity], reliable: true, topic: 'agent_task' };
        try { console.log('[F2B DC OPTS][identity]', optsId); } catch {}
        try {
          await roomInstance.localParticipant.publishData(bytes, optsId);
          sent = true;
          try { console.log('[F2B DC VARIANT] secondary=identity options'); } catch {}
        } catch (optIdErr) {
          console.warn('[F2B DC VARIANT] identity options failed, trying SID destination', optIdErr);
        }
      }
      if (!sent) {
        // Tertiary: destination via SID if available
        let agentSid: string | undefined;
        try {
          const remVals: any[] = Array.from((roomInstance?.remoteParticipants as any)?.values?.() || []);
          const part = remVals.find((p: any) => (p?.identity || '') === agentIdentity);
          agentSid = part?.sid;
        } catch {}
        try { console.log('[F2B DC DEST]', { agentIdentity, agentSid }); } catch {}
        if (agentSid) {
          const optsSid: any = { destination: [agentSid], reliable: true, topic: 'agent_task' };
          try { console.log('[F2B DC OPTS][sid]', optsSid); } catch {}
          try {
            await roomInstance.localParticipant.publishData(bytes, optsSid);
            sent = true;
            try { console.log('[F2B DC VARIANT] tertiary=options SID'); } catch {}
          } catch (sidErr) {
            console.warn('[F2B DC VARIANT] options SID failed', sidErr);
          }
        }
      }
      // Env-gated broadcast duplicate for safety when targeting is flaky
      try {
        const BCAST_DUP = (process.env.NEXT_PUBLIC_LK_DC_BCAST_DUP || 'false').toLowerCase() === 'true';
        if (BCAST_DUP) {
          try {
            await roomInstance.localParticipant.publishData(bytes);
            console.log('[F2B DC DUP] broadcast duplicate sent (env NEXT_PUBLIC_LK_DC_BCAST_DUP=true)');
          } catch (e) {
            console.warn('[F2B DC DUP] broadcast duplicate failed', e);
          }
        } else if (!sent) {
          try {
            await roomInstance.localParticipant.publishData(bytes);
            console.log('[F2B DC FALLBACK] broadcast fallback sent because all targeted variants failed');
          } catch (e) {
            console.warn('[F2B DC FALLBACK] broadcast fallback failed', e);
          }
        }
      } catch {}
      // If a browser-bot is present, optionally double-send using the positional API without topic for extra safety (opt-in)
      try {
        const DOUBLE = (process.env.NEXT_PUBLIC_LK_DC_DOUBLE_SEND || 'false').toLowerCase() === 'true';
        const remVals: any[] = Array.from((roomInstance?.remoteParticipants as any)?.values?.() || []);
        const hasBrowser = remVals.some((p: any) => (p?.identity || '').startsWith('browser-bot-'));
        if (DOUBLE && hasBrowser) {
          try {
            await (roomInstance.localParticipant.publishData as any)(bytes, true, [agentIdentity]);
            console.log('[F2B DC RESEND] positional targeted resend because browser-bot present');
          } catch (e) {
            console.warn('[F2B DC RESEND] failed', e);
          }
        }
      } catch {}
      try {
        const PROBE = (process.env.NEXT_PUBLIC_LK_DC_PROBE || '').toLowerCase() === 'true';
        if (PROBE) {
          const probe = new TextEncoder().encode(JSON.stringify({ type: 'probe', ts: Date.now(), note: 'dc_broadcast_probe' }));
          await roomInstance.localParticipant.publishData(probe);
          console.log('[F2B DC PROBE] broadcast probe sent');
        }
      } catch {}
      console.log(`%c[F2B DC SUCCESS] ID: ${dcId}`, 'color: green;');
      try {
        if (taskName === 'student_spoke_or_acted') {
          lastSentTaskNameRef.current = taskName;
          lastSentTranscriptRef.current = String((payload as any)?.transcript || '').trim();
          lastSentAtMsRef.current = Date.now();
        }
      } catch {}
    } catch (e) {
      console.error(`%c[F2B DC FAIL] ID: ${dcId}`, 'color: red;', `Failed to send '${taskName}' to agent='${agentIdentity}':`, e);
      setConnectionError(`Failed to start task: ${e instanceof Error ? e.message : String(e)}`);
    }
  }, [agentIdentity]);

  // --- Push To Talk helpers (LiveKit STT) ---
  const { startPushToTalk, stopPushToTalk } = usePTT({
    roomInstance,
    agentAudioElsRef,
    pttBufferRef,
    pttAcceptUntilTsRef,
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
          if (browserIdentity && browserIdentity.trim().length > 0) {
            roomInstance?.localParticipant?.publishData(bytes, { destinationIdentities: [browserIdentity], reliable: true } as any);
          } else {
            roomInstance?.localParticipant?.publishData(bytes);
          }
          if (SESSION_FLOW_DEBUG) console.log('[FLOW] Sent initial navigate to', startUrl, browserIdentity ? `(to ${browserIdentity})` : '(broadcast)');
        } catch (e) {
          console.warn('[FLOW] Failed to publish initial navigate:', e);
        }
      } else {
        if (SESSION_FLOW_DEBUG) console.log('[FLOW] No NEXT_PUBLIC_BROWSER_START_URL set; skipping initial navigate');
      }
    } catch {}
  }, [isConnected, browserIdentity]);

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
        // Primary: positional targeted send
        (roomInstance.localParticipant.publishData as any)(bytes, true, [agentIdentity])
          .then(() => { try { console.log('[F2B DC VARIANT] restored_feed_summary: primary=positional'); } catch {} })
          .catch(() => roomInstance.localParticipant
            .publishData(bytes, { destinationIdentities: [agentIdentity], reliable: true, topic: 'agent_task' } as any)
            .then(() => { try { console.log('[F2B DC VARIANT] restored_feed_summary: secondary=identity options'); } catch {} })
            .catch(() => {
              const remVals: any[] = Array.from((roomInstance?.remoteParticipants as any)?.values?.() || []);
              const part = remVals.find((p: any) => (p?.identity || '') === agentIdentity);
              const sid = part?.sid;
              if (sid) {
                return roomInstance.localParticipant.publishData(bytes, { destination: [sid], reliable: true, topic: 'agent_task' } as any)
                  .then(() => { try { console.log('[F2B DC VARIANT] restored_feed_summary: tertiary=options SID'); } catch {} })
                  .catch(() => roomInstance.localParticipant.publishData(bytes).then(() => { try { console.log('[F2B DC VARIANT] restored_feed_summary: broadcast fallback'); } catch {} }).catch(() => {}));
              }
              return roomInstance.localParticipant.publishData(bytes).then(() => { try { console.log('[F2B DC VARIANT] restored_feed_summary: broadcast fallback'); } catch {} }).catch(() => {});
            })
          );
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
    isConnected,
    roomName,
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
    latestTranscriptWindowed,
  };
}
"use client";

import React, { useState, useEffect, useRef } from 'react';
import Footer from '@/components/compositions/Footer';
import { StatusPill } from '@/components/compositions/StatusPill';
import type { Room } from 'livekit-client';

import NextDynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { useApiService, WhiteboardBlockType } from '@/lib/api';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { TabManager } from '@/components/session/TabManager';

import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sphere from '@/components/compositions/Sphere';
import { DemoRoleIndicator } from '@/components/session/DemoRoleIndicator';

// Excalidraw and Mermaid conversion libs are imported dynamically in the effect below

const IntroPage = NextDynamic(() => import('@/components/session/IntroPage'));

const ExcalidrawBlockView = NextDynamic<{ initialElements: any[] }>(() => import('@/components/session/ExcalidrawBlockView'), { ssr: false });
const RrwebBlockView = NextDynamic<{ eventsUrl: string }>(() => import('@/components/session/RrwebBlockView'), { ssr: false });
const VideoBlockView = NextDynamic<{ videoUrl: string }>(() => import('@/components/session/VideoBlockView'), { ssr: false });
const LiveKitViewer = NextDynamic(() => import('@/components/session/LiveKitViewer'), { ssr: false });

// Prevent static prerendering of this page at build time
export const dynamic = 'force-dynamic';

type ViewKey = ReturnType<typeof useSessionStore.getState>['activeView'];

interface ButtonConfig {
    key: ViewKey;
    label: string;
    inactiveImagePath: string;
    activeImagePath: string;
}

interface SessionContentProps {
    activeView: ViewKey;
    setActiveView: (view: ViewKey) => void;
    componentButtons: ButtonConfig[];

    room?: Room;
    livekitUrl: string;
    livekitToken: string;
    isConnected: boolean;
    isDiagramGenerating: boolean;
    sendBrowserInteraction: (payload: object) => Promise<void>;
    // tab management
    openNewTab: (name: string, url: string) => Promise<void>;
    switchTab: (id: string) => Promise<void>;
    closeTab: (id: string) => Promise<void>;
}

function SessionContent({ activeView, setActiveView, componentButtons, room, livekitUrl, livekitToken, isConnected, isDiagramGenerating, sendBrowserInteraction, openNewTab, switchTab, closeTab }: SessionContentProps) {
    const whiteboardBlocks = useSessionStore((s) => s.whiteboardBlocks);
    const whiteboardScrollRef = useRef<HTMLDivElement | null>(null);
    const [isBarVisible, setIsBarVisible] = useState(false);
    const hideTimer = useRef<NodeJS.Timeout | null>(null); // Ref to hold the timer

    // The vertical distance the content needs to shift down.
    const contentShiftDistance = '76px';

    // --- NEW HOVER LOGIC ---
    const handleMouseEnter = () => {
        // If there's a timer to hide the bar, cancel it
        if (hideTimer.current) {
            clearTimeout(hideTimer.current);
            hideTimer.current = null;
        }
        setIsBarVisible(true);
    };

    const handleMouseLeave = () => {
        // Set a timer to hide the bar after a short delay (300ms)
        hideTimer.current = setTimeout(() => {
            setIsBarVisible(false);
        }, 300);
    };

    // Clean up the timer if the component unmounts
    useEffect(() => {
        return () => {
            if (hideTimer.current) {
                clearTimeout(hideTimer.current);
            }
        };
    }, []);
    // --- END NEW HOVER LOGIC ---


    // Auto-focus newest whiteboard block when list changes
    useEffect(() => {
        if (!whiteboardBlocks?.length) return;
        const lastId = whiteboardBlocks[whiteboardBlocks.length - 1]?.id;
        if (!lastId) return;
        if (typeof window === 'undefined') return;
        requestAnimationFrame(() => {
            const container = whiteboardScrollRef.current;
            const el = document.getElementById(lastId);
            if (!container || !el) return;
            try {
                const elTop = el.offsetTop; // relative to container
                const maxTop = container.scrollHeight - container.clientHeight;
                const targetTop = Math.max(0, Math.min(elTop - 12, maxTop));
                container.scrollTo({ top: targetTop, behavior: 'smooth' });
            } catch {}
        });
    }, [whiteboardBlocks?.length]);
    return (
        <div className='w-full h-full flex flex-col relative'>
            {/* Hover-activated navigation bar container (non-blocking) */}
            <div
                className="absolute top-0 left-0 right-0 z-20 h-28 flex justify-center items-start group pointer-events-none"
            >
                {/* Thin hitbox to detect hover without blocking content */}
                <div
                    className="absolute top-0 left-0 right-0 h-6 pointer-events-auto"
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                />
                {/* Visual Cue "Handle" - indicates where to hover */}
                <div
                    className={`
                        absolute top-0 w-12 h-1.5 bg-gray-400/70 rounded-b-full
                        transition-opacity duration-300 ease-in-out
                        ${isBarVisible ? 'opacity-0' : 'opacity-50 group-hover:opacity-100'}
                    `}
                />

                {/* Animated container for the bar */}
                <div
                    className={`
                        absolute top-0 w-full flex justify-center pointer-events-auto
                        transition-all duration-300 ease-in-out
                        ${isBarVisible ? 'translate-y-5 opacity-100' : '-translate-y-full opacity-0'}
                    `}
                >
                    {/* The actual bar with original sizing and styling */}
                    <div className="p-0 w-full md:w-1/2 lg:w-1/3 h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center gap-2 px-1 backdrop-blur-sm border border-white/10">
                        {componentButtons.map(({ key, label, inactiveImagePath, activeImagePath }) => (
                            <button
                                key={key}
                                onClick={() => setActiveView(key)}
                                className={`flex-1 h-[45px] flex items-center justify-center gap-2 rounded-full border-transparent font-jakarta-sans font-semibold-600 text-sm transition-all duration-200 ${activeView === key ? 'bg-[#566FE9] text-[#ffffff]' : 'text-[#566FE9] bg-transparent'}`}
                            >
                                <img src={activeView === key ? activeImagePath : inactiveImagePath} alt={label} className="w-[20px] h-[20px]" />
                                {label}
                            </button>
                        ))}
                    </div>
                {/* Whiteboard scrollbar theming */}
                <style jsx global>{`
                  .whiteboard-scroll { scrollbar-width: thin; scrollbar-color: #566FE9 transparent; }
                  .whiteboard-scroll::-webkit-scrollbar { width: 10px; height: 10px; }
                  .whiteboard-scroll::-webkit-scrollbar-track { background: transparent; }
                  .whiteboard-scroll::-webkit-scrollbar-thumb { background-color: #566FE9; border-radius: 9999px; border: 2px solid transparent; background-clip: padding-box; }
                  .whiteboard-scroll::-webkit-scrollbar-corner { background: transparent; }
                `}</style>
                </div>
            </div>

            {/* Whiteboard feed view and other views */}
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0, paddingBottom: '8.5rem' }}>
                <div
                    className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full relative overflow-y-auto overflow-x-hidden whiteboard-scroll`}
                    style={{
                        transition: 'padding-top 300ms ease-in-out',
                        paddingTop: isBarVisible ? contentShiftDistance : '0px'
                    }}
                    ref={whiteboardScrollRef}
                >
                    {/* Whiteboard content remains unchanged, it doesn't need to shift */}
                    <div className="max-w-5xl mx-auto w-full px-4 py-4 space-y-8">
                        {whiteboardBlocks.length === 0 && (
                            <div className="text-center text-gray-400 pt-10">Whiteboard feed is empty.</div>
                        )}
                        {whiteboardBlocks.map((block) => (
                            <div key={block.id} id={block.id} className="rounded-xl overflow-hidden border border-white/10 bg-transparent shadow-sm">
                                <div className="w-full" style={{ minHeight: 320 }}>
                                    {block.type === 'excalidraw' && (
                                        <ExcalidrawBlockView initialElements={block.elements as any[]} />
                                    )}
                                    {block.type === 'rrweb' && (
                                        <RrwebBlockView eventsUrl={(block as any).eventsUrl} />
                                    )}
                                    {block.type === 'video' && (
                                        <VideoBlockView videoUrl={(block as any).videoUrl} />
                                    )}
                                </div>
                                <div className="px-3 pb-3 pt-1 select-none flex items-center justify-center gap-2 text-gray-600">
                                  <img
                                    src={
                                      block.type === 'excalidraw' ? '/whiteboard-inactive.svg' :
                                      block.type === 'video' ? '/video-inactive.svg' :
                                      '/video-inactive.svg'
                                    }
                                    alt="block icon"
                                    className="w-4 h-4 opacity-90"
                                  />
                                  <span className="text-xs leading-5">
                                    {(block as any).summary ||
                                      (block.type === 'excalidraw' ? 'Whiteboard' :
                                       block.type === 'video' ? 'Video' : 'Replay')}
                                  </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    {isDiagramGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                            <p>Generating Diagram...</p>
                        </div>
                    )}
                </div>

                {/* This container will now shift down when the bar is visible */}
                <div className={`
                    ${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full flex flex-col
                    transition-transform duration-300 ease-in-out
                `}
                style={{
                    transform: isBarVisible ? `translateY(${contentShiftDistance})` : 'translateY(0px)',
                }}
                >
                    {room ? (
                        <>
                            <TabManager
                                onSwitchTab={switchTab}
                                onOpenNewTab={openNewTab}
                                onCloseTab={closeTab}
                            />
                            <div className="flex-1 w-full h-full min-h-0">
                                <LiveKitViewer room={room} onInteraction={isConnected ? sendBrowserInteraction : undefined} />
                            </div>
                        </>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300">Connecting to LiveKit...</div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function Session() {
    const activeView = useSessionStore((s) => s.activeView);
    const setActiveView = useSessionStore((s) => s.setActiveView);
    const setVisualizationData = useSessionStore((s) => s.setVisualizationData);
    const setBlocks = useSessionStore((s) => s.setBlocks);
    const addBlock = useSessionStore((s) => s.addBlock);
    const updateBlock = useSessionStore((s) => s.updateBlock);

    const [isIntroActive, setIsIntroActive] = useState(true);
    const [wbSessionId, setWbSessionId] = useState<string | null>(null);
    // Centralized diagramDefinition and generation state from store
    const diagramDefinition = useSessionStore((s) => s.diagramDefinition);
    const isGenerating = useSessionStore((s) => s.isDiagramGenerating);
    const SESSION_DEBUG = false;

    const handleIntroComplete = () => setIsIntroActive(false);
    // Guard to prevent re-applying same diagram
    const lastAppliedDiagramRef = useRef<string | null>(null);
    const apiService = useApiService();
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const currentRoomName = useSessionStore((s) => s.currentRoomName);

    const courseId = searchParams.get('courseId');

    useEffect(() => {
        // Lightweight helpers for block summaries and coloring
        const getMermaidType = (src: string): string => {
            const first = src.split(/\n|\r/).find((l) => l.trim().length > 0)?.trim() || '';
            const token = first.split(/\s+/)[0];
            // Normalize known diagram types
            switch ((token || '').toLowerCase()) {
                case 'flowchart':
                case 'graph':
                    return 'Flowchart';
                case 'sequencediagram':
                    return 'Sequence Diagram';
                case 'classdiagram':
                    return 'Class Diagram';
                case 'erdiagram':
                    return 'ER Diagram';
                case 'mindmap':
                    return 'Mindmap';
                case 'gantt':
                    return 'Gantt';
                case 'timeline':
                    return 'Timeline';
                case 'pie':
                    return 'Pie Chart';
                case 'journey':
                    return 'User Journey';
                default:
                    return token ? token : 'Diagram';
            }
        };

        const colorizeElements = (elements: any[]): any[] => {
            // Apply pleasant readable colors to nodes while keeping arrows dark
            const palette = ['#FDE68A','#A7F3D0','#BFDBFE','#FBCFE8','#DDD6FE','#C7D2FE'];
            const dark = '#1f2937';
            let idx = 0;
            const getContrast = (hex: string) => {
                const h = hex.replace('#','');
                const r = parseInt(h.substring(0,2),16);
                const g = parseInt(h.substring(2,4),16);
                const b = parseInt(h.substring(4,6),16);
                const lum = (0.299*r+0.587*g+0.114*b)/255;
                return lum > 0.5 ? '#111827' : '#ffffff';
            };
            return (elements || []).map((e) => {
                if (!e || e.isDeleted) return e;
                if (e.type === 'arrow' || e.type === 'line') {
                    return { ...e, strokeColor: e.strokeColor || dark };
                }
                if (e.type === 'text') {
                    // leave text color as-is; if background present, ensure readable
                    return { ...e };
                }
                const fill = palette[idx % palette.length];
                idx++;
                const textColor = getContrast(fill);
                return {
                    ...e,
                    backgroundColor: e.backgroundColor && e.backgroundColor !== 'transparent' ? e.backgroundColor : fill,
                    strokeColor: e.strokeColor || dark,
                    // text elements rendered separately; shapes won't have text
                };
            });
        };
        const convertAndRender = async () => {
            if (diagramDefinition && diagramDefinition.trim()) {
                // Skip if same diagram already applied
                if (lastAppliedDiagramRef.current === diagramDefinition.trim()) {
                    return;
                }
                try {
                    const trimmed = diagramDefinition.trim();
                    console.log("Step 1: Parsing Mermaid to skeleton elements...");
                    let excalidrawElements: any[] = [];
                    if (/^erDiagram\b/i.test(trimmed) || /^mindmap\b/i.test(trimmed)) {
                        const { tryParseErDiagramToSkeleton, tryParseMindmapToSkeleton } = await import('@/hooks/mermaidFallbackParsers');
                        const { convertSkeletonToExcalidrawElements } = await import('@/hooks/convertSkeletonToExcalidrawElements');
                        let skeleton: any[] | null = null;
                        if (/^erDiagram\b/i.test(trimmed)) {
                            skeleton = tryParseErDiagramToSkeleton(trimmed);
                        } else {
                            skeleton = tryParseMindmapToSkeleton(trimmed);
                        }
                        const s = Array.isArray(skeleton) ? skeleton : [];
                        console.log(`Step 1 (fallback) successful. Found ${s.length} skeleton elements.`);
                        console.log("Step 2: Converting skeleton to final Excalidraw elements (fallback)...");
                        excalidrawElements = convertSkeletonToExcalidrawElements(s);
                    } else {
                        const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
                        const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
                        const { elements: skeletonElements } = await parseMermaidToExcalidraw(trimmed);
                        console.log(`Step 1 successful. Found ${skeletonElements.length} skeleton elements.`);
                        console.log("Step 2: Converting skeleton to final Excalidraw elements...");
                        excalidrawElements = convertToExcalidrawElements(skeletonElements);
                    }
                    // Add basic coloring so diagrams aren't monochrome
                    excalidrawElements = colorizeElements(excalidrawElements);
                    console.log("Step 2 successful. Final elements created.");

                    setVisualizationData(excalidrawElements);

                    // Also reflect in the whiteboard feed (append a new block per diagram)
                    try {
                        const blockId = `ai_visualization_${Date.now()}`;
                        const kind = getMermaidType(diagramDefinition);
                        const ts = new Date();
                        const time = ts.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        const summary = `${kind} • ${time}`;
                        addBlock({ id: blockId, type: 'excalidraw', summary, elements: excalidrawElements as any });
                        // Persist to backend if session exists
                        try {
                          const sid = wbSessionId;
                          if (sid) {
                            await apiService.addWhiteboardBlock(sid, { type: 'EXCALIDRAW' as WhiteboardBlockType, summary, data: excalidrawElements });
                          }
                        } catch (persistErr) {
                          console.warn('[Session] Failed to persist whiteboard block:', persistErr);
                        }
                        // Ensure the user is on the whiteboard view
                        try { setActiveView('excalidraw'); } catch {}
                        // Mark as applied for this diagram text
                        lastAppliedDiagramRef.current = diagramDefinition.trim();
                    } catch (feedErr) {
                        console.warn('[Session] Failed to update whiteboard feed with diagram:', feedErr);
                    }

                } catch (error) {
                    console.error("Failed to parse or convert Mermaid to Excalidraw:", error);
                    setVisualizationData([{
                        type: 'text',
                        x: 100, y: 100, width: 400, height: 50,
                        text: `Error rendering diagram:\n${error instanceof Error ? error.message : 'Unknown error'}`,
                        fontSize: 16, strokeColor: '#c92a2a',
                    }]);
                }
            } else {
                setVisualizationData([]);
                lastAppliedDiagramRef.current = null;
            }
        };

        convertAndRender();
    }, [diagramDefinition, setVisualizationData, addBlock, updateBlock, setActiveView, apiService, wbSessionId]);

    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            window.location.href = '/login';
        }
    }, [isLoaded, isSignedIn, router]);

    const shouldInitializeLiveKit = isLoaded && isSignedIn && user?.id;
    const roomName = shouldInitializeLiveKit ? `session-${user.id}` : '';
    const userName = shouldInitializeLiveKit ? (user.emailAddresses[0]?.emailAddress || `user-${user.id}`) : '';

    const {

        room,
        isConnected,
        isLoading,
        connectionError,
        startTask,
        agentIdentity,
        transcriptionMessages,
        startPushToTalk,
        stopPushToTalk,
        livekitUrl,
        livekitToken,
        deleteSessionNow,
        sendBrowserInteraction,
        openNewTab,
        switchTab,
        closeTab,
        sessionManagerSessionId,
    } = useLiveKitSession(
        shouldInitializeLiveKit ? roomName : '',
        shouldInitializeLiveKit ? userName : '',
        courseId || undefined
    );

    // Suggested responses are now rendered inside the Sphere transcript bubble
    const isAgentSpeaking = useSessionStore((s) => s.isAgentSpeaking);
    const isAwaitingAIResponse = useSessionStore((s) => s.isAwaitingAIResponse);
    const isPushToTalkActive = useSessionStore((s) => s.isPushToTalkActive);
    const showWaitingPill = useSessionStore((s) => s.showWaitingPill);

    // Extract the latest transcript for the avatar bubble
    const [latestTranscript, setLatestTranscript] = useState("");
    const transcriptClearTimerRef = useRef<number | null>(null);

    useEffect(() => {
        // When the array of messages changes, get the last one.
        if (transcriptionMessages.length > 0) {
            // The message is formatted as "speaker: text". We just want the text.
            const lastMessage = transcriptionMessages[transcriptionMessages.length - 1];
            const colonIndex = lastMessage.indexOf(':');
            const transcriptText = colonIndex >= 0 ? lastMessage.substring(colonIndex + 1).trim() : lastMessage.trim();
            setLatestTranscript(transcriptText);

            // If AI is currently speaking, keep transcript visible (no auto-clear)
            if (isAgentSpeaking) {
                if (transcriptClearTimerRef.current) {
                    clearTimeout(transcriptClearTimerRef.current);
                    transcriptClearTimerRef.current = null;
                }
            } else {
                // If not speaking, clear after 5s of inactivity
                if (transcriptClearTimerRef.current) {
                    clearTimeout(transcriptClearTimerRef.current);
                }
                transcriptClearTimerRef.current = window.setTimeout(() => {
                    setLatestTranscript("");
                    transcriptClearTimerRef.current = null;
                }, 5000);
            }
        }
        return () => {
            // Do not clear here; speaking effect manages lifecycle
        };
    }, [transcriptionMessages, isAgentSpeaking]);

    // When agent speaking state changes, keep transcript visible during speaking
    // and schedule a short clear after speaking ends
    useEffect(() => {
        if (isAgentSpeaking) {
            if (transcriptClearTimerRef.current) {
                clearTimeout(transcriptClearTimerRef.current);
                transcriptClearTimerRef.current = null;
            }
        } else {
            if (latestTranscript) {
                if (transcriptClearTimerRef.current) {
                    clearTimeout(transcriptClearTimerRef.current);
                }
                // Clear shortly after TTS finishes
                transcriptClearTimerRef.current = window.setTimeout(() => {
                    setLatestTranscript("");
                    transcriptClearTimerRef.current = null;
                }, 3000);
            }
        }
        return () => {
            // no-op cleanup; timers are cleared on re-runs as needed
        };
    }, [isAgentSpeaking, latestTranscript]);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__sessionStore = useSessionStore;
        }
    }, []);

    // Session restoration on initial load
    const restoredRef = useRef<string | null>(null);
    // Create or get whiteboard session (scoped strictly by LiveKit-issued roomName)
    useEffect(() => {
      const init = async () => {
        if (!shouldInitializeLiveKit) return;
        if (wbSessionId) return;
        // Require the actual room name issued by token service (sess-...)
        const roomForPersistence = currentRoomName;
        if (!roomForPersistence) return;
        try {
          const payload: any = { roomName: roomForPersistence };
          if (courseId) payload.courseId = courseId;
          const session = await apiService.createOrGetWhiteboardSession(payload);
          setWbSessionId(session.id);
          // Restore blocks
          try {
            const full = await apiService.getWhiteboardSession(session.id);
            const restored = (full.blocks || []).map((b: any) => {
              if (b.type === 'EXCALIDRAW') return { id: b.id, type: 'excalidraw', summary: b.summary, elements: b.data || [] };
              if (b.type === 'RRWEB') return { id: b.id, type: 'rrweb', summary: b.summary, eventsUrl: b.eventsUrl };
              if (b.type === 'VIDEO') return { id: b.id, type: 'video', summary: b.summary, videoUrl: b.videoUrl };
              return null;
            }).filter(Boolean) as any[];
            if (restored.length) setBlocks(restored);
          } catch (restoreErr) {
            console.warn('[Session] Failed to restore whiteboard blocks:', restoreErr);
          }
        } catch (err) {
          console.warn('[Session] Failed to create/get whiteboard session:', err);
        }
      };
      void init();
    }, [shouldInitializeLiveKit, roomName, currentRoomName, courseId, apiService, wbSessionId, setBlocks]);

    
    

    // LiveKit-only: no per-session URLs or legacy VNC state required
    if (SESSION_DEBUG) console.log(`Zustand Sanity Check: SessionPage re-rendered. Active view is now: '${activeView}'`);

    // No direct VNC interactions; all browser control is over LiveKit data channel now.

    const componentButtons: ButtonConfig[] = [
        { key: 'vnc', label: 'Browser', inactiveImagePath: '/browser-inactive.svg', activeImagePath: '/browser-active.svg' },
        { key: 'excalidraw', label: 'Whiteboard', inactiveImagePath: '/whiteboard-inactive.svg', activeImagePath: '/whiteboard-active.svg' },
    ];

    // Legacy VNC/session-manager flow removed.

    // Legacy cleanup removed.

    // Proactively terminate the browser pod when leaving the session route or tab goes hidden
    useEffect(() => {
        const DELETE_ON_VIS_HIDDEN = (process.env.NEXT_PUBLIC_DELETE_ON_VISIBILITY_HIDDEN || '').toLowerCase() === 'true';
        const onVis = () => {
            try {
                if (DELETE_ON_VIS_HIDDEN && document.visibilityState === 'hidden') {
                    void deleteSessionNow();
                }
            } catch { }
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            document.removeEventListener('visibilitychange', onVis);
            // On route unmount in production, terminate the session
            if (process.env.NODE_ENV === 'production') {
                void deleteSessionNow();

            }
        };
    }, [deleteSessionNow]);

    // No dynamic session creation required on view change.

    if (!isLoaded || isLoading) {
        return <div className="w-full h-full flex items-center justify-center text-white">Initializing Session...</div>;
    }
    if (connectionError) {
        return <div className="w-full h-full flex items-center justify-center text-red-400">Connection Error: {connectionError}</div>;
    }
    if (isIntroActive) {
        return <IntroPage onAnimationComplete={handleIntroComplete} />;
    }

    return (
        <>
            <SignedIn>
                {/* Status pill overlay */}
                {isAwaitingAIResponse ? (
                  <StatusPill message="AI is Thinking..." type="ai" />
                ) : (showWaitingPill ? (
                  <StatusPill message="Waiting for your input..." type="ai" />
                ) : null)}

                <Sphere transcript={latestTranscript} />

                <div className='flex flex-col w-full h-full items-center justify-between'>
                    <SessionContent
                        activeView={activeView}
                        setActiveView={setActiveView}
                        componentButtons={componentButtons}
                        room={room}
                        livekitUrl={livekitUrl}
                        livekitToken={livekitToken}
                        isConnected={isConnected}
                        isDiagramGenerating={isGenerating}
                        sendBrowserInteraction={sendBrowserInteraction}
                        openNewTab={openNewTab}
                        switchTab={switchTab}
                        closeTab={closeTab}
                    />

                    {/* Suggested responses are shown inline with the transcript bubble */}

                    {/* Re-introduced Footer to restore mic and session controls */}
                    <Footer room={room} agentIdentity={agentIdentity || undefined} onMicPress={startPushToTalk} onMicRelease={stopPushToTalk} />
                </div>

                {/* Status overlay removed */}

                {/* Demo role indicator for multi-viewer sessions */}
                <DemoRoleIndicator />
            </SignedIn>

            <SignedOut>
                <div className="w-full h-full flex items-center justify-center text-white">
                    <p>Redirecting to login...</p>
                </div>
            </SignedOut>
        </>
    )
}

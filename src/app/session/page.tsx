"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { MicButton } from '@/components/compositions/MicButton';
import { MessageButton } from '@/components/compositions/MessageButton';
import { StatusPill } from '@/components/compositions/StatusPill';
import type { Room } from 'livekit-client';

import NextDynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { useApiService, WhiteboardBlockType } from '@/lib/api';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { TabManager } from '@/components/session/TabManager';
import Loading from '@/app/(app)/loading';

import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import { DraggableSphereWrapper } from '@/components/session/DraggableSphereWrapper';
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
    // Warmup state
    warmupStarted: boolean;
    warmupCompleted: boolean;
    warmupProgress: number;
}

function SessionContent({ activeView, setActiveView, componentButtons, room, livekitUrl, livekitToken, isConnected, isDiagramGenerating, sendBrowserInteraction, openNewTab, switchTab, closeTab, warmupStarted, warmupCompleted, warmupProgress }: SessionContentProps) {
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
            {/* Top hover navigation hidden on this page */}
            {false && (
              <div className="absolute top-0 left-0 right-0 z-20 h-28 flex justify-center items-start group pointer-events-none">
                <div className="absolute top-0 left-0 right-0 h-6 pointer-events-auto" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} />
                <div className={`absolute top-0 w-12 h-1.5 bg-gray-400/70 rounded-b-full transition-opacity duration-300 ease-in-out ${isBarVisible ? 'opacity-0' : 'opacity-50 group-hover:opacity-100'}`} />
                <div className={`absolute top-0 w-full flex justify-center pointer-events-auto transition-all duration-300 ease-in-out ${isBarVisible ? 'translate-y-5 opacity-100' : '-translate-y-full opacity-0'}`}>
                  <div className="p-0 w-full md:w-1/2 lg:w-1/3 h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center gap-2 px-1 backdrop-blur-sm border border-white/10" />
                </div>
              </div>
            )}

            {/* Whiteboard feed view and other views */}
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0 }}>
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
                                {/* --- MODIFIED SECTION START --- */}
                                <div className="px-3 pb-3 pt-1 select-none flex items-start justify-center gap-2 text-gray-600">
                                  <img
                                    src={
                                      block.type === 'excalidraw' ? '/whiteboard-inactive.svg' :
                                      block.type === 'video' ? '/video-inactive.svg' :
                                      '/video-inactive.svg'
                                    }
                                    alt="block icon"
                                    className="w-4 h-4 opacity-90 mt-1"
                                  />
                                  <div className="flex flex-col text-xs leading-5 text-center">
                                      <span>
                                          {(block as any).summary ||
                                          (block.type === 'excalidraw' ? 'Whiteboard' :
                                          block.type === 'video' ? 'Video' : 'Replay')}
                                      </span>
                                      {/* Conditionally render the details if they exist on the block object */}
                                      {(block as any).details && (
                                          <span className="text-gray-500">
                                              {(block as any).details}
                                          </span>
                                      )}
                                  </div>
                                </div>
                                {/* --- MODIFIED SECTION END --- */}
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
                    transition-transform duration-300 ease-in-out relative
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

                    {/* WARMUP LOADING OVERLAY - Show only when backend sends warmup_started and not yet completed */}
                    {warmupStarted && !warmupCompleted && (
                        <div className="absolute inset-0 z-50">
                            <Loading
                                showProgress={true}
                                customMessage="Building your action plan… stay tuned. "
                                backgroundOpacity="light"
                                progressDuration={30}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function SessionInner() {
    const activeView = useSessionStore((s) => s.activeView);
    const setActiveView = useSessionStore((s) => s.setActiveView);
    const setVisualizationData = useSessionStore((s) => s.setVisualizationData);
    const setBlocks = useSessionStore((s) => s.setBlocks);
    const addBlock = useSessionStore((s) => s.addBlock);
    const updateBlock = useSessionStore((s) => s.updateBlock);
    const courseProgress = useSessionStore((s) => s.courseProgress);
    const setCourseProgress = useSessionStore((s) => s.setCourseProgress);

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
            // Use vibrant, saturated backgrounds with guaranteed dark text
            const backgroundColors = [
                '#FEF3C7', // Light amber
                '#D1FAE5', // Light emerald
                '#DBEAFE', // Light blue
                '#FCE7F3', // Light pink
                '#EDE9FE', // Light purple
                '#E0E7FF', // Light indigo
            ];
            
            // Always use very dark gray for text - ensures readability on all light backgrounds
            const textColor = '#1F2937'; // Gray-800 - very dark, high contrast
            
            // Use medium-dark colors for arrows/lines to stand out
            const lineColor = '#374151'; // Gray-700
            
            let backgroundIndex = 0;
            
            return (elements || []).map((e) => {
                if (!e || e.isDeleted) return e;
                
                // Handle arrows and lines - use dark stroke
                if (e.type === 'arrow' || e.type === 'line') {
                return { 
                    ...e, 
                    strokeColor: e.strokeColor || lineColor,
                    strokeWidth: e.strokeWidth || 2,
                };
                }
                
                // Handle text elements - force dark color for readability
                if (e.type === 'text') {
                return { 
                    ...e,
                    strokeColor: textColor, // Text color
                    opacity: 100,
                };
                }
                
                // Handle shapes (rectangles, ellipses, etc.)
                const bgColor = backgroundColors[backgroundIndex % backgroundColors.length];
                backgroundIndex++;
                
                return {
                ...e,
                // Light background for shape fill
                backgroundColor: e.backgroundColor && e.backgroundColor !== 'transparent' 
                    ? e.backgroundColor 
                    : bgColor,
                // Dark stroke around shapes
                strokeColor: e.strokeColor || lineColor,
                strokeWidth: e.strokeWidth || 2,
                // Ensure opacity is high
                opacity: e.opacity || 100,
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
                        
                        // Build details from centralized courseProgress state (defensive fallbacks)
                        const currentChapter = courseProgress?.currentChapter ?? '?';
                        const totalChapters = courseProgress?.totalChapters ?? '?';
                        const chapterTitle = courseProgress?.chapterTitle ?? '?';
                        const currentPage = courseProgress?.currentPage ?? '?';
                        const totalPages = courseProgress?.totalPages ?? '?';
                        const pageTitle = courseProgress?.pageTitle ?? '?';

                        const courseDetails = `Chap (${currentChapter}/${totalChapters}): ${chapterTitle} • Page (${currentPage}/${totalPages}): ${pageTitle}`;
                        
                        // Add the new block to the Zustand store with the 'details' property
                        addBlock({ 
                            id: blockId, 
                            type: 'excalidraw', 
                            summary, 
                            details: courseDetails, // The new details property
                            elements: excalidrawElements as any 
                        });
                        
                        // Persist to backend if session exists
                        try {
                          const sid = wbSessionId;
                          if (sid) {
                            // Also include the new details in the payload to the backend
                            await apiService.addWhiteboardBlock(sid, { 
                                type: 'EXCALIDRAW' as WhiteboardBlockType, 
                                summary, 
                                details: courseDetails, // Persist details if your API supports it
                                data: excalidrawElements 
                            });
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
        courseId || undefined,
        { spawnAgent: true, spawnBrowser: true }
    );

    // Warmup state (controlled by backend events)
    const [warmupStarted, setWarmupStarted] = useState(false);
    const [warmupCompleted, setWarmupCompleted] = useState(true); // Start as true, only show loading when backend sends warmup_started
    const [warmupProgress, setWarmupProgress] = useState(0);

    // Suggested responses are now rendered inside the Sphere transcript bubble
    const isAgentSpeaking = useSessionStore((s) => s.isAgentSpeaking);
    const isAwaitingAIResponse = useSessionStore((s) => s.isAwaitingAIResponse);
    const isPushToTalkActive = useSessionStore((s) => s.isPushToTalkActive);
    const showWaitingPill = useSessionStore((s) => s.showWaitingPill);

    // Extract the latest transcript for the avatar bubble
    const [latestTranscript, setLatestTranscript] = useState("");
    const transcriptClearTimerRef = useRef<number | null>(null);
    const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const userScrollTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        // When the array of messages changes, get the last one.
        if (transcriptionMessages.length > 0) {
            // The message is formatted as "speaker: text". We just want the text.
            const lastMessage = transcriptionMessages[transcriptionMessages.length - 1];
            const colonIndex = lastMessage.indexOf(':');
            const transcriptText = colonIndex >= 0 ? lastMessage.substring(colonIndex + 1).trim() : lastMessage.trim();
            
            // Only show transcript when AI is speaking
            if (isAgentSpeaking) {
                setLatestTranscript(transcriptText);
                // Clear any pending timer
                if (transcriptClearTimerRef.current) {
                    clearTimeout(transcriptClearTimerRef.current);
                    transcriptClearTimerRef.current = null;
                }
                
                // Auto-scroll logic: scroll to bottom if user hasn't manually scrolled
                requestAnimationFrame(() => {
                    if (transcriptScrollRef.current && !isUserScrolling) {
                        const element = transcriptScrollRef.current;
                        const lineHeight = 24; // Approximate line height in pixels
                        const twoLinesHeight = lineHeight * 2;
                        
                        // Check if content exceeds 2 lines
                        if (element.scrollHeight > twoLinesHeight) {
                            // Smooth scroll to show the latest content
                            element.scrollTo({
                                top: element.scrollHeight,
                                behavior: 'smooth'
                            });
                        }
                    }
                });
            }
        }
        return () => {
            // Do not clear here; speaking effect manages lifecycle
        };
    }, [transcriptionMessages, isAgentSpeaking, isUserScrolling]);

    // When agent speaking state changes, clear transcript immediately when AI stops
    useEffect(() => {
        if (!isAgentSpeaking) {
            // Clear transcript immediately when AI stops speaking
            if (transcriptClearTimerRef.current) {
                clearTimeout(transcriptClearTimerRef.current);
                transcriptClearTimerRef.current = null;
            }
            // Small delay to allow smooth transition
            transcriptClearTimerRef.current = window.setTimeout(() => {
                setLatestTranscript("");
                setIsUserScrolling(false); // Reset scroll state when transcript clears
                transcriptClearTimerRef.current = null;
            }, 500);
        }
        return () => {
            // no-op cleanup; timers are cleared on re-runs as needed
        };
    }, [isAgentSpeaking]);

    // Cleanup scroll timeout on unmount
    useEffect(() => {
        return () => {
            if (userScrollTimeoutRef.current) {
                clearTimeout(userScrollTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__sessionStore = useSessionStore;
        }
    }, []);

    // Listen for warmup events from backend via LiveKit data channel
    useEffect(() => {
        if (!room) return;

        const handleDataReceived = (payload: Uint8Array, participant: any) => {
            try {
                const decoder = new TextDecoder();
                const jsonString = decoder.decode(payload);
                const message = JSON.parse(jsonString);

                console.log('[SessionPage][Warmup] Received event:', message);

                if (message.type === 'warmup_started') {
                    console.log('[SessionPage][Warmup] Backend warmup started');
                    setWarmupStarted(true);
                    setWarmupCompleted(false);
                    setWarmupProgress(0);
                } else if (message.type === 'warmup_progress') {
                    console.log(`[SessionPage][Warmup] Progress: ${Math.round(message.progress)}%`);
                    setWarmupProgress(message.progress);
                } else if (message.type === 'warmup_completed') {
                    console.log('[SessionPage][Warmup] Backend warmup completed!');
                    setWarmupCompleted(true);
                    setWarmupProgress(100);
                } else if (message.type === 'course_progress') {
                    // Producer: update centralized course progress from backend event
                    const p = message.progress || message.payload || message;
                    if (p && typeof p === 'object') {
                        setCourseProgress({
                            currentChapter: p.currentChapter,
                            totalChapters: p.totalChapters,
                            chapterTitle: p.chapterTitle,
                            currentPage: p.currentPage,
                            totalPages: p.totalPages,
                            pageTitle: p.pageTitle,
                        });
                    }
                }
            } catch (e) {
                // Not a warmup event, ignore
            }
        };

        room.on('dataReceived', handleDataReceived);

        // Query warmup status when room connects (in case warmup already started)
        const queryWarmupStatus = async () => {
            try {
                console.log('[SessionPage][Warmup] Querying initial warmup status...');
                await sendBrowserInteraction({ action: 'get_warmup_status' });
            } catch (e) {
                console.warn('[SessionPage][Warmup] Failed to query warmup status:', e);
            }
        };

        // Query status after a short delay to ensure backend is ready
        const queryTimer = setTimeout(queryWarmupStatus, 1000);

        return () => {
            room.off('dataReceived', handleDataReceived);
            clearTimeout(queryTimer);
        };
    }, [room, sendBrowserInteraction, setCourseProgress]);

    // Frontend safety timeout: Always hide warmup screen after 30 seconds, regardless of backend
    useEffect(() => {
        if (!warmupStarted || warmupCompleted) return;

        console.log('[SessionPage][Warmup] Starting frontend 30-second safety timeout...');

        const safetyTimeout = setTimeout(() => {
            console.log('[SessionPage][Warmup] ⏱️ Frontend safety timeout reached (30s) - force completing warmup');
            setWarmupCompleted(true);
            setWarmupProgress(100);
        }, 30000); // 30 seconds

        return () => {
            clearTimeout(safetyTimeout);
        };
    }, [warmupStarted, warmupCompleted]);

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
              if (b.type === 'EXCALIDRAW') return { id: b.id, type: 'excalidraw', summary: b.summary, details: b.details, elements: b.data || [] };
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
        {
            key: 'vnc',
            inactiveImagePath: '/browser-inactive.svg',
            activeImagePath: '/browser-active.svg',
            label: ''
        },
        {
            key: 'excalidraw',
            inactiveImagePath: '/whiteboard-inactive.svg',
            activeImagePath: '/whiteboard-active.svg',
            label: ''
        }
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
        return <Loading />;
    }
    if (connectionError) {
        return <div className="w-full h-full flex items-center justify-center text-red-400">Connection Error: {connectionError}</div>;
    }
    if (isIntroActive) {
        return <IntroPage onAnimationComplete={handleIntroComplete} />;
    }

    // Calculate initial sphere position to align with mic button's x-axis
    const calculateInitialSpherePosition = () => {
        if (typeof window === 'undefined') return { x: 100, y: 100 };
        
        const BUTTON_RIGHT = 10; // Same as mic button position
        const MIC_BUTTON_WIDTH = 56; // MicButton width
        const minDimension = Math.min(window.innerWidth, window.innerHeight);
        const sphereSize = minDimension * 0.5 * 1.2; // Match DraggableSphereWrapper calculation (sizePercentage=0.25)
        
        // Position sphere to align with mic button's x-axis (right side)
        // Mic button center x = window.innerWidth - BUTTON_RIGHT - (MIC_BUTTON_WIDTH / 2)
        // Sphere should be centered on same x, so: sphereX = micButtonCenterX - (sphereSize / 2)
        const micButtonCenterX = window.innerWidth - BUTTON_RIGHT - (MIC_BUTTON_WIDTH / 2);
        const sphereX = micButtonCenterX - (sphereSize / 2);
        
        // Position at top with some padding
        const sphereY = 50;
        
        return { x: sphereX, y: sphereY };
    };

    return (
        <>
            <SignedIn>
                <DraggableSphereWrapper 
                    initialPosition={calculateInitialSpherePosition()}
                    sizePercentage={0.5}
                    containerScale={1}
                />

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
                        warmupStarted={warmupStarted}
                        warmupCompleted={warmupCompleted}
                        warmupProgress={warmupProgress}
                    />

                    {/* Bottom Controls Bar - All aligned on same axis */}
                    {(() => {
                        const BOTTOM_PADDING = 48;
                        const SIDE_PADDING = 48;
                        const BUTTON_GAP = 12;
                        const NAV_ICON_SIZE = 24;
                        const NAV_BUTTON_HEIGHT = 56;
                        
                        return (
                            <div
                                className="fixed w-full flex items-center justify-between px-12"
                                style={{ bottom: BOTTOM_PADDING, left: 0, right: 0, zIndex: 70 }}
                            >
                                {/* Left side: Transcript or Status Pill */}
                                <div className="flex-1 flex items-center" style={{ maxWidth: '85%' }}>
                                    {latestTranscript ? (
                                        <div className="w-full pointer-events-auto">
                                            <div className="flex items-center justify-start min-h-[48px] max-h-[96px] bg-[#E9EBFD] border border-[#E9EBFD] rounded-full px-6 py-3 overflow-hidden">
                                                <div 
                                                    ref={transcriptScrollRef}
                                                    className="text-[#394169] text-base font-medium overflow-y-auto w-full pr-2 custom-scrollbar"
                                                    style={{ 
                                                        maxHeight: '72px', // 3 lines * 24px line height
                                                        lineHeight: '24px',
                                                        scrollbarWidth: 'thin',
                                                        scrollbarColor: '#566FE9 transparent'
                                                    }}
                                                    onScroll={(e) => {
                                                        const element = e.currentTarget;
                                                        const isAtBottom = Math.abs(element.scrollHeight - element.scrollTop - element.clientHeight) < 5;
                                                        
                                                        // If user scrolls up (not at bottom), mark as user scrolling
                                                        if (!isAtBottom) {
                                                            setIsUserScrolling(true);
                                                            
                                                            // Clear existing timeout
                                                            if (userScrollTimeoutRef.current) {
                                                                clearTimeout(userScrollTimeoutRef.current);
                                                            }
                                                            
                                                            // Reset user scrolling flag after 3 seconds of no scroll
                                                            userScrollTimeoutRef.current = window.setTimeout(() => {
                                                                setIsUserScrolling(false);
                                                            }, 3000);
                                                        } else {
                                                            // User scrolled to bottom, resume auto-scroll
                                                            setIsUserScrolling(false);
                                                            if (userScrollTimeoutRef.current) {
                                                                clearTimeout(userScrollTimeoutRef.current);
                                                                userScrollTimeoutRef.current = null;
                                                            }
                                                        }
                                                    }}
                                                >
                                                    {latestTranscript}
                                                </div>
                                            </div>
                                        </div>
                                    ) : isAwaitingAIResponse ? (
                                        <div className="pointer-events-none">
                                            <div className="inline-flex items-center h-[48px] bg-[#F6F6FE] border border-[#E9EBFD] rounded-full pl-1 pr-4 gap-[10px]">
                                                <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#566FE9]">
                                                    <img src="/listen.svg" alt="AI is Thinking" className="w-5 h-5 animate-pulse" />
                                                </div>
                                                <span className="font-semibold text-base leading-5 text-[#566FE9] whitespace-nowrap">
                                                    AI is Thinking...
                                                </span>
                                            </div>
                                        </div>
                                    ) : showWaitingPill ? (
                                        <div className="pointer-events-none">
                                            <div className="inline-flex items-center h-[48px] bg-[#F6F6FE] border border-[#E9EBFD] rounded-full pl-1 pr-4 gap-[10px]">
                                                <div className="flex items-center justify-center w-[40px] h-[40px] rounded-full bg-[#566FE9]">
                                                    <img src="/general.svg" alt="Waiting for input" className="w-5 h-5" />
                                                </div>
                                                <span className="font-semibold text-base leading-5 text-[#566FE9] whitespace-nowrap">
                                                    Waiting for your input...
                                                </span>
                                            </div>
                                        </div>
                                    ) : null}
                                </div>

                                {/* Right side: Control Buttons */}
                                <div className="flex items-center" style={{ gap: BUTTON_GAP }}>
                                    {/* Compact Nav: Browser / Whiteboard */}
                                    <div className="hidden md:flex items-center bg-white/80 backdrop-blur-sm border border-[#c7ccf8] rounded-full px-2 py-2 mr-2 gap-2">
                                        {componentButtons.map(({ key, label, inactiveImagePath, activeImagePath }) => (
                                            <button
                                                key={key}
                                                onClick={() => setActiveView(key)}
                                                className={`flex items-center justify-center rounded-full transition-all ${
                                                    activeView === key ? 'bg-[#566FE9]' : 'bg-transparent hover:bg-[#e9ebfd]/50'
                                                }`}
                                                title={label}
                                                style={{ width: NAV_BUTTON_HEIGHT, height: NAV_BUTTON_HEIGHT }}
                                            >
                                                <img
                                                    src={activeView === key ? activeImagePath : inactiveImagePath}
                                                    alt={label}
                                                    className="shrink-0"
                                                    style={{ width: NAV_ICON_SIZE, height: NAV_ICON_SIZE }}
                                                />
                                            </button>
                                        ))}
                                    </div>

                                    {/* Action Buttons */}
                                    <MicButton onPress={startPushToTalk} onRelease={stopPushToTalk} />
                                   
                                    {/* <MessageButton onClick={() => {}} hasNotification={false} /> */}
                                </div>
                            </div>
                        );
                    })()}
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

export default function Session() {
    return (
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-white">Loading...</div>}>
            <SessionInner />
        </Suspense>
    );
}
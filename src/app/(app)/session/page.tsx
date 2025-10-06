"use client";

import React, { useState, useEffect, useRef } from 'react';
import Footer from '@/components/Footer';
import type { Room } from 'livekit-client';

import NextDynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { TabManager } from '@/components/session/TabManager';

import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sphere from '@/components/Sphere';
import SuggestedResponses from '@/components/session/SuggestedResponses';
import { DemoRoleIndicator } from '@/components/session/DemoRoleIndicator';

// Excalidraw and Mermaid conversion libs are imported dynamically in the effect below

const IntroPage = NextDynamic(() => import('@/components/session/IntroPage'));

const ExcalidrawBlockView = NextDynamic<{ initialElements: any[] }>(() => import('@/components/session/ExcalidrawBlockView'), { ssr: false });
const RrwebBlockView = NextDynamic<{ eventsUrl: string }>(() => import('@/components/session/RrwebBlockView'), { ssr: false });
const VideoBlockView = NextDynamic<{ videoUrl: string }>(() => import('@/components/session/VideoBlockView'), { ssr: false });
const LiveKitViewer = NextDynamic(() => import('@/components/session/LiveKitViewer'), { ssr: false });
const MessageDisplay = NextDynamic(() => import('@/components/session/MessageDisplay'), { ssr: false });

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


    return (
        <div className='w-full h-full flex flex-col relative'>
            {/* Hover-activated navigation bar container */}
            <div
                className="absolute top-0 left-0 right-0 z-20 h-28 flex justify-center items-start group pointer-events-none"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
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
                </div>
            </div>

            {/* Whiteboard feed view and other views */}
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0, paddingBottom: '8.5rem' }}>
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full relative overflow-y-auto`}>
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

    const [isIntroActive, setIsIntroActive] = useState(true);
    // Centralized diagramDefinition and generation state from store
    const diagramDefinition = useSessionStore((s) => s.diagramDefinition);
    const isGenerating = useSessionStore((s) => s.isDiagramGenerating);
    const SESSION_DEBUG = false;

    const handleIntroComplete = () => setIsIntroActive(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const courseId = searchParams.get('courseId');

    useEffect(() => {
        const convertAndRender = async () => {
            if (diagramDefinition && diagramDefinition.trim()) {
                try {
                    console.log("Step 1: Parsing Mermaid to skeleton elements...");
                    const { parseMermaidToExcalidraw } = await import('@excalidraw/mermaid-to-excalidraw');
                    const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
                    const { elements: skeletonElements } = await parseMermaidToExcalidraw(diagramDefinition);
                    console.log(`Step 1 successful. Found ${skeletonElements.length} skeleton elements.`);

                    console.log("Step 2: Converting skeleton to final Excalidraw elements...");
                    const excalidrawElements = convertToExcalidrawElements(skeletonElements);
                    console.log("Step 2 successful. Final elements created.");

                    setVisualizationData(excalidrawElements);

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
            }
        };

        convertAndRender();
    }, [diagramDefinition, setVisualizationData]);

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
        statusMessages,
        selectSuggestedResponse,
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

    // Only mount SuggestedResponses when there are suggestions
    const hasSuggestions = useSessionStore((s) => s.suggestedResponses.length > 0);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            (window as any).__sessionStore = useSessionStore;
        }
    }, []);

    // Session restoration on initial load
    const restoredRef = useRef < string | null > (null);
    useEffect(() => {
        const sid = sessionManagerSessionId || null;
        if (!sid || restoredRef.current === sid) return;
        restoredRef.current = sid;
        (async () => {
            try {
                const resp = await fetch(`/api/session-state/${sid}`, { cache: 'no-store' });
                if (!resp.ok) return;
                const data = await resp.json();
                if (data && Array.isArray(data.blocks)) {
                    setBlocks(data.blocks);
                }
            } catch { }
        })();
    }, [sessionManagerSessionId, setBlocks]);


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
                <Sphere />

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

                    {hasSuggestions && (
                        <SuggestedResponses onSelect={selectSuggestedResponse} />
                    )}

                    {/* Re-introduced Footer to restore mic and session controls */}
                    <Footer room={room} agentIdentity={agentIdentity || undefined} />
                </div>

                {isConnected && (
                    <MessageDisplay
                        transcriptionMessages={transcriptionMessages || []}
                        statusMessages={statusMessages || []}
                    />
                )}

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
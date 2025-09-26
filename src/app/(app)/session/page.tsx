"use client";

import React, { useState, useEffect } from 'react';
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

// Excalidraw and Mermaid conversion libs are imported dynamically in the effect below

const IntroPage = NextDynamic(() => import('@/components/session/IntroPage'));

const ExcalidrawWrapper = NextDynamic(() => import('@/components/session/ExcalidrawWrapper'), { ssr: false });
const LiveKitViewer = NextDynamic(() => import('@/components/session/LiveKitViewer'), { ssr: false });

const VideoViewer = NextDynamic(() => import('@/components/session/VideoViewer'), { ssr: false });
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
    return (
        <div className='w-full h-full flex flex-col'>
            <div className="w-full flex justify-center pt-[20px] pb-[20px] flex-shrink-0">
                <div className="p-0 w-full md:w-1/2 lg/w-1/3 h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center">
                    {componentButtons.map(({ key, label, inactiveImagePath, activeImagePath }) => (
                        <button
                            key={key}
                            onClick={() => setActiveView(key)}
                            className={`w-[32.5%] h-[45px] flex items-center justify-center gap-2 rounded-full border-transparent font-jakarta-sans font-semibold-600 text-sm transition-all duration-200 ${activeView === key ? 'bg-[#566FE9] text-[#ffffff]' : 'text-[#566FE9] bg-transparent'}`}
                        >
                            <img src={activeView === key ? activeImagePath : inactiveImagePath} alt={label} className="w-[20px] h-[20px]" />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            {/* MODIFICATION: Always render Excalidraw and overlay loader */}
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0, paddingBottom: '8.5rem' }}>
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full relative`}>
                    <ExcalidrawWrapper />
                    {isDiagramGenerating && (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
                            <p>Generating Diagram...</p>
                        </div>
                    )}
                </div>
                <div className={`${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full flex flex-col`}>
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
                <div className={`${activeView === 'video' ? 'block' : 'hidden'} w-full h-full`}>
                    <VideoViewer />
                </div>
            </div>
        </div>
    );
}

export default function Session() {
    const activeView = useSessionStore((s) => s.activeView);
    const setActiveView = useSessionStore((s) => s.setActiveView);
    const setVisualizationData = useSessionStore((s) => s.setVisualizationData);

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

    // (Removed duplicate useLiveKitSession destructuring; see below for the canonical instance)

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

    
    // LiveKit-only: no per-session URLs or legacy VNC state required
    if (SESSION_DEBUG) console.log(`Zustand Sanity Check: SessionPage re-rendered. Active view is now: '${activeView}'`);

    // No direct VNC interactions; all browser control is over LiveKit data channel now.

    const componentButtons: ButtonConfig[] = [
        { key: 'vnc', label: 'Browser', inactiveImagePath: '/browser-inactive.svg', activeImagePath: '/browser-active.svg' },
        { key: 'excalidraw', label: 'Whiteboard', inactiveImagePath: '/whiteboard-inactive.svg', activeImagePath: '/whiteboard-active.svg' },
        { key: 'video', label: 'Video', inactiveImagePath: '/video-inactive.svg', activeImagePath: '/video-active.svg' },
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
            } catch {}
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
            </SignedIn>
            
            <SignedOut>
                <div className="w-full h-full flex items-center justify-center text-white">
                    <p>Redirecting to login...</p>
                </div>
            </SignedOut>
        </>
    )
}

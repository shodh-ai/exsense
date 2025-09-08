"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Footer from '@/components/Footer';
import { Room } from 'livekit-client';

import dynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';

import { useMermaidVisualization } from '@/hooks/useMermaidVisualization';
import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sphere from '@/components/Sphere';
import SuggestedResponses from '@/components/session/SuggestedResponses';

// --- MODIFICATION: Import BOTH converters (removed MermaidDirectRenderer import) ---
import { parseMermaidToExcalidraw } from '@excalidraw/mermaid-to-excalidraw';

const IntroPage = dynamic(() => import('@/components/session/IntroPage'));

const ExcalidrawWrapper = dynamic(() => import('@/components/session/ExcalidrawWrapper'), { ssr: false });
const LiveKitViewer = dynamic(() => import('@/components/session/LiveKitViewer'), { ssr: false });

const VideoViewer = dynamic(() => import('@/components/session/VideoViewer'), { ssr: false });
const MessageDisplay = dynamic(() => import('@/components/session/MessageDisplay'), { ssr: false });

const fallbackRoom = new Room();
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

    livekitUrl: string;
    livekitToken: string;
    diagramDefinition: string;
    isDiagramGenerating: boolean;
    onDiagramUpdate: (definition: string) => void;
}

function SessionContent({ activeView, setActiveView, componentButtons, livekitUrl, livekitToken, diagramDefinition, isDiagramGenerating, onDiagramUpdate }: SessionContentProps) {
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

            {/* MODIFICATION: Added paddingBottom and proper overflow handling for scroll */}
            <div className="flex-1 w-full overflow-hidden" style={{ minHeight: 0, paddingBottom: '8.5rem' }}>
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full`}>
                    {isDiagramGenerating && (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>Generating Diagram...</p>
                        </div>
                    )}
                    {!isDiagramGenerating && <ExcalidrawWrapper />}
                </div>
                <div className={`${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full`}>
                    {livekitUrl && livekitToken ? (
                        <LiveKitViewer url={livekitUrl} token={livekitToken} />
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
    const [diagramDefinition, setDiagramDefinition] = useState('');
    const [generationStatus, setGenerationStatus] = useState<'idle' | 'streaming' | 'finished' | 'error'>('idle');

    const handleIntroComplete = () => setIsIntroActive(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();

    const courseId = searchParams.get('courseId');

    // --- MODIFICATION: The two-step conversion logic is restored ---
    useEffect(() => {
        const convertAndRender = async () => {
            if (diagramDefinition && diagramDefinition.trim()) {
                try {
                    console.log("Step 1: Parsing Mermaid to skeleton elements...");
                    const { elements: skeletonElements } = await parseMermaidToExcalidraw(diagramDefinition);
                    console.log(`Step 1 successful. Found ${skeletonElements.length} skeleton elements.`);

                    console.log("Step 2: Dynamically importing and converting to final Excalidraw elements...");
                    const { convertToExcalidrawElements } = await import('@excalidraw/excalidraw');
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
    
    // Initialize Mermaid visualization hook
    const { 
        diagramDefinition, 
        isStreaming, 
        error: mermaidError, 
        startVisualization, 
        clearDiagram, 
        updateDiagram 
    } = useMermaidVisualization();

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
                        livekitUrl={livekitUrl}
                        livekitToken={livekitToken}
                        diagramDefinition={diagramDefinition}
                        onDiagramUpdate={updateDiagram}
                    />

                    {hasSuggestions && (
                        <SuggestedResponses onSelect={selectSuggestedResponse} />
                    )}
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

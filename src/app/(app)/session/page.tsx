"use client";

import React, { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import { Room } from 'livekit-client';

import { AgentTestPanel } from '@/components/session/AgentTestPanel';
import dynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import Sphere from '@/components/Sphere';

// File: exsense/src/app/session/page.tsx



const IntroPage = dynamic(() => import('@/components/session/IntroPage'));
const ExcalidrawWrapper = dynamic(() => import('@/components/session/ExcalidrawWrapper'), { ssr: false });
const VncViewer = dynamic(() => import('@/components/session/VncViewer'), { ssr: false });
const VideoViewer = dynamic(() => import('@/components/session/VideoViewer'), { ssr: false });

// Fallback room for when LiveKit is not connected
const fallbackRoom = new Room();
type ViewKey = ReturnType<typeof useSessionStore.getState>['activeView'];

// Define a type for button configuration, including both active and inactive icon paths
interface ButtonConfig {
    key: ViewKey;
    label: string;
    inactiveImagePath: string; // Path for icon when button is inactive
    activeImagePath: string;   // Path for icon when button is active
}

// SessionContent component to render the main session UI
interface SessionContentProps {
    activeView: ViewKey;
    setActiveView: (view: ViewKey) => void;
    componentButtons: ButtonConfig[];
    vncUrl: string;
}

function SessionContent({ activeView, setActiveView, componentButtons, vncUrl }: SessionContentProps) {
    return (
        <div className='w-full h-full flex flex-col items-center justify-between'>
            <div className="w-full flex justify-center pt-[20px]">
                <div className="p-0 w-full md:w-1/2 lg:w-1/3 h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center">
                    {componentButtons.map(({ key, label, inactiveImagePath, activeImagePath }) => (
                        <button
                            key={key}
                            onClick={() => setActiveView(key)}
                            className={`w-[32.5%] h-[45px] flex items-center justify-center gap-2 rounded-full border-transparent font-jakarta-sans font-semibold-600 text-sm transition-all duration-200 ${activeView === key ? 'bg-[#566FE9] text-[#ffffff]' : 'text-[#566FE9] bg-transparent'}`}
                        >
                            <img
                                src={activeView === key ? activeImagePath : inactiveImagePath}
                                alt={label}
                                className="w-[20px] h-[20px]"
                            />
                            {label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-grow relative w-full h-full">
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full`}>
                    <ExcalidrawWrapper />
                </div>
                <div className={`${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full`}>
                    <VncViewer url={vncUrl} />
                </div>
                <div className={`${activeView === 'video' ? 'block' : 'hidden'} w-full h-full`}>
                    <VideoViewer />
                </div>
            </div>
            <div className="w-full h-[60px] flex-shrink-0">
                <Footer />
            </div>
        </div>
    );
}

export default function Session() {
    const { activeView, setActiveView } = useSessionStore();
    const [isIntroActive, setIsIntroActive] = useState(true);
    const handleIntroComplete = () => setIsIntroActive(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    
    // Redirect to login if not authenticated
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            router.push('/login');
        }
    }, [isLoaded, isSignedIn, router]);
    
    // Generate unique room and user identifiers using Clerk user data
    const roomName = `session-${user?.id || Date.now()}`;
    const userName = user?.emailAddresses[0]?.emailAddress || `student-${Date.now()}`;
    
    // Initialize LiveKit session
    const {
        room,
        isConnected,
        isLoading,
        connectionError,
        startTask
    } = useLiveKitSession(roomName, userName);
    
    const vncUrl = `ws://localhost:6901`;

    console.log(`Zustand Sanity Check: SessionPage re-rendered. Active view is now: '${activeView}'`);

    const componentButtons: ButtonConfig[] = [
        {
            key: 'vnc',
            label: 'Browser',
            inactiveImagePath: '/browser-inactive.svg',
            activeImagePath: '/browser-active.svg'
        },
        {
            key: 'excalidraw',
            label: 'Whiteboard',
            inactiveImagePath: '/whiteboard-inactive.svg',
            activeImagePath: '/whiteboard-active.svg'
        },
        {
            key: 'video',
            label: 'Video',
            inactiveImagePath: '/video-inactive.svg',
            activeImagePath: '/video-active.svg'
        },
    ];

    // Show loading while Clerk is initializing
    if (!isLoaded) {
        return <div className="w-full h-full flex items-center justify-center text-white">Loading...</div>;
    }
    
    // Show loading while LiveKit is initializing
    if (isLoading) {
        return <div className="w-full h-full flex items-center justify-center text-white">Initializing Session...</div>;
    }
    if (connectionError) {
        return <div className="w-full h-full flex items-center justify-center text-red-400">Connection Error: {connectionError}</div>;
    }
    if (isIntroActive) {
        return <IntroPage onAnimationComplete={handleIntroComplete} />;
    }

    return (
        <SignedIn>

            <Sphere />
            <div className='flex flex-col w-full h-full items-center justify-between'>
                <SessionContent 
                    activeView={activeView} 
                    setActiveView={setActiveView} 
                    componentButtons={componentButtons} 
                    vncUrl={vncUrl} 
                />
            </div>
            <AgentTestPanel />
        </SignedIn>
    )
}

"use client";

import React, { useState, useEffect } from 'react';
import Footer from '@/components/Footer';
import { Room } from 'livekit-client';

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

// ------------------- MODIFIED COMPONENT START -------------------

function SessionContent({ activeView, setActiveView, componentButtons, vncUrl }: SessionContentProps) {
    return (
        // Added `relative` to this container to act as a positioning context for the absolute navbar
        <div className='w-full h-full flex flex-col items-center justify-between relative'>
            
            {/* Hoverable Navigation Bar Container */}
            {/* This container is the invisible "hot zone" at the top of the screen */}
            {/* It uses `group` to control the visibility of the child navigation bar on hover */}
            <div className="group absolute top-0 left-0 right-0 z-50 flex justify-center pt-4 pb-4">
                {/* The actual navigation bar */}
                {/* It's hidden by default (`-translate-y-full opacity-0`) */}
                {/* On hover of the parent `group`, it becomes visible (`group-hover:translate-y-0 group-hover:opacity-100`) */}
                <div className="p-0 w-full md:w-1/2 lg:w-1/3 h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center backdrop-blur-sm shadow-lg
                                transform -translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100 
                                transition-all duration-300 ease-in-out">
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

            {/* The main content area now takes up the full height, as the navbar floats above it */}
            <div className="flex-grow relative w-full h-[90%] border-2 border-red-500">
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-[90%] justify-center items-center border-2 border-green-500 `}>
                    <ExcalidrawWrapper />
                </div>
                <div className={`${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full`}>
                    <VncViewer url={vncUrl} />
                </div>
                <div className={`${activeView === 'video' ? 'block' : 'hidden'} w-full h-full`}>
                    <VideoViewer />
                </div>
            </div>
            
        </div>
    );
}

// ------------------- MODIFIED COMPONENT END -------------------

export default function Session() {
    const { activeView, setActiveView } = useSessionStore();
    const [isIntroActive, setIsIntroActive] = useState(true);
    const handleIntroComplete = () => setIsIntroActive(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    
    // Add debugging for authentication state
    useEffect(() => {
        console.log('Session page auth state:', { isLoaded, isSignedIn, userId: user?.id });
    }, [isLoaded, isSignedIn, user?.id]);
    
    // Redirect to login if not authenticated (after Clerk has loaded)
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            console.log('User not authenticated, redirecting to login');
            // Use window.location.href to force a complete page refresh
            // This helps resolve Clerk authentication state synchronization issues
            const timeoutId = setTimeout(() => {
                if (!isSignedIn) {
                    console.log('Authentication state still not synced, forcing redirect to login');
                    window.location.href = '/login';
                }
            }, 2000); // Increased timeout to 2 seconds for better state settling
            
            return () => clearTimeout(timeoutId);
        }
    }, [isLoaded, isSignedIn, router]);
    
    // Wait for authentication to settle before initializing LiveKit
    const shouldInitializeLiveKit = isLoaded && isSignedIn && user?.id;
    
    // Generate unique room and user identifiers using Clerk user data
    const roomName = shouldInitializeLiveKit ? `session-${user.id}` : `session-${Date.now()}`;
    const userName = shouldInitializeLiveKit ? (user.emailAddresses[0]?.emailAddress || user.username || `user-${user.id}`) : `student-${Date.now()}`;
    
    // Initialize LiveKit session only when authenticated
    const {
        room,
        isConnected,
        isLoading,
        connectionError,
        startTask
    } = useLiveKitSession(shouldInitializeLiveKit ? roomName : '', shouldInitializeLiveKit ? userName : '');
    
    const vncUrl = process.env.NEXT_PUBLIC_VNC_WEBSOCKET_URL || 'ws://localhost:6901';

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
    
    // Show loading while authentication is settling
    if (!isLoaded) {
        return <div className="w-full h-full flex items-center justify-center text-white">Loading authentication...</div>;
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
        <>
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
          
            </SignedIn>
            
            <SignedOut>
                <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                        <h2 className="text-xl mb-4">Authentication Required</h2>
                        <p className="mb-4">Please sign in to access the session.</p>
                        <button 
                            onClick={() => router.push('/login')}
                            className="bg-[#566FE9] text-white px-6 py-2 rounded-full hover:bg-[#566FE9]/95 transition"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </SignedOut>
        </>
    )
}
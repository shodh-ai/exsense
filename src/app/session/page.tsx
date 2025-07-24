"use client";

import React, { useState } from 'react';
import Footer from '@/components/Footer';
import { Room } from 'livekit-client';
import { RoomContext } from '@livekit/components-react';
import { RoomAudioRenderer } from '@livekit/components-react';
import { AgentTestPanel } from '@/components/session/AgentTestPanel';
import dynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import Sphere from '@/components/Sphere';

const IntroPage = dynamic(() => import('@/components/session/IntroPage'));
const ExcalidrawWrapper = dynamic(() => import('@/components/session/ExcalidrawWrapper'), { ssr: false });
const VncViewer = dynamic(() => import('@/components/session/VncViewer'), { ssr: false });
const VideoViewer = dynamic(() => import('@/components/session/VideoViewer'), { ssr: false });

const mockRoom = new Room();
type ViewKey = ReturnType<typeof useSessionStore.getState>['activeView'];

// Define a type for button configuration, including both active and inactive icon paths
interface ButtonConfig {
    key: ViewKey;
    label: string;
    inactiveImagePath: string; // Path for icon when button is inactive
    activeImagePath: string;   // Path for icon when button is active
}

export default function Session() {
    const isLoading = false;
    const connectionError = null;
    const vncUrl = `ws://localhost:6901`;
    const { activeView, setActiveView } = useSessionStore();
    const [isIntroActive, setIsIntroActive] = useState(true);
    const handleIntroComplete = () => setIsIntroActive(false);

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
        <RoomContext.Provider value={mockRoom}>
            <RoomAudioRenderer />
            <Sphere />
            <div className='flex flex-col w-full h-full items-center justify-between'>

                <div className='w-full h-full flex flex-col items-center justify-between'>
                    <div className="w-full flex justify-center pt-[40px]">
                        {/* Original Top navigation bar - now centered */}
                        {/* Changed background, border, padding, gap and added rounded-full */}
                        {/* Adjusted width to 457px to perfectly fit 3 buttons of 147px each with 2 gaps of 8px */}
                        <div className="p-2 w-[457px] h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center gap-2 ">
                            {componentButtons.map(({ key, label, inactiveImagePath, activeImagePath }) => (
                                <button
                                    key={key}
                                    onClick={() => setActiveView(key)}
                                    // Updated button classes for fixed size, content alignment, and active/inactive states
                                    className={`w-[147px] h-[45px] flex items-center justify-center gap-2 rounded-full border-transparent font-jakarta-sans font-semibold text-sm transition-all duration-200 ${activeView === key ? 'bg-[#566FE9] text-[#ffffff]' : 'text-[#566FE9] bg-transparent'}`}
                                >
                                    <img
                                        // Dynamically change the image source based on active state
                                        src={activeView === key ? activeImagePath : inactiveImagePath}
                                        alt={label}
                                        className="w-24 h-24" // Set a fixed size for the image
                                    />
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div> {/* End of wrapper div */}

                    {/* --- RENDER AREA --- */}
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
                </div>
                <div className="w-full h-[60px] flex-shrink-0">
                    <Footer />
                </div>
            </div>
            <AgentTestPanel />
        </RoomContext.Provider>
    )
}
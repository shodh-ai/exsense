import React from 'react';
import { MicButton } from '@/components/compositions/MicButton';
import { MusicButton } from '@/components/compositions/MusicButton';
import { UploadButton } from '@/components/compositions/UploadButton';
import { MessageButton } from '@/components/compositions/MessageButton';
import { Room } from 'livekit-client';
import { useSessionStore } from '@/lib/store';

interface FooterProps {
    room?: Room;
    agentIdentity?: string;
    showUploadButtonInFooter?: boolean;
    onUploadClick?: () => void;
    onMessageClick?: () => void;
    hasNotifications?: boolean;
    // --- ADD THIS NEW PROP ---
    showMusicButton?: boolean; // Add this prop to control music button visibility
    // Push-to-talk callbacks
    onMicPress?: () => void | Promise<void>;
    onMicRelease?: () => void | Promise<void>;
}

export default function Footer({ 
    room, 
    agentIdentity, 
    showUploadButtonInFooter, 
    onUploadClick,
    onMessageClick,
    hasNotifications,
    // --- ADD THE PROP TO THE DESTRUCTURING WITH A DEFAULT VALUE ---
    showMusicButton = true,
    onMicPress,
    onMicRelease,
}: FooterProps) {
    // Check if user is a viewer (viewers cannot publish)
    const userRole = useSessionStore((s) => s.userRole);
    const isViewer = userRole === 'viewer';
    return (
        <footer className="absolute bottom-[2%] w-full h-[60px] p-4 z-10">
            <div className="relative w-full h-full">
                <div 
                  className="absolute top-1/2 right-1/2 flex items-center gap-6" 
                  style={{ marginRight: '150px', transform: 'translateY(-50%)' }}
                >
                    {/* Hide interactive controls for viewers */}
                    {!isViewer && (
                        <>
                            <UploadButton
                                isVisible={showUploadButtonInFooter}
                                onClick={onUploadClick}
                            />
                            {/* --- WRAP THE MUSIC BUTTON IN A CONDITIONAL RENDER --- */}
                            {showMusicButton && <MusicButton />}
                            <MicButton onPress={onMicPress} onRelease={onMicRelease} />
                        </>
                    )}
                    {isViewer && (
                        <div className="text-white/60 text-sm font-medium px-4 py-2 bg-white/10 rounded-full">
                            Viewer Mode - Watch Only
                        </div>
                    )}
                </div>
                <div 
                  className="absolute top-1/2 left-1/2" 
                  style={{ marginLeft: '150px', transform: 'translateY(-50%)' }}
                >
                    <MessageButton onClick={onMessageClick} hasNotification={hasNotifications} />
                </div>
            </div>
        </footer>
    );
}


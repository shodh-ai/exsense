import React from 'react';
import { MicButton } from '@/components/MicButton';
import { MusicButton } from '@/components/MusicButton';
import { UploadButton } from '@/components/UploadButton';
import { MessageButton } from '@/components/MessageButton';
import { Room } from 'livekit-client';

interface FooterProps {
    room?: Room;
    agentIdentity?: string;
    showUploadButtonInFooter?: boolean;
    onUploadClick?: () => void;
    onMessageClick?: () => void;
    hasNotifications?: boolean;
    // --- ADD THIS NEW PROP ---
    showMusicButton?: boolean; // Add this prop to control music button visibility
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
}: FooterProps) {
    return (
        <footer className="absolute bottom-[32px] w-full h-[60px] p-4 z-10">
            <div className="relative w-full h-full">
                <div 
                  className="absolute top-1/2 right-1/2 flex items-center gap-6" 
                  style={{ marginRight: '150px', transform: 'translateY(-50%)' }}
                >
                    <UploadButton
                        isVisible={showUploadButtonInFooter}
                        onClick={onUploadClick}
                    />
                    {/* --- WRAP THE MUSIC BUTTON IN A CONDITIONAL RENDER --- */}
                    {showMusicButton && <MusicButton />}
                    <MicButton room={room} agentIdentity={agentIdentity} />
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
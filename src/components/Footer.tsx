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
}

export default function Footer({ 
    room, 
    agentIdentity, 
    showUploadButtonInFooter, 
    onUploadClick,
    onMessageClick,
    hasNotifications 
}: FooterProps) {
    return (
        <footer className="absolute bottom-[32px] w-full h-[60px] p-4 z-10">
            {/* 
              This container is the positioning context. By making it 'relative',
              we can position the button groups absolutely within it.
            */}
            <div className="relative w-full h-full">

                {/* 
                  LEFT GROUP OF BUTTONS
                  - Positioned absolutely relative to the parent.
                  - 'top-1/2' and 'translate-y-[-50%]' vertically center it.
                  - 'right-1/2' brings the right edge of the group to the center line.
                  - 'mr-[150px]' then pushes the entire group 150px to the left of the center line.
                */}
                <div 
                  className="absolute top-1/2 right-1/2 flex items-center gap-6" 
                  style={{ marginRight: '150px', transform: 'translateY(-50%)' }}
                >
                    {/* Buttons are in visual order (left to right) */}
                    <UploadButton
                        isVisible={showUploadButtonInFooter}
                        onClick={onUploadClick}
                    />
                    <MusicButton />
                    <MicButton room={room} agentIdentity={agentIdentity} />
                </div>

                {/* 
                  RIGHT BUTTON (UPLOAD)
                  - Positioned absolutely relative to the parent.
                  - 'top-1/2' and 'translate-y-[-50%]' vertically center it.
                  - 'left-1/2' brings the left edge of the group to the center line.
                  - 'ml-[150px]' then pushes the entire group 150px to the right of the center line.
                */}
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
import React from 'react';
import { MicButton } from '@/components/MicButton';
// 1. Make sure the component is imported correctly
import { FooterSubmitButton } from '@/components/submit'; 
import { MusicButton } from '@/components/MusicButton';

// A simple SVG icon for the initial state of the button.
// You can customize this or use an icon from a library like lucide-react.
const SendIcon = ({ className }: { className?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className={className || "w-5 h-5"}
    >
        <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
);


export default function Footer() {
    return (
        <footer className="absolute bottom-[15px] w-full h-[60px] flex items-center justify-center p-4 text-xs text-gray-400 z-10 ">
            <div className="flex items-center gap-x-16 sm:gap-x-22 md:gap-x-32 lg:gap-x-42">
                <div className="flex items-center gap-x-4 -translate-x-20 sm:-translate-x-24 md:-translate-x-28 lg:-translate-x-32 pr-10">

                    {/* 2. Use the new self-contained button here */}
                    {/* It manages its own state. No props needed! */}
                    <FooterSubmitButton size="icon">
                        <SendIcon />
                    </FooterSubmitButton>
                    
                    <MicButton />
                    <MusicButton />

                </div>
                <div>
                    {/* Your other elements */}
                </div>
            </div>
        </footer>
    );
}
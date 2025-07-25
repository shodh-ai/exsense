"use client";
import React from "react";
import { useSessionStore } from "@/lib/store";
import { musicEventEmitter } from "@/lib/MusicEventEmitter";

// The 'export' keyword is removed from here
const MusicButton = ({ className }: { className?: string }) => {
    // Get mic state in addition to music state to control button availability
    const { 
        isMusicButtonPlaying, 
        setIsMusicButtonPlaying, 
        isMicEnabled, 
        isMicActivatingPending 
    } = useSessionStore();

    // The music button should be disabled if the mic is on or is in the process of turning on.
    const isDisabled = isMicEnabled || isMicActivatingPending;

    const handleToggleMusic = () => {
        // The button's disabled attribute should prevent this, but this is a safeguard.
        if (isDisabled) return; 

        musicEventEmitter.togglePlayback(); // Emit the event to Sphere
        setIsMusicButtonPlaying(!isMusicButtonPlaying); // Toggle global state
    };

    const buttonStyle = !isMusicButtonPlaying ? "bg-[#566FE91A]" : "bg-[#566FE91A]";
    const iconSrc = !isMusicButtonPlaying ? "/musicon.svg" : "/musicoff.svg";
    
    // Set a more descriptive aria-label, especially when disabled.
    const baseAriaLabel = !isMusicButtonPlaying ? "Turn on music" : "Turn off music";
    const ariaLabel = isDisabled ? "Music is disabled while microphone is active" : baseAriaLabel;
    
    // Add styling for the disabled state for better UX.
    const disabledClasses = isDisabled ? 'opacity-50 cursor-not-allowed' : '';

    return (
    
            <button 
                onClick={handleToggleMusic} 
                className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center ... ${buttonStyle} ${disabledClasses} ${className || ''}`} 
                aria-label={ariaLabel}
                disabled={isDisabled}
            >
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};

// Add the default export at the end of the file
export default MusicButton;
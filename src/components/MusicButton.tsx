"use client";
import React from "react";
import { useSessionStore } from "@/lib/store";
import { musicEventEmitter } from "@/lib/MusicEventEmitter";

export const MusicButton = ({ className }: { className?: string }) => {

// File: exsense/src/components/MusicButton.tsx


    const { isMusicButtonPlaying, setIsMusicButtonPlaying } = useSessionStore();

    const handleToggleMusic = () => {
        musicEventEmitter.togglePlayback(); // Emit the event to Sphere
        setIsMusicButtonPlaying(!isMusicButtonPlaying); // Toggle global state
    };

    const buttonStyle = !isMusicButtonPlaying ? "bg-[#566FE91A]" : "bg-[#566FE91A]";
    const iconSrc = !isMusicButtonPlaying ? "/musicon.svg" : "/musicoff.svg";
    const ariaLabel = !isMusicButtonPlaying ? "Turn on music" : "Turn off music";

    return (
    
            <button onClick={handleToggleMusic} className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center ... ${buttonStyle} ${className || ''}`} aria-label={ariaLabel}>
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};

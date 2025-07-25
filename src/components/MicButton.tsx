// START OF FILE MicButton.tsx

"use client";
import React, { JSX, useEffect, useRef } from "react";
import { micEventEmitter } from "@/lib/MicEventEmitter";
import { useSessionStore } from "@/lib/store";
// The musicEventEmitter import is no longer needed here, but we can leave it for now.
import { musicEventEmitter } from "@/lib/MusicEventEmitter"; 

export const MicButton = ({ className }: { className?: string }): JSX.Element => {
    const {
        isMicEnabled,
        setIsMicEnabled,
        isMicActivatingPending,
        setIsMicActivatingPending,
        isMusicButtonPlaying,
        setIsMusicButtonPlaying,
    } = useSessionStore();
    const streamRef = useRef<MediaStream | null>(null);

    // No changes to useEffect hooks
    useEffect(() => {
        const manageMicrophone = async () => {
            if (isMicEnabled && !streamRef.current) {
                try {
                    console.log("Attempting to get microphone access...");
                    const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    streamRef.current = newStream;
                    micEventEmitter.emit(newStream);
                    console.log("Microphone stream obtained and emitted.");
                } catch (err) {
                    console.error("Error accessing microphone:", err);
                    setIsMicEnabled(false);
                    setIsMicActivatingPending(false);
                }
            } else if (!isMicEnabled && streamRef.current) {
                console.log("Stopping microphone stream...");
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                micEventEmitter.emit(null);
                console.log("Microphone stream stopped.");
            }
        };
        manageMicrophone();

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                micEventEmitter.emit(null);
                console.log("Mic stream cleaned up on effect dependency change/unmount.");
            }
        };
    }, [isMicEnabled, setIsMicEnabled, setIsMicActivatingPending]);

    useEffect(() => {
        let activationTimeout: NodeJS.Timeout | null = null;
        if (isMicActivatingPending) {
            activationTimeout = setTimeout(() => {
                setIsMicEnabled(true);
                setIsMicActivatingPending(false);
            }, 3000); 
        }
        return () => {
            if (activationTimeout) clearTimeout(activationTimeout);
        };
    }, [isMicActivatingPending, setIsMicEnabled, setIsMicActivatingPending]);


    const handleMicToggle = () => {
        if (isMicEnabled) {
            setIsMicEnabled(false);
            setIsMicActivatingPending(false); 
            console.log("User turned OFF mic immediately.");
        } else if (!isMicActivatingPending) {
            if (isMusicButtonPlaying) {
                // --- THIS IS THE ONLY CHANGE ---
                // We rely ONLY on the central state. The component playing music will
                // see this change and stop itself. Firing the event was causing a conflict.
                setIsMusicButtonPlaying(false);
                // --- END OF CHANGE ---
                
                console.log("Music state set to OFF. Activating mic.");
            }
            
            setIsMicActivatingPending(true);
        }
    };

    // No changes to JSX
    const buttonStyle = isMicActivatingPending
        ? "bg-orange-500 animate-pulse"
        : !isMicEnabled
            ? "bg-[#566FE9]"
            : "bg-[#566FE91A]"; 

    const iconSrc = !isMicEnabled ? "/mic-off.svg" : "/mic-on.svg";
    const ariaLabel = isMicActivatingPending
        ? "Waiting for microphone to turn on"
        : !isMicEnabled
            ? "Turn on microphone"
            : "Turn off microphone";

    return (
        <button
            onClick={handleMicToggle}
            className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center ... ${buttonStyle} ${className || ''}`}
            aria-label={ariaLabel}
            disabled={isMicActivatingPending}
        >
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};

// END OF FILE MicButton.tsx
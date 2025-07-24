// START OF FILE MicButton.tsx

"use client";
import React, { JSX, useEffect, useRef } from "react";
import { micEventEmitter } from "@/lib/MicEventEmitter";
import { useSessionStore } from "@/lib/store";

export const MicButton = ({ className }: { className?: string }): JSX.Element => {
    const {
        isMicEnabled,
        setIsMicEnabled,
        isMicActivatingPending,
        setIsMicActivatingPending,
    } = useSessionStore();
    const streamRef = useRef<MediaStream | null>(null);

    // Effect to manage microphone stream based on actual mic status (isMicEnabled)
    useEffect(() => {
        const manageMicrophone = async () => {
            if (isMicEnabled && !streamRef.current) {
                try {
                    console.log("Attempting to get microphone access...");
                    const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    streamRef.current = newStream;
                    micEventEmitter.emit(newStream); // Emits the stream
                    console.log("Microphone stream obtained and emitted.");
                } catch (err) {
                    console.error("Error accessing microphone:", err);
                    setIsMicEnabled(false); // Force mic off in store if access fails
                    setIsMicActivatingPending(false); // Also clear pending state
                }
            } else if (!isMicEnabled && streamRef.current) {
                console.log("Stopping microphone stream...");
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                micEventEmitter.emit(null); // Emits null
                console.log("Microphone stream stopped.");
            }
        };
        manageMicrophone();

        // Cleanup function for when component unmounts or isMicEnabled changes
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                micEventEmitter.emit(null);
                console.log("Mic stream cleaned up on effect dependency change/unmount.");
            }
        };
    }, [isMicEnabled, setIsMicEnabled, setIsMicActivatingPending]);

    // Effect: Simulate backend approval for mic activation
    useEffect(() => {
        let activationTimeout: NodeJS.Timeout | null = null;

        if (isMicActivatingPending) {
            console.log("Simulating backend approval: Waiting 3 seconds to activate mic...");
            activationTimeout = setTimeout(() => {
                setIsMicEnabled(true); // Backend command to turn ON mic
                setIsMicActivatingPending(false); // Clear pending state
                console.log("Simulated backend command received: Mic is now ON.");
            }, 3000); // Simulate 3 seconds backend processing time
        }

        return () => {
            if (activationTimeout) {
                clearTimeout(activationTimeout);
                console.log("Cleared activation timeout (e.g., if user cancelled or component unmounted).");
            }
        };
    }, [isMicActivatingPending, setIsMicEnabled, setIsMicActivatingPending]);


    const handleMicToggle = () => {
        if (isMicEnabled) {
            // If mic is currently ON, turn it OFF immediately.
            setIsMicEnabled(false);
            setIsMicActivatingPending(false); // Ensure pending state is also reset
            console.log("User turned OFF mic immediately.");
        } else {
            // If mic is OFF:
            // This condition is now redundant due to `disabled` attribute, but good for clarity.
            if (!isMicActivatingPending) {
                // If not already pending, initiate the pending state.
                setIsMicActivatingPending(true);
                console.log("User wants to turn ON mic. Signaling intent to backend (simulated).");
            }
            // No 'else' block needed here for "already pending" case, as button will be disabled.
        }
    };

    // Determine button style and content based on current states
    const buttonStyle = isMicActivatingPending
        ? "bg-orange-500 animate-pulse" // Orange with pulse for pending
        : !isMicEnabled
            ? "bg-[#566FE9]" // Blue for mic off
            : "bg-[#566FE91A]"; // Light blue/transparent for mic on

    const iconSrc = !isMicEnabled ? "/mic-off.svg" : "/mic-on.svg"; // Icon based on actual mic state
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
            disabled={isMicActivatingPending} // <-- ADDED THIS LINE
        >
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};

// END OF FILE MicButton.tsx
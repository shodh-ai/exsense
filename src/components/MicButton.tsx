// src/components/MicButton.tsx

"use client";
import React, { JSX, useEffect } from "react";
import { useSessionStore } from "@/lib/store";

export const MicButton = ({ className }: { className?: string }): JSX.Element => {
    // 1. Get all the states and actions you need from the global store.
    const {
        isMicEnabled,
        setIsMicEnabled,
        isMicActivatingPending,
        setIsMicActivatingPending,
    } = useSessionStore();

    // 2. This effect simulates the backend approval process.
    //    It only runs when the "pending" state is activated.
    useEffect(() => {
        let activationTimeout: NodeJS.Timeout | null = null;

        if (isMicActivatingPending) {
            console.log("[MicButton] Simulating backend approval: Waiting 3 seconds...");
            activationTimeout = setTimeout(() => {
                // After the delay, we set the final "mic on" state.
                setIsMicEnabled(true);
                // And we clear the pending state.
                setIsMicActivatingPending(false);
                console.log("[MicButton] Simulated backend command received: Mic is now ON.");
            }, 3000); // 3-second simulated delay
        }

        // Cleanup function to prevent issues if the component unmounts
        return () => {
            if (activationTimeout) {
                clearTimeout(activationTimeout);
            }
        };
    }, [isMicActivatingPending, setIsMicEnabled, setIsMicActivatingPending]);


    const handleMicToggle = () => {
        // This is your original, correct logic.
        if (isMicEnabled) {
            // If mic is currently ON, turn it OFF immediately. No pending state needed.
            setIsMicEnabled(false);
            setIsMicActivatingPending(false); // Ensure pending is also reset
            console.log("[MicButton] User intent: Turn OFF mic immediately.");
        } else if (!isMicActivatingPending) {
            // If mic is OFF and not already pending, initiate the pending state.
            setIsMicActivatingPending(true);
            console.log("[MicButton] User intent: Turn ON mic. Signaling intent to backend (simulated).");
        }
    };

    // This UI logic correctly reflects the three possible states.
    const buttonStyle = isMicActivatingPending
        ? "bg-orange-500 animate-pulse" // Orange & pulsing for pending
        : !isMicEnabled
            ? "bg-[#566FE9]" // Blue for mic off
            : "bg-[#566FE91A]"; // Light blue for mic on

    const iconSrc = !isMicEnabled ? "/mic-off.svg" : "/mic-on.svg";
    const ariaLabel = isMicActivatingPending
        ? "Waiting for microphone activation"
        : !isMicEnabled
            ? "Turn on microphone"
            : "Turn off microphone";

    return (
        <button
            onClick={handleMicToggle}
            className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${buttonStyle} ${className || ''}`}
            aria-label={ariaLabel}
            disabled={isMicActivatingPending} // Button is disabled during the pending state
        >
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};
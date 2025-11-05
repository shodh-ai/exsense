// src/components/MicButton.tsx

"use client";
import React, { JSX, useEffect, useRef } from "react";
import { useSessionStore } from "@/lib/store";
import { Room } from "livekit-client";

interface MicButtonProps {
    className?: string;
    room?: Room; // unused with PTT callbacks, kept for compatibility
    agentIdentity?: string; // unused with PTT callbacks, kept for compatibility
    onPress?: () => void | Promise<void>;
    onRelease?: () => void | Promise<void>;
}

export const MicButton = ({ className, onPress, onRelease }: MicButtonProps): JSX.Element => {
    // 1. Get all the states and actions you need from the global store.
    const {
        isMicEnabled,
        setIsMicEnabled,
        isMicActivatingPending,
        setIsMicActivatingPending,
    } = useSessionStore();

    const isPressingRef = useRef(false);

    const handlePointerDown = async () => {
        // Press-to-talk: initiate on press
        if (isMicActivatingPending || isMicEnabled) {
            isPressingRef.current = true;
            return;
        }
        isPressingRef.current = true;
        setIsMicActivatingPending(true);
        console.log("[MicButton][PTT] Press detected. Starting push-to-talk...");
        try { await onPress?.(); } catch (e) { console.error("[MicButton][PTT] onPress error:", e); }
        setIsMicActivatingPending(false);
    };

    const handlePointerUp = async () => {
        if (!isPressingRef.current) return;
        isPressingRef.current = false;
        console.log("[MicButton][PTT] Release detected. Stopping push-to-talk...");
        try { setIsMicEnabled(false); } catch {}
        try { setIsMicActivatingPending(false); } catch {}
        try { await onRelease?.(); } catch (e) { console.error("[MicButton][PTT] onRelease error:", e); }
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
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handlePointerDown}
            onTouchEnd={handlePointerUp}
            className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${buttonStyle} ${className || ''}`}
            aria-label={ariaLabel}
            disabled={isMicActivatingPending} // Button is disabled during the pending state
        >
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};
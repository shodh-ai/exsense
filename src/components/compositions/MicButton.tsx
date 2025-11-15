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
        isAwaitingAIResponse,
    } = useSessionStore();

    const isPressingRef = useRef(false);

    const handlePointerDown = async () => {
        // Prevent interaction while waiting for AI response
        if (isAwaitingAIResponse) {
            console.log("[MicButton][PTT] Cannot activate mic while waiting for AI response");
            return;
        }
        // Press-to-talk: initiate on press
        if (isMicActivatingPending || isMicEnabled || isAwaitingAIResponse) {
            if (isAwaitingAIResponse) {
                console.log("[MicButton][PTT] Press blocked: awaiting agent response.");
            }
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

    // This UI logic correctly reflects the four possible states.
    const buttonStyle = isAwaitingAIResponse
        ? "bg-gray-400 opacity-50" // Gray & semi-transparent when AI is responding
        : isMicActivatingPending
            ? "bg-orange-500 animate-pulse" // Orange & pulsing for pending
            : !isMicEnabled
                ? "bg-[#566FE9]" // Blue for mic off
                : "bg-[#566FE91A]"; // Light blue for mic on

    const cursorStyle = isAwaitingAIResponse ? "cursor-not-allowed" : "cursor-pointer";

    const iconSrc = !isMicEnabled ? "/mic-off.svg" : "/mic-on.svg";
    const ariaLabel = isMicActivatingPending
        ? "Waiting for microphone activation"
        : isAwaitingAIResponse
            ? "Waiting for agent response"
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
            className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${buttonStyle} ${className || ''} ${isAwaitingAIResponse ? 'opacity-50 cursor-not-allowed' : ''}`}
            aria-label={ariaLabel}
            disabled={isMicActivatingPending || isAwaitingAIResponse} // Disable during pending or while awaiting agent response
        >
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};
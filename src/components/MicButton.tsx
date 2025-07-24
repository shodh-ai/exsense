"use client";
import React, { JSX, useEffect, useRef } from "react";
import { micEventEmitter } from "@/lib/MicEventEmitter";
import { useSessionStore } from "@/lib/store";

export const MicButton = ({ className }: { className?: string }): JSX.Element => {
    const { isMicEnabled, setIsMicEnabled } = useSessionStore();
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        const manageMicrophone = async () => {
            if (isMicEnabled && !streamRef.current) {
                try {
                    const newStream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    streamRef.current = newStream;
                    micEventEmitter.emit(newStream); // Emits the stream
                } catch (err) {
                    console.error("Error accessing microphone:", err);
                    setIsMicEnabled(false);
                }
            } else if (!isMicEnabled && streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
                micEventEmitter.emit(null); // Emits null
            }
        };
        manageMicrophone();
    }, [isMicEnabled, setIsMicEnabled]);

    const handleMicToggle = () => setIsMicEnabled(!isMicEnabled);

    const buttonStyle = !isMicEnabled ? "bg-[#566FE9]" : "bg-[#566FE91A]";
    const iconSrc = !isMicEnabled ? "/mic-off.svg" : "/mic-on.svg";
    const ariaLabel = !isMicEnabled ? "Turn on microphone" : "Turn off microphone";

    return (
        <button onClick={handleMicToggle} className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center ... ${buttonStyle} ${className || ''}`} aria-label={ariaLabel}>
            <img className="w-[24px] h-[24px]" alt={ariaLabel} src={iconSrc} />
        </button>
    );
};
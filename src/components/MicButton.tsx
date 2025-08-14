// src/components/MicButton.tsx

"use client";
import React, { JSX, useEffect } from "react";
import { useSessionStore } from "@/lib/store";
import { Room } from "livekit-client";

interface MicButtonProps {
    className?: string;
    room?: Room;
    agentIdentity?: string;
}

export const MicButton = ({ className, room, agentIdentity }: MicButtonProps): JSX.Element => {
    // 1. Get all the states and actions you need from the global store.
    const {
        isMicEnabled,
        setIsMicEnabled,
        isMicActivatingPending,
        setIsMicActivatingPending,
    } = useSessionStore();

    // 2. Helper function to send RPC interrupt to livekit-service
    const sendMicInterruptRPC = async (): Promise<boolean> => {
        if (!room || !agentIdentity) {
            console.error("[MicButton] Room or agent identity not available for RPC");
            return false;
        }

        try {
            console.log("[MicButton] Sending mic interrupt RPC to agent...");
            
            // Send RPC to the agent using the new mic interrupt method
            const response = await room.localParticipant?.performRpc({
                destinationIdentity: agentIdentity,
                method: "rox.interaction.AgentInteraction/student_mic_button_interrupt",
                payload: "", // Empty payload for mic button interrupt
            });

            console.log("[MicButton] RPC response received:", response);
            return true;
        } catch (error) {
            console.error("[MicButton] RPC call failed:", error);
            return false;
        }
    };

    // 3. Helper function to send RPC when user manually stops listening
    const sendStopListeningRPC = async (): Promise<boolean> => {
        if (!room || !agentIdentity) {
            console.error("[MicButton] Room or agent identity not available for stop listening RPC");
            return false;
        }

        try {
            console.log("[MicButton] Sending stop listening RPC to agent...");
            
            // Send RPC to notify agent that user manually stopped listening
            const response = await room.localParticipant?.performRpc({
                destinationIdentity: agentIdentity,
                method: "rox.interaction.AgentInteraction/student_stopped_listening",
                payload: "", // Empty payload for stop listening
            });

            console.log("[MicButton] Stop listening RPC response received:", response);
            return true;
        } catch (error) {
            console.error("[MicButton] Stop listening RPC call failed:", error);
            return false;
        }
    };


    const handleMicToggle = async () => {
        // This is your original, correct logic with RPC integration.
        if (isMicEnabled) {
            // If mic is currently ON, turn it OFF and notify backend
            setIsMicEnabled(false);
            setIsMicActivatingPending(false); // Ensure pending is also reset
            console.log("[MicButton] User intent: Turn OFF mic immediately.");
            
            // Notify backend that user manually stopped listening
            await sendStopListeningRPC();
        } else if (!isMicActivatingPending) {
            // If mic is OFF and not already pending, initiate the pending state and send RPC.
            setIsMicActivatingPending(true);
            console.log("[MicButton] User intent: Turn ON mic. Sending interrupt RPC to agent...");
            
            // Send RPC interrupt to the agent
            const rpcSuccess = await sendMicInterruptRPC();
            
            if (rpcSuccess) {
                // RPC succeeded - agent acknowledged the interrupt
                // Don't enable mic here - wait for backend to send START_LISTENING_VISUAL
                setIsMicActivatingPending(false);
                console.log("[MicButton] Agent acknowledged interrupt. Waiting for backend to enable mic via START_LISTENING_VISUAL.");
            } else {
                // RPC failed - reset pending state
                setIsMicActivatingPending(false);
                console.error("[MicButton] Failed to send interrupt RPC. Mic remains OFF.");
            }
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
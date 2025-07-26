// File: exsense/src/lib/store.ts
// START OF FILE store.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Use 'any' for the API type to avoid complex type issues for now.
type ExcalidrawAPIType = any;
export type SessionView = 'excalidraw' | 'vnc' | 'video' | 'mic' | 'statusbar' | 'intro';

interface SessionState {
    // --- State Properties ---
    activeView: SessionView;
    excalidrawAPI: ExcalidrawAPIType | null;
    agentStatusText: string;
    isAgentSpeaking: boolean;
    isStudentTurn: boolean;
    suggestedStudentTool: string | null;
    isMicEnabled: boolean;
    isMusicButtonPlaying: boolean;
    isMicActivatingPending: boolean; // <-- NEW STATE PROPERTY

    // --- Actions ---
    setActiveView: (view: SessionView) => void;
    setExcalidrawAPI: (api: ExcalidrawAPIType) => void;
    setAgentStatusText: (text: string) => void;
    setIsAgentSpeaking: (isSpeaking: boolean) => void;
    setIsStudentTurn: (isTurn: boolean) => void;
    setSuggestedStudentTool: (tool: string | null) => void;
    setIsMicEnabled: (isEnabled: boolean) => void;
    setIsMusicButtonPlaying: (isPlaying: boolean) => void;
    setIsMicActivatingPending: (isPending: boolean) => void; // <-- NEW ACTION
}

export const useSessionStore = create<SessionState>()(
    devtools( // Wrap with devtools for easy debugging in the browser
        (set) => ({
            // --- Initial State ---
            activeView: 'excalidraw',
            excalidrawAPI: null,
            agentStatusText: 'Initializing...',
            isAgentSpeaking: false,
            isStudentTurn: false,
            suggestedStudentTool: null,
            isMicEnabled: false,
            isMusicButtonPlaying: false,
            isMicActivatingPending: false, // <-- Mic activation not pending by default

            // --- Actions Implementation ---
            setActiveView: (view) => set({ activeView: view }),
            setExcalidrawAPI: (api) => set({ excalidrawAPI: api }),
            setAgentStatusText: (text) => set({ agentStatusText: text }),
            setIsAgentSpeaking: (isSpeaking) => set({ isAgentSpeaking: isSpeaking }),
            setIsStudentTurn: (isTurn) => set({ isStudentTurn: isTurn }),
            setSuggestedStudentTool: (tool) => set({ suggestedStudentTool: tool }),
            setIsMicEnabled: (isEnabled) => set({ isMicEnabled: isEnabled }),
            setIsMusicButtonPlaying: (isPlaying) => set({ isMusicButtonPlaying: isPlaying }),
            setIsMicActivatingPending: (isPending) => set({ isMicActivatingPending: isPending }), // <-- NEW ACTION IMPLEMENTATION
        }),
        { name: "SessionUIStore" }
    )
);

// END OF FILE store.ts
import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
type ExcalidrawAPIType = unknown;
export type SessionView = 'excalidraw' | 'vnc' | 'video' | 'mic' | 'statusbar' | 'intro';

// --- Imprinting phases and curriculum types ---
export type ImprintingPhase =
  | 'SEED_INPUT'
  | 'SEED_PROCESSING'
  | 'REVIEW_DRAFT'
  | 'LO_SELECTION'
  | 'LIVE_IMPRINTING';

export interface Concept {
  name: string;
  content?: string;
}

export interface LearningObjective {
  name: string;
  description?: string;
  scope?: string;
  status?: string;
  concepts: Concept[];
}

// Debrief message structure used across the app
export interface DebriefMessage {
  hypothesis?: string;
  text: string;
}

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
    isMicActivatingPending: boolean;
    visualizationData: any[] | null; // <-- NEW: For store-based visualization communication
    // --- Suggested Responses State ---
    suggestedResponses: { id: string; text: string; reason?: string }[];
    suggestedTitle?: string;

    // --- Imprinting / Session Controller State ---
    imprinting_mode: string; // e.g., 'DEBRIEF_CONCEPTUAL' | 'WORKFLOW' | 'DEBRIEF_PRACTICAL'
    currentLO: string | null;
    // When true, user is in conceptual debrief flow and allowed to "Show Me"
    conceptualStarted: boolean;

    // --- New Imprinting Flow State ---
    imprintingPhase: ImprintingPhase;
    curriculumDraft: LearningObjective[];

    // --- Actions ---
    setActiveView: (view: SessionView) => void;
    setExcalidrawAPI: (api: ExcalidrawAPIType) => void;
    setAgentStatusText: (text: string) => void;
    setIsAgentSpeaking: (isSpeaking: boolean) => void;
    setIsStudentTurn: (isTurn: boolean) => void;
    setSuggestedStudentTool: (tool: string | null) => void;
    setIsMicEnabled: (isEnabled: boolean) => void;
    setIsMusicButtonPlaying: (isPlaying: boolean) => void;
    setIsMicActivatingPending: (isPending: boolean) => void;
    setVisualizationData: (data: any[] | null) => void; // <-- NEW: Set visualization data for canvas rendering
    // --- Suggested Responses Actions ---
    setSuggestedResponses: (suggestions: { id: string; text: string; reason?: string }[], title?: string) => void;
    clearSuggestedResponses: () => void;

    // --- Imprinting Actions ---
    setImprintingMode: (mode: string) => void;
    setCurrentLO: (lo: string | null) => void;
    setConceptualStarted: (started: boolean) => void;

    // --- New Imprinting Flow Actions ---
    setImprintingPhase: (phase: ImprintingPhase) => void;
    setCurriculumDraft: (draft: LearningObjective[]) => void;

    // --- Debrief message state ---
    debriefMessage: DebriefMessage | null;
    setDebriefMessage: (message: DebriefMessage | null) => void;
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
            isMicActivatingPending: false,
            visualizationData: null, // <-- No visualization data initially
            // --- Suggested Responses defaults ---
            suggestedResponses: [],
            suggestedTitle: undefined,

            // --- Imprinting defaults ---
            imprinting_mode: 'DEBRIEF_CONCEPTUAL',
            currentLO: null,
            conceptualStarted: false,

            // --- New Imprinting Flow defaults ---
            imprintingPhase: 'SEED_INPUT',
            curriculumDraft: [],
            // --- Debrief message defaults ---
            debriefMessage: null,

            // --- Actions Implementation ---
            setActiveView: (view) => set({ activeView: view }),
            setExcalidrawAPI: (api) => set({ excalidrawAPI: api }),
            setAgentStatusText: (text) => set({ agentStatusText: text }),
            setIsAgentSpeaking: (isSpeaking) => set({ isAgentSpeaking: isSpeaking }),
            setIsStudentTurn: (isTurn) => set({ isStudentTurn: isTurn }),
            setSuggestedStudentTool: (tool) => set({ suggestedStudentTool: tool }),
            setIsMicEnabled: (isEnabled) => set({ isMicEnabled: isEnabled }),
            setIsMusicButtonPlaying: (isPlaying) => set({ isMusicButtonPlaying: isPlaying }),
            setIsMicActivatingPending: (isPending) => set({ isMicActivatingPending: isPending }),
            setVisualizationData: (data) => set({ visualizationData: data }), // <-- NEW ACTION IMPLEMENTATION
            // --- Suggested Responses Actions ---
            setSuggestedResponses: (suggestions, title) => set({ suggestedResponses: suggestions, suggestedTitle: title }),
            clearSuggestedResponses: () => set({ suggestedResponses: [], suggestedTitle: undefined }),

            // --- Imprinting Actions ---
            setImprintingMode: (mode) => set({ imprinting_mode: mode }),
            setCurrentLO: (lo) => set({ currentLO: lo }),
            setConceptualStarted: (started) => set({ conceptualStarted: started }),

            // --- New Imprinting Flow Actions ---
            setImprintingPhase: (phase) => set({ imprintingPhase: phase }),
            setCurriculumDraft: (draft) => set({ curriculumDraft: draft }),
            // --- Debrief message action ---
            setDebriefMessage: (message) => set({ debriefMessage: message }),
        }),
        { name: "SessionUIStore" }
    )
);

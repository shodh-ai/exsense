import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

type ExcalidrawAPIType = unknown;
export type SessionView = 'excalidraw' | 'vnc' | 'video' | 'mic' | 'statusbar' | 'intro';

// Represents a generic visualization element used by the Excalidraw integration.
// This is intentionally flexible to accommodate both skeleton elements and
// Excalidraw-ready elements while avoiding explicit `any` types.
export interface VisualizationElement {
  id?: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  // Support both mutable and readonly tuple arrays as used by Excalidraw
  points?: readonly (readonly [number, number])[] | [number, number][];
  startBinding?: { elementId: string; focus?: number; gap?: number } | null;
  endBinding?: { elementId: string; focus?: number; gap?: number } | null;
  isDeleted?: boolean;
  // Allow additional properties that may be provided by upstream generators
  [key: string]: unknown;
}

// --- Whiteboard Feed Types ---
export interface ExcalidrawBlock {
  id: string;
  type: 'excalidraw';
  summary: string;
  elements: VisualizationElement[]; // Excalidraw elements
}

export interface RrwebBlock {
  id: string;
  type: 'rrweb';
  summary: string;
  eventsUrl: string; // URL to fetch rrweb events JSON
}

export interface VideoBlock {
  id: string;
  type: 'video';
  summary: string;
  videoUrl: string; // URL to the video source (iframe src or video file)
}

export type WhiteboardBlock = ExcalidrawBlock | RrwebBlock | VideoBlock;

// --- Browser Tabs ---
export interface BrowserTab {
  id: string;
  name: string;
  url: string;
}

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
    visualizationData: unknown[] | null;
    // New dynamic whiteboard feed blocks (supersedes visualizationData)
    whiteboardBlocks: WhiteboardBlock[];
    // Mermaid diagram definition used as single source of truth for visualization
    diagramDefinition: string;
    // Centralized loading state for diagram generation
    isDiagramGenerating: boolean;
    suggestedResponses: { id: string; text: string; reason?: string }[];
    suggestedTitle?: string;
    isNavigating: boolean; // <-- State for our loader
    // Global loading flag while waiting for AI/imprinter analysis
    isAwaitingAIResponse: boolean;

    // --- Browser tab state ---
    tabs: BrowserTab[];
    activeTabId: string | null;

    // --- Imprinting / Session Controller State ---
    imprinting_mode: string;
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
    setVisualizationData: (data: unknown[] | null) => void;
    // Whiteboard feed actions
    addBlock: (block: WhiteboardBlock) => void;
    updateBlock: (blockId: string, newContent: Partial<ExcalidrawBlock> | Partial<RrwebBlock>) => void;
    setBlocks: (blocks: WhiteboardBlock[]) => void;
    setDiagramDefinition: (definition: string) => void;
    setIsDiagramGenerating: (isGenerating: boolean) => void;
    setSuggestedResponses: (suggestions: { id: string; text: string; reason?: string }[], title?: string) => void;
    clearSuggestedResponses: () => void;
    setIsNavigating: (isNavigating: boolean) => void; // <-- Action for our loader
    setIsAwaitingAIResponse: (isAwaiting: boolean) => void;

    // --- Browser tab actions ---
    addTab: (tab: BrowserTab) => void;
    removeTab: (id: string) => void;
    setActiveTabId: (id: string | null) => void;

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
    devtools(
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
            visualizationData: null,
            whiteboardBlocks: [],
            diagramDefinition: '',
            isDiagramGenerating: false,
            suggestedResponses: [],
            suggestedTitle: undefined,
            isNavigating: false, // <-- Initial state is false
            isAwaitingAIResponse: false,

            // --- Browser tab defaults ---
            tabs: [],
            activeTabId: null,

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
            setVisualizationData: (data) => set({ visualizationData: data }),
            addBlock: (block) => set((state) => ({ whiteboardBlocks: [...state.whiteboardBlocks, block] })),
            updateBlock: (blockId, newContent) => set((state) => ({
              whiteboardBlocks: state.whiteboardBlocks.map((b) => {
                if (b.id !== blockId) return b;
                // Merge content based on block type, preserving id/type
                if (b.type === 'excalidraw') {
                  return { ...b, ...(newContent as Partial<ExcalidrawBlock>) } as ExcalidrawBlock;
                }
                if (b.type === 'rrweb') {
                  return { ...b, ...(newContent as Partial<RrwebBlock>) } as RrwebBlock;
                }
                if (b.type === 'video') {
                  return { ...b, ...(newContent as Partial<VideoBlock>) } as VideoBlock;
                }
                return b;
              })
            })),
            setBlocks: (blocks) => set({ whiteboardBlocks: blocks }),
            setDiagramDefinition: (definition) => set({ diagramDefinition: definition }),
            setIsDiagramGenerating: (isGenerating) => set({ isDiagramGenerating: isGenerating }),
            setSuggestedResponses: (suggestions, title) => set({ suggestedResponses: suggestions, suggestedTitle: title }),
            clearSuggestedResponses: () => set({ suggestedResponses: [], suggestedTitle: undefined }),
            setIsNavigating: (isNavigating) => set({ isNavigating }), // <-- Action implementation
            setIsAwaitingAIResponse: (isAwaiting: boolean) => set({ isAwaitingAIResponse: isAwaiting }),

            // --- Browser tab actions ---
            addTab: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),
            removeTab: (id) => set((state) => ({
              tabs: state.tabs.filter(t => t.id !== id),
              // if removing current active, clear active; caller may select a new one
              activeTabId: state.activeTabId === id ? null : state.activeTabId,
            })),
            setActiveTabId: (id) => set({ activeTabId: id }),

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
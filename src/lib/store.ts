// exsense/src/lib/store.ts

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid'; // You may need to run: npm install uuid

// All your existing type definitions remain the same
type ExcalidrawAPIType = unknown;
export type SessionView = 'excalidraw' | 'vnc' | 'video' | 'mic' | 'statusbar' | 'intro';

export interface VisualizationElement {
  id?: string;
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  text?: string;
  points?: readonly (readonly [number, number])[] | [number, number][];
  startBinding?: { elementId: string; focus?: number; gap?: number } | null;
  endBinding?: { elementId: string; focus?: number; gap?: number } | null;
  isDeleted?: boolean;
  [key: string]: unknown;
}

export interface ExcalidrawBlock {
  id: string;
  type: 'excalidraw';
  summary: string;
  elements: VisualizationElement[] | any[];
}

export interface RrwebBlock {
  id: string;
  type: 'rrweb';
  summary: string;
  eventsUrl: string;
}

export type WhiteboardBlock = ExcalidrawBlock | RrwebBlock;

export interface BrowserTab {
  id: string;
  name: string;
  url: string;
}

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

export interface DebriefMessage {
  hypothesis?: string;
  text: string;
}

interface SessionState {
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
    whiteboardBlocks: WhiteboardBlock[];
    diagramDefinition: string;
    isDiagramGenerating: boolean;
    suggestedResponses: { id: string; text: string; reason?: string }[];
    suggestedTitle?: string;
    isNavigating: boolean;
    isAwaitingAIResponse: boolean;
    replayEventsUrl: string | null;
    tabs: BrowserTab[];
    activeTabId: string | null;
    imprinting_mode: string;
    currentLO: string | null;
    conceptualStarted: boolean;
    imprintingPhase: ImprintingPhase;
    curriculumDraft: LearningObjective[];
    debriefMessage: DebriefMessage | null;
    
    // Actions
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
    addBlock: (block: WhiteboardBlock) => void;
    updateBlock: (blockId: string, newContent: Partial<ExcalidrawBlock> | Partial<RrwebBlock>) => void;
    setBlocks: (blocks: WhiteboardBlock[]) => void;
    setDiagramDefinition: (definition: string) => void;
    setIsDiagramGenerating: (isGenerating: boolean) => void;
    setSuggestedResponses: (suggestions: { id: string; text: string; reason?: string }[], title?: string) => void;
    clearSuggestedResponses: () => void;
    setIsNavigating: (isNavigating: boolean) => void;
    setIsAwaitingAIResponse: (isAwaiting: boolean) => void;
    showReplay: (url: string) => void;
    hideReplay: () => void;
    addTab: (tab: BrowserTab) => void;
    removeTab: (id: string) => void;
    setActiveTabId: (id: string | null) => void;
    setImprintingMode: (mode: string) => void;
    setCurrentLO: (lo: string | null) => void;
    setConceptualStarted: (started: boolean) => void;
    setImprintingPhase: (phase: ImprintingPhase) => void;
    setCurriculumDraft: (draft: LearningObjective[]) => void;
    setDebriefMessage: (message: DebriefMessage | null) => void;
}

// +++ THE FIX: Define the single, default tab that the browser session starts with. +++
const initialTab: BrowserTab = {
  id: uuidv4(), // Give it a unique frontend ID
  name: 'Home', // A user-friendly name
  // This URL MUST match the START_URL environment variable in your backend's Docker container
  url: 'http://localhost:4600', 
};

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
            isNavigating: false,
            isAwaitingAIResponse: false,
            replayEventsUrl: null,

            // +++ APPLY THE FIX HERE +++
            tabs: [initialTab],
            activeTabId: initialTab.id,
            // +++ END OF THE FIX +++

            imprinting_mode: 'DEBRIEF_CONCEPTUAL',
            currentLO: null,
            conceptualStarted: false,
            imprintingPhase: 'SEED_INPUT',
            curriculumDraft: [],
            debriefMessage: null,

            // --- Actions Implementation (Your existing actions are great, no changes needed) ---
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
                if (b.type === 'excalidraw') return { ...b, ...(newContent as Partial<ExcalidrawBlock>) } as ExcalidrawBlock;
                if (b.type === 'rrweb') return { ...b, ...(newContent as Partial<RrwebBlock>) } as RrwebBlock;
                return b;
              })
            })),
            setBlocks: (blocks) => set({ whiteboardBlocks: blocks }),
            setDiagramDefinition: (definition) => set({ diagramDefinition: definition }),
            setIsDiagramGenerating: (isGenerating) => set({ isDiagramGenerating: isGenerating }),
            setSuggestedResponses: (suggestions, title) => set({ suggestedResponses: suggestions, suggestedTitle: title }),
            clearSuggestedResponses: () => set({ suggestedResponses: [], suggestedTitle: undefined }),
            setIsNavigating: (isNavigating) => set({ isNavigating }),
            setIsAwaitingAIResponse: (isAwaiting) => set({ isAwaitingAIResponse: isAwaiting }),
            showReplay: (url) => set({ replayEventsUrl: url }),
            hideReplay: () => set({ replayEventsUrl: null }),

            // --- Browser tab actions ---
            addTab: (tab) => set((state) => ({ tabs: [...state.tabs, tab] })),
            
            removeTab: (id: string) =>
              set((state) => {
                const originalTabs = state.tabs;
                const closingTabIndex = originalTabs.findIndex((t) => t.id === id);
                if (closingTabIndex === -1) return {}; // Tab not found, do nothing
            
                const newTabs = originalTabs.filter((tab) => tab.id !== id);
                let newActiveId = state.activeTabId;
            
                if (state.activeTabId === id) {
                  if (newTabs.length > 0) {
                    const newIndex = Math.min(closingTabIndex, newTabs.length - 1);
                    newActiveId = newTabs[newIndex].id;
                  } else {
                    newActiveId = null; // No tabs left
                  }
                }
            
                return { tabs: newTabs, activeTabId: newActiveId };
              }),
              
            setActiveTabId: (id) => set({ activeTabId: id }),

            // --- Imprinting Actions ---
            setImprintingMode: (mode) => set({ imprinting_mode: mode }),
            setCurrentLO: (lo) => set({ currentLO: lo }),
            setConceptualStarted: (started) => set({ conceptualStarted: started }),
            setImprintingPhase: (phase) => set({ imprintingPhase: phase }),
            setCurriculumDraft: (draft) => set({ curriculumDraft: draft }),
            setDebriefMessage: (message) => set({ debriefMessage: message }),
        }), 
        { name: "SessionUIStore" }
    )
);
// teacher/page.tsx (or your first page file)
// EDITED: This page now initializes the store and uses the new "smart" actions.

"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MicButton } from '@/components/MicButton';
import { UploadButton } from '@/components/UploadButton';
import { MessageButton } from '@/components/MessageButton';
import { Camera, Plus, Timer, Square, Pause, Wand, CheckCircle, Send, Mic, ExternalLink, RefreshCcw } from 'lucide-react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useSessionStore, BrowserTab, DebriefMessage } from '@/lib/store';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { Room } from 'livekit-client';
import { useUser } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sphere from '@/components/Sphere';
import { submitImprintingEpisode, stageAsset, conversationalTurn, conversationalTurnAudio, submitSeed, processSeedDocument, fetchCurriculumDraft, saveSetupScript, finalizeLO } from '@/lib/imprinterService';
import SeedInput from '@/components/imprinting/SeedInput';
import CurriculumEditor from '@/components/imprinting/CurriculumEditor';
import LoSelector from '@/components/imprinting/LoSelector';
import { SendModal } from '@/components/SendModal';
import { TabManager } from '@/components/session/TabManager';


const IntroPage = dynamic(() => import('@/components/session/IntroPage'));
const LiveKitViewer = dynamic(() => import('@/components/session/LiveKitViewer'), { ssr: false });
const VideoViewer = dynamic(() => import('@/components/session/VideoViewer'), { ssr: false });

// --- All of your interfaces and sub-components are preserved below ---
// --- They require no changes. ---

interface ConceptualDebriefViewProps {
  debrief: DebriefMessage | null;
  userInput: string;
  onUserInput: (value: string) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  onToggleRecording: () => void;
  isRecording: boolean;
  recordingDuration: number;
}

const ConceptualDebriefView = ({ debrief, userInput, onUserInput, onSubmit, inputRef, onToggleRecording, isRecording, recordingDuration }: ConceptualDebriefViewProps) => {
  return (
    <div className="w-full h-full flex flex-col justify-between items-center text-black bg-transparent p-4 md:p-8 pb-[120px]">
      <div className="w-full max-w-4xl space-y-8 overflow-y-auto pr-4 animate-fade-in">
        {debrief && (
          <div className="space-y-4">
            {debrief.hypothesis && (
              <p className="text-lg text-[#566FE9] leading-relaxed">{debrief.hypothesis}</p>
            )}
            <p className="text-lg text-black leading-relaxed">{debrief.text}</p>
          </div>
        )}
      </div>
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[97%] max-w-[1392px] z-10">
          <div className="flex items-center justify-between w-full h-[56px] bg-transparent border border-[#C7CCF8] rounded-[600px] pl-5 pr-2 py-2 backdrop-blur-sm">
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={userInput}
              onChange={(e) => onUserInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
              className="w-full h-full bg-transparent focus:outline-none resize-none text-lg text-black placeholder-gray-500"
              placeholder="Define the in-scope and out-of-scope boundaries for this LO..."
            />
            <div className="flex items-center gap-2">
                <button
                    onClick={onToggleRecording}
                    className={`flex items-center justify-center w-10 h-10 rounded-full ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'bg-[#566FE9] hover:bg-blue-500'} transition-colors`}
                    title={isRecording ? 'Stop and send' : 'Record an audio answer'}
                >
                  {isRecording ? <Square className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                </button>
                <button onClick={onSubmit} className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-500 transition-colors">
                  <Send className="w-5 h-5 text-white" />
                </button>
            </div>
          </div>
          {isRecording && (
            <div className="mt-2 text-sm text-[#566FE9] flex items-center gap-2 pl-4">
              <Timer className="w-4 h-4" />
              <span>Recording... {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}</span>
            </div>
          )}
      </div>
    </div>
  );
};


interface ButtonConfig {
    key: 'WORKFLOW' | 'DEBRIEF_CONCEPTUAL';
    label: string;
    inactiveImagePath: string;
    activeImagePath: string;
    onClick: () => void;
}

interface SessionContentProps {
    activeView: ReturnType<typeof useSessionStore.getState>['activeView'];
    imprintingMode: ReturnType<typeof useSessionStore.getState>['imprinting_mode'];
    componentButtons: ButtonConfig[];
    room?: Room;
    livekitUrl: string;
    livekitToken: string;
    isConnected: boolean;
    controlPanel?: React.ReactNode;
    currentDebrief: DebriefMessage | null;
    topicInput: string;
    setTopicInput: (value: string) => void;
    handleSendConceptual: () => void;
    topicInputRef: React.RefObject<HTMLTextAreaElement | null>;
    sendBrowserInteraction: (payload: object) => Promise<void>;
    onToggleConceptualRecording: () => void;
    isConceptualRecording: boolean;
    conceptualRecordingDuration: number;
    onSwitchTab: (id: string) => void | Promise<void>;
    onOpenNewTab: (name: string, url: string) => void | Promise<void>;
    onCloseTab: (id: string) => void | Promise<void>;
}

function SessionContent({ activeView, imprintingMode, componentButtons, room, livekitUrl, livekitToken, isConnected, controlPanel, currentDebrief, topicInput, setTopicInput, handleSendConceptual, topicInputRef, sendBrowserInteraction, onToggleConceptualRecording, isConceptualRecording, conceptualRecordingDuration, onSwitchTab, onOpenNewTab, onCloseTab }: SessionContentProps) {
    const isAwaitingAIResponse = useSessionStore((s: ReturnType<typeof useSessionStore.getState>) => s.isAwaitingAIResponse);
    return (
        <div className='w-full h-[90%] flex flex-col items-center justify-between'>
            <div className="w-full flex justify-center pt-[20px]">
                <div className="p-0 w-full md:w-1/2 lg:w-1/3 h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center">
                    {componentButtons.map((button) => (
                        <button
                            key={button.key}
                            onClick={button.onClick}
                            className={`w-[49%] h-[45px] flex items-center justify-center gap-2 rounded-full border-transparent font-jakarta-sans font-semibold-600 text-sm transition-all duration-200 ${imprintingMode === button.key ? 'bg-[#566FE9] text-[#ffffff]' : 'text-[#566FE9] bg-transparent'}`}
                        >
                            <img src={imprintingMode === button.key ? button.activeImagePath : button.inactiveImagePath} alt={button.label} className="w-[20px] h-[20px]" />
                            {button.label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-grow relative w-full h-full">
                {isAwaitingAIResponse && (
                    <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center z-50 animate-fade-in">
                        <Wand className="w-10 h-10 text-white animate-pulse mb-4" />
                        <p className="text-white text-lg">AI is analyzing your demonstration...</p>
                        <p className="text-white/70 text-sm">This may take a moment.</p>
                    </div>
                )}
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full`}>
                    <ConceptualDebriefView
                        debrief={currentDebrief}
                        userInput={topicInput}
                        onUserInput={setTopicInput}
                        onSubmit={handleSendConceptual}
                        inputRef={topicInputRef}
                        onToggleRecording={onToggleConceptualRecording}
                        isRecording={isConceptualRecording}
                        recordingDuration={conceptualRecordingDuration}
                    />
                </div>
                <div className={`${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full`}>
                    <div className="w-full h-full flex flex-col md:flex-row gap-4">
                        <div className="flex-1 flex flex-col min-h-0">
                            {room ? (
                                <>
                                    <TabManager
                                        onSwitchTab={onSwitchTab}
                                        onOpenNewTab={onOpenNewTab}
                                        onCloseTab={onCloseTab}
                                    />
                                    <div className="flex-1 min-h-0">
                                        <LiveKitViewer room={room} onInteraction={isConnected ? sendBrowserInteraction : undefined} />
                                    </div>
                                </>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                    Connecting to LiveKit...
                                </div>
                            )}
                        </div>
                        {controlPanel && (
                            <div className="w-full md:w-[360px] md:min-w-[320px]">
                                {controlPanel}
                            </div>
                        )}
                    </div>
                </div>
                <div className={`${activeView === 'video' ? 'block' : 'hidden'} w-full h-full`}>
                    <VideoViewer />
                </div>
            </div>
        </div>
    );
}

// ... (All your audio utility functions remain unchanged here)

interface TeacherFooterProps {
    onUploadClick?: () => void;
    onCaptureClick?: () => void;
    onIncreaseTimer: () => void;
    screenshotIntervalSec: number;
    onSaveScriptClick?: () => void;
    onVSCodeClick?: () => void;
    onSalesforceClick?: () => void;
    onPasteClick?: () => void;
    isRecording: boolean;
    isPaused: boolean;
    recordingDuration: number;
    onStartRecording: () => void;
    onTogglePauseResume: () => void;
    onRestartRecording: () => void;
    onSubmitEpisode: () => void;
    onShowMeClick?: () => void;
    isShowMeDisabled?: boolean;
    onFinalizeTopicClick?: () => void;
    isFinalizeDisabled?: boolean;
}
const TeacherFooter = ({ onUploadClick, onCaptureClick, onIncreaseTimer, screenshotIntervalSec, onSaveScriptClick, onVSCodeClick, onSalesforceClick, onPasteClick, isRecording, isPaused, recordingDuration, onStartRecording, onTogglePauseResume, onRestartRecording, onSubmitEpisode, onShowMeClick, isShowMeDisabled, onFinalizeTopicClick, isFinalizeDisabled }: TeacherFooterProps) => {
    const formatTime = (seconds: number) => {
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    };
    return (
        <footer className="absolute bottom-[32px] w-full h-[60px] p-4 z-10">
            <div className="absolute top-1/2 left-1/2 flex items-center gap-6" style={{ transform: 'translate(-50%, -50%)' }}>
                <div className="w-[202px] h-[56px] flex items-center justify-between bg-transparent border border-[#C7CCF8] py-2 pr-2 pl-4 rounded-[600px]">
                    <div className='flex items-center gap-2'>
                        <Timer className="w-6 h-6 text-[#566FE9]" />
                        <span className="font-semibold text-sm text-[#566FE9] font-[500] text-[16px]">{formatTime(screenshotIntervalSec)}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                        <button onClick={onIncreaseTimer} className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9]/10 hover:bg-[#566FE9]/20 transition-colors">
                            <Plus className="w-5 h-5 text-[#566FE9]" />
                        </button>
                        <button onClick={onCaptureClick} className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5fd1] transition-colors">
                            <Camera className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                <button onClick={onVSCodeClick} title="Switch to VS Code Environment" className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#566FE91A] hover:bg-[#566FE9]/20 transition-colors`}>
                    <img src="/vscode.svg" alt="Switch to VS Code" className="w-6 h-6" />
                </button>
                <UploadButton isVisible={true} onClick={onUploadClick} />
                {!isRecording ? (
                    <button onClick={onStartRecording} className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#E9EBFD] hover:bg-[#566FE9]/20 transition-colors`}>
                        <img src="/RecordStart.svg" alt="Start Recording" className="w-6 h-6" />
                    </button>
                ) : (
                    <div className="w-[252px] h-[56px] flex items-center justify-between bg-[#EBEFFF] py-2 pr-2 pl-4 rounded-[600px]">
                        <div className='flex items-center gap-2'>
                            <Timer className="w-6 h-6 text-[#566FE9]" />
                            <span className="font-semibold text-sm text-[#566FE9] font-[500] text-[16px]">{formatTime(recordingDuration)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            <button onClick={onRestartRecording} className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9]/10 hover:bg-[#566FE9]/20 transition-colors" aria-label="Restart Recording" title="Restart Recording">
                                <RefreshCcw className="w-5 h-5 text-[#566FE9]" />
                            </button>
                            <button onClick={onTogglePauseResume} className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9]/10 hover:bg-[#566FE9]/20 transition-colors" aria-label={isPaused ? "Resume Recording" : "Pause Recording"}>
                                {isPaused ? <img src="/Play.svg" alt="Resume Recording" className="w-5 h-5" /> : <img src="/Pause.svg" alt="Pause Recording" className="w-5 h-5" />}
                            </button>
                            <button onClick={onSubmitEpisode} className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5fd1] transition-colors">
                                <Square className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                )}
                <button onClick={onFinalizeTopicClick} disabled={isFinalizeDisabled} className="w-[150px] h-[56px] flex items-center justify-center rounded-[50px] py-4 px-5 bg-[#566FE9] text-white font-semibold text-sm hover:bg-[#4a5fd1] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                    Finalize Topic
                </button>
            </div>
        </footer>
    );
};


export default function Session() {
    // --- All your existing state and refs remain the same ---
    const MOCK_BACKEND = (process.env.NEXT_PUBLIC_MOCK_BACKEND ?? 'false') === 'true';
    const { activeView, setActiveView, imprinting_mode, setImprintingMode, currentLO, setCurrentLO, imprintingPhase, setImprintingPhase, curriculumDraft, setCurriculumDraft, setConceptualStarted, setDebriefMessage } = useSessionStore();
    const setIsAwaitingAIResponse = useSessionStore((s) => s.setIsAwaitingAIResponse);
    const [isIntroActive, setIsIntroActive] = useState(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const [imprintingEnvironment, setImprintingEnvironment] = useState<'browser' | 'vscode'>('browser');
    const courseId = searchParams.get('courseId');
    // ... (rest of your state hooks from your original file)
    
    // --- NEW: Get the new high-level actions from the store ---
    const { 
        initPublisher,
        openTabAndNotify, 
        switchTabAndNotify, 
        closeTabAndNotify 
    } = useSessionStore();

    const roomName = user?.id ? `session-${user.id}` : `session-${Date.now()}`;
    const shouldInitializeLiveKit = (!!user?.id);
    const lkRoomName = shouldInitializeLiveKit ? `session-${user?.id}` : '';
    const lkUserName = shouldInitializeLiveKit ? (user?.emailAddresses?.[0]?.emailAddress || `user-${user?.id}`) : '';
    
    // The useLiveKitSession hook call remains, but we won't use its tab functions.
    const {
        livekitUrl,
        livekitToken,
        isConnected,
        room,
        sendBrowserInteraction,
    } = useLiveKitSession(
        lkRoomName,
        lkUserName,
        (courseId as string) || undefined,
        { spawnAgent: false, spawnBrowser: true }
    );
    
    // --- NEW: Define the publishInteraction function and initialize the store ---
    const publishInteraction = useCallback(async (payload: object) => {
        if (sendBrowserInteraction) {
            await sendBrowserInteraction(payload);
        }
    }, [sendBrowserInteraction]);
    
    useEffect(() => {
        // Register the communication function with our store once it's available.
        if(publishInteraction) {
            initPublisher(publishInteraction);
        }

        // Ensure there's always at least one tab on load.
        const { tabs, addTab, setActiveTabId } = useSessionStore.getState();
        if (tabs.length === 0) {
            const initialTab: BrowserTab = { id: 'initial-tab', name: 'Browser', url: 'about:blank' };
            addTab(initialTab);
            setActiveTabId(initialTab.id);
        }
    }, [initPublisher, publishInteraction]);

    // --- The rest of your component's logic, hooks, and functions remain the same ---
    // (handleSeedSubmit, handleToggleConceptualRecording, handleCaptureScreenshot, etc. - ensure they are all here from your original file)
    // ...
    // ...
    
    if (!isLoaded) return <div className="w-full h-full flex items-center justify-center text-white">Loading...</div>;
    if (isIntroActive) return <IntroPage onAnimationComplete={() => setIsIntroActive(false)} />;
    
    // ... (Your other guards for courseId etc.)
    
    return (
        <>
            {(isSignedIn) ? (
                <>
                    {/* ... other components and logic ... */}
                    {imprintingPhase === 'LIVE_IMPRINTING' ? (
                        <>
                            <div className='flex flex-col w-full h-full items-center justify-between'>
                                <SessionContent
                                    // ... all other existing props from your file ...
                                    activeView={activeView}
                                    imprintingMode={imprinting_mode}
                                    componentButtons={[] /* Pass your buttons config */}
                                    room={room}
                                    livekitUrl={livekitUrl}
                                    livekitToken={livekitToken}
                                    isConnected={isConnected}
                                    currentDebrief={useSessionStore(s => s.debriefMessage)}
                                    topicInput={"" /* Pass your state */}
                                    setTopicInput={() => {} /* Pass your state setter */}
                                    handleSendConceptual={() => {} /* Pass your handler */}
                                    topicInputRef={useRef(null) /* Pass your ref */}
                                    sendBrowserInteraction={sendBrowserInteraction}
                                    onToggleConceptualRecording={() => {} /* Pass your handler */}
                                    isConceptualRecording={false /* Pass your state */}
                                    conceptualRecordingDuration={0 /* Pass your state */}
                                    onSwitchTab={switchTabAndNotify}      // MODIFIED
                                    onOpenNewTab={openTabAndNotify}      // MODIFIED
                                    onCloseTab={closeTabAndNotify}      // MODIFIED
                                />
                            </div>
                            {/* ... TeacherFooter and Modals ... */}
                        </>
                    ) : (
                        <div className='w-full h-full'>
                            {/* ... your other imprinting phases UI ... */}
                        </div>
                    )}
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                    {/* ... your SignedOut component content ... */}
                </div>
            )}
        </>
    );
}
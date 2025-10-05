"use client";

import React, { useState, useEffect, useRef, Suspense } from 'react';
// Import the specific buttons we need for the new footer
import { MicButton } from '@/components/MicButton';
import { UploadButton } from '@/components/UploadButton';
import { MessageButton } from '@/components/MessageButton';
// MODIFICATION: Added Send and RefreshCcw icons
import { Camera, Plus, Timer, Square, Pause, Wand, CheckCircle, Send, Mic, ExternalLink, RefreshCcw } from 'lucide-react';
// Keep other existing imports
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useSessionStore } from '@/lib/store';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { Room } from 'livekit-client';
import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sphere from '@/components/Sphere';
import { submitImprintingEpisode, stageAsset, conversationalTurn, conversationalTurnAudio, submitSeed, processSeedDocument, fetchCurriculumDraft, saveSetupScript, finalizeLO } from '@/lib/imprinterService';
import SeedInput from '@/components/imprinting/SeedInput';
import CurriculumEditor from '@/components/imprinting/CurriculumEditor';
import LoSelector from '@/components/imprinting/LoSelector';
// --- MODIFICATION: Import the new modal component ---
import { SendModal } from '@/components/SendModal';
import { TabManager } from '@/components/session/TabManager';


const IntroPage = dynamic(() => import('@/components/session/IntroPage'));
const LiveKitViewer = dynamic(() => import('@/components/session/LiveKitViewer'), { ssr: false });
const VideoViewer = dynamic(() => import('@/components/session/VideoViewer'), { ssr: false });


// --- NEW: Type definition for the AI's debrief message ---
interface DebriefMessage {
  hypothesis?: string; // For the AI's initial summary
  text: string;       // For the question or any subsequent message
}

// --- NEW: The component for the conceptual chat view ---
interface ConceptualDebriefViewProps {
  debrief: DebriefMessage | null;
  userInput: string;
  onUserInput: (value: string) => void;
  onSubmit: () => void;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
  // conceptual audio recording controls
  onToggleRecording: () => void;
  isRecording: boolean;
  recordingDuration: number;
}

const ConceptualDebriefView = ({ debrief, userInput, onUserInput, onSubmit, inputRef, onToggleRecording, isRecording, recordingDuration }: ConceptualDebriefViewProps) => {
  return (
    // MODIFICATION: Increased padding-bottom to prevent overlap with the new fixed footer.
    <div className="w-full h-full flex flex-col justify-between items-center text-black bg-transparent p-4 md:p-8 pb-[120px]">
      {/* Debrief Content */}
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

      {/* 
        MODIFICATION: 
        - Changed positioning from 'absolute' to 'fixed' to position relative to the browser window.
        - Centered the bar and set its width to 97% to match the main content area from AppLayout.
      */}
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
            {/* Button Group */}
            <div className="flex items-center gap-2">
                {/* Conceptual audio recorder button */}
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
    // Props for the debrief view
    currentDebrief: DebriefMessage | null;
    topicInput: string;
    setTopicInput: (value: string) => void;
    handleSendConceptual: () => void;
    topicInputRef: React.RefObject<HTMLTextAreaElement | null>;
    sendBrowserInteraction: (payload: object) => Promise<void>;
    onToggleConceptualRecording: () => void;
    isConceptualRecording: boolean;
    conceptualRecordingDuration: number;
    // Tab controls
    onSwitchTab: (id: string) => void | Promise<void>;
    onOpenNewTab: (name: string, url: string) => void | Promise<void>;
    onCloseTab: (id: string) => void | Promise<void>;
}

function SessionContent({
    activeView,
    imprintingMode,
    componentButtons,
    room,
    livekitUrl,
    livekitToken,
    isConnected,
    controlPanel,
    // Destructure new props
    currentDebrief,
    topicInput,
    setTopicInput,
    handleSendConceptual,
    topicInputRef,
    sendBrowserInteraction,
    onToggleConceptualRecording,
    isConceptualRecording,
    conceptualRecordingDuration,
    onSwitchTab,
    onOpenNewTab,
    onCloseTab,
}: SessionContentProps) {
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

                            <img
                                src={imprintingMode === button.key ? button.activeImagePath : button.inactiveImagePath}
                                alt={button.label}
                                className="w-[20px] h-[20px]"

                            />
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

// --- (Audio utility functions remain unchanged) ---
async function blobToArrayBufferSafe(blob: Blob): Promise<ArrayBuffer> {
    try {
        return await blob.arrayBuffer();
    } catch {
        return await new Promise((resolve, reject) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as ArrayBuffer);
            fr.onerror = reject;
            fr.readAsArrayBuffer(blob);
        });
    }
}

function interleaveToMono(buffer: AudioBuffer): Float32Array {
    const ch = buffer.numberOfChannels;
    const len = buffer.length;
    if (ch === 1) return buffer.getChannelData(0);
    const out = new Float32Array(len);
    for (let c = 0; c < ch; c++) {
        const data = buffer.getChannelData(c);
        for (let i = 0; i < len; i++) out[i] += data[i] / ch;
    }
    return out;
}

function floatTo16BitPCM(input: Float32Array): DataView {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    let offset = 0;
    for (let i = 0; i < input.length; i++, offset += 2) {
        let s = Math.max(-1, Math.min(1, input[i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }
    return view;
}

function writeString(view: DataView, offset: number, str: string) {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const numChannels = 1;
    const bytesPerSample = 2;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataView = floatTo16BitPCM(samples);
    const buffer = new ArrayBuffer(44 + dataView.byteLength);
    const view = new DataView(buffer);
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataView.byteLength, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, dataView.byteLength, true);
    new Uint8Array(buffer, 44).set(new Uint8Array(dataView.buffer));
    return buffer;
}

async function convertBlobToWavDataURL(blob: Blob): Promise<string> {
    const arr = await blobToArrayBufferSafe(blob);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decoded: AudioBuffer = await audioCtx.decodeAudioData(arr.slice(0));
    const mono = interleaveToMono(decoded);
    const wavBuffer = encodeWAV(mono, decoded.sampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(wavBlob);
    });
    try { audioCtx.close(); } catch {}
    return dataUrl;
}

// =================================================================================================
// === MODIFIED COMPONENT STARTS HERE ==============================================================
// =================================================================================================
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
    onRestartRecording: () => void; // Added prop for restarting
    onSubmitEpisode: () => void;
    onShowMeClick?: () => void;
    isShowMeDisabled?: boolean;
    onFinalizeTopicClick?: () => void;
    isFinalizeDisabled?: boolean;
}
const TeacherFooter = ({ 
    onUploadClick, 
    onCaptureClick, 
    onIncreaseTimer, 
    screenshotIntervalSec, 
    onSaveScriptClick,
    onVSCodeClick,
    onSalesforceClick,
    onPasteClick,
    isRecording,
    isPaused,
    recordingDuration,
    onStartRecording,
    onTogglePauseResume,
    onRestartRecording, // Destructure new prop
    onSubmitEpisode,
    onShowMeClick,
    isShowMeDisabled,
    onFinalizeTopicClick,
    isFinalizeDisabled,
}: TeacherFooterProps) => {
    const formatTime = (seconds: number) => {
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <footer className="absolute bottom-[32px] w-full h-[60px] p-4 z-10">
            <div className="absolute top-1/2 left-1/2 flex items-center gap-6" style={{ transform: 'translate(-50%, -50%)' }}>
                {/* 1st Button Group */}
                <div className="w-[202px] h-[56px] flex items-center justify-between bg-transparent border border-[#C7CCF8] py-2 pr-2 pl-4 rounded-[600px]">
                    <div className='flex items-center gap-2'>
                        <Timer className="w-6 h-6 text-[#566FE9]" />
                        <span className="font-semibold text-sm text-[#566FE9] font-[500] text-[16px]">{formatTime(screenshotIntervalSec)}</span>
                    </div>
                    <div className='flex items-center gap-2'>
                        <button 
                            onClick={onIncreaseTimer}
                            className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9]/10 hover:bg-[#566FE9]/20 transition-colors"
                        >
                            <Plus className="w-5 h-5 text-[#566FE9]" />
                        </button>
                        <button
                            onClick={onCaptureClick}
                            className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5fd1] transition-colors"
                        >
                            <Camera className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                {/* 4th Button */}
                <button
                    onClick={onVSCodeClick}
                    title="Switch to VS Code Environment"
                    className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#566FE91A] hover:bg-[#566FE9]/20 transition-colors`}
                >
                    <img src="/vscode.svg" alt="Switch to VS Code" className="w-6 h-6" />
                </button>
                {/* 6th Button */}
                <UploadButton
                    isVisible={true}
                    onClick={onUploadClick}
                />
                {/* 9th Button Group (Recording Controls) */}
                {!isRecording ? (
                    <button
                        onClick={onStartRecording}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#E9EBFD] hover:bg-[#566FE9]/20 transition-colors`}
                    >
                        <img src="/RecordStart.svg" alt="Start Recording" className="w-6 h-6" />
                    </button>
                ) : (
                    // MODIFICATION: Increased width to fit the new restart button
                    <div className="w-[252px] h-[56px] flex items-center justify-between bg-[#EBEFFF] py-2 pr-2 pl-4 rounded-[600px]">
                        <div className='flex items-center gap-2'>
                            <Timer className="w-6 h-6 text-[#566FE9]" />
                            <span className="font-semibold text-sm text-[#566FE9] font-[500] text-[16px]">{formatTime(recordingDuration)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                            {/* NEW: Restart Recording Button */}
                            <button
                                onClick={onRestartRecording}
                                className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9]/10 hover:bg-[#566FE9]/20 transition-colors"
                                aria-label="Restart Recording"
                                title="Restart Recording"
                            >
                                <RefreshCcw className="w-5 h-5 text-[#566FE9]" />
                            </button>
                            <button 
                                onClick={onTogglePauseResume}
                                className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9]/10 hover:bg-[#566FE9]/20 transition-colors"
                                aria-label={isPaused ? "Resume Recording" : "Pause Recording"}
                            >
                                {isPaused ? (
                                    <img src="/Play.svg" alt="Resume Recording" className="w-5 h-5" />
                                ) : (
                                    <img src="/Pause.svg" alt="Pause Recording" className="w-5 h-5" />
                                )}
                            </button>
                            <button
                                onClick={onSubmitEpisode}
                                className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5fd1] transition-colors"
                            >
                                <Square className="w-5 h-5 text-white" />
                            </button>
                        </div>
                    </div>
                )}
                {/* MODIFIED 11th Button (Finalize Topic) */}
                <button
                    onClick={onFinalizeTopicClick}
                    disabled={isFinalizeDisabled}
                    className="w-[150px] h-[56px] flex items-center justify-center rounded-[50px] py-4 px-5 bg-[#566FE9] text-white font-semibold text-sm hover:bg-[#4a5fd1] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                    Finalize Topic
                </button>
            </div>
        </footer>
    );
};
// =================================================================================================
// === MODIFIED COMPONENT ENDS HERE ================================================================
// =================================================================================================

function TeacherSession() {
    // --- MOCK BACKEND FLAG ---
    const MOCK_BACKEND = (process.env.NEXT_PUBLIC_MOCK_BACKEND ?? 'false') === 'true';
    // eslint-disable-next-line no-console
    console.log('[TeacherPage] INIT', { MOCK_BACKEND, now: new Date().toISOString() });

    const { activeView, setActiveView, imprinting_mode, setImprintingMode, currentLO, setCurrentLO, imprintingPhase, setImprintingPhase, curriculumDraft, setCurriculumDraft, setConceptualStarted, setDebriefMessage } = useSessionStore();
    const setIsAwaitingAIResponse = useSessionStore((s) => s.setIsAwaitingAIResponse);
    const [isIntroActive, setIsIntroActive] = useState(false);
    const handleIntroComplete = () => setIsIntroActive(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    // --- NEW: Track active environment for recording/imprinting ---
    const [imprintingEnvironment, setImprintingEnvironment] = useState<'browser' | 'vscode'>('browser');
    const SESSION_DEBUG = false;
    const DEV_BYPASS = true;
    // Disable legacy VNC session management; we use LiveKit data channel to control the browser pod
    const ENABLE_VNC = false;
    const courseId = searchParams.get('courseId');
    const courseTitle = searchParams.get('title');
    const lessonId = searchParams.get('lessonId');
    const lessonTitle = searchParams.get('lessonTitle');


    // --- MODIFICATION: Add state for the finish and finalize confirmation modals ---
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);


    
    if (SESSION_DEBUG) console.log('Session page - Course details:', { courseId, courseTitle, lessonId, lessonTitle });

    // If a specific lessonId is provided, auto-start live imprinting for that LO
    useEffect(() => {
        if (lessonId || lessonTitle) {
            // Set the current LO from URL and jump directly to live imprinting phase
            setCurrentLO(lessonTitle || lessonId || '');
            setImprintingPhase('LIVE_IMPRINTING');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lessonId, lessonTitle]);

    // NOTE: Do not early-return here to avoid conditional hook calls. We will render a fallback later.
    
    // Add debugging for authentication state

    useEffect(() => {
        if (SESSION_DEBUG) console.log('Session page auth state:', { isLoaded, isSignedIn, userId: user?.id });
    }, [isLoaded, isSignedIn, user?.id]);

    useEffect(() => {
        if (DEV_BYPASS) return;
        if (isLoaded && !isSignedIn) {
            const timeoutId = setTimeout(() => {
                if (!isSignedIn) {
                    window.location.href = '/login';
                }
            }, 2000);
            return () => clearTimeout(timeoutId);
        }
    }, [isLoaded, isSignedIn, router]);

    const roomName = user?.id ? `session-${user.id}` : `session-${Date.now()}`;

    // LiveKit integration (replace VNC viewer on Teacher page)
    const shouldInitializeLiveKit = (!!user?.id) && (DEV_BYPASS || (isLoaded && isSignedIn));
    const lkRoomName = shouldInitializeLiveKit ? `session-${user?.id}` : '';
    const lkUserName = shouldInitializeLiveKit ? (user?.emailAddresses?.[0]?.emailAddress || `user-${user?.id}`) : '';
    const {
        livekitUrl,
        livekitToken,
        isConnected,
        room,
        sendBrowserInteraction,
        openNewTab,
        switchTab,
        closeTab,
    } = useLiveKitSession(
        shouldInitializeLiveKit ? lkRoomName : '',
        shouldInitializeLiveKit ? lkUserName : '',
        (courseId as string) || undefined,
        { spawnAgent: false, spawnBrowser: true }
    );

    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] LiveKit hook ready', { shouldInitializeLiveKit, lkRoomName, lkUserName, livekitUrl, tokenPresent: !!livekitToken });
    }, [shouldInitializeLiveKit, lkRoomName, lkUserName, livekitUrl, livekitToken]);
    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] LiveKit connection state changed', { isConnected, hasRoom: !!room });
    }, [isConnected, room]);

    // VNC session management removed (LiveKit-only)

    // Legacy VNC stubs removed

    // Helper to send actions to browser pod over LiveKit data channel
    const sendBrowser = React.useCallback(async (action: string, parameters: Record<string, unknown> = {}) => {
        try {
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] sendBrowser →', { action, parameters });
            await sendBrowserInteraction({ action, ...parameters });
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] sendBrowser ✓', { action });
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn('[TeacherPage] sendBrowser failed', e);
        }
    }, [sendBrowserInteraction]);

    // --- Debug watchers for critical state --- (trimmed)

    useEffect(() => {
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] activeView changed:', activeView);
    }, [activeView]);

    // --- AUTO-OPEN VSCODE: When imprintingPhase becomes LIVE_IMPRINTING and environment is vscode, navigate to code-server ---
    useEffect(() => {
        if (imprintingPhase === 'LIVE_IMPRINTING' && imprintingEnvironment === 'vscode' && isConnected) {
            // Only auto-open once per session
            const key = `vscode_auto_opened_${currentLO}`;
            if (sessionStorage.getItem(key)) return;
            sessionStorage.setItem(key, 'true');
            
            // Navigate to VSCode
            void sendBrowser('navigate', { url: 'http://localhost:4600' });
            setStatusMessage('Auto-opened VSCode environment.');
            console.log('[TeacherPage] Auto-opened VSCode for LO:', currentLO);
        }
    }, [imprintingPhase, imprintingEnvironment, isConnected, currentLO, sendBrowser]);

    // --- WRAPPED TAB FUNCTIONS: Capture setup actions when teacher opens new tabs ---
    const handleOpenNewTabWithCapture = React.useCallback(async (name: string, url: string) => {
        try {
            // First, execute the actual tab opening
            await openNewTab(name, url);
            
            // Then, capture this as a setup action for the lesson
            const setupAction = {
                tool_name: 'browser_navigate',
                parameters: { url },
            };
            setSetupActions(prev => [...prev, setupAction]);
            
            console.log('[TeacherPage] Captured tab navigation as setup action:', { name, url });
            setStatusMessage(`Opened tab: ${name}`);
        } catch (err) {
            console.error('[TeacherPage] handleOpenNewTabWithCapture failed:', err);
        }
    }, [openNewTab]);

    const handleSelectPractical = () => {
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] UI: Select Practical');
        setImprintingMode('WORKFLOW');
        setActiveView('vnc');
    };

    const handleSelectConceptual = () => {
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] UI: Select Conceptual');
        setImprintingMode('DEBRIEF_CONCEPTUAL');
        setActiveView('excalidraw');
        setConceptualStarted(false);
        setIsShowMeRecording(false);
    };

    const componentButtons: ButtonConfig[] = [
        { key: 'WORKFLOW', label: 'Practical', inactiveImagePath: '/browser-inactive.svg', activeImagePath: '/browser-active.svg', onClick: handleSelectPractical },
        { key: 'DEBRIEF_CONCEPTUAL', label: 'Conceptual', inactiveImagePath: '/whiteboard-inactive.svg', activeImagePath: '/whiteboard-active.svg', onClick: handleSelectConceptual },
    ];

    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingSetup, setIsSavingSetup] = useState(false);
    const [isFinalizingLO, setIsFinalizingLO] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('Session started. Waiting for initial prompt.');
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    // const [isCreatingSession, setIsCreatingSession] = useState(false); // VNC: unused
    type RecordedPacket = { interaction_type?: string } & Record<string, unknown>;

    const packetsRef = useRef<RecordedPacket[]>([]);
    const [packetsCount, setPacketsCount] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const audioBlobRef = useRef<Blob | null>(null);
    const [stagedAssets, setStagedAssets] = useState<{ filename: string; role: string; asset_id: string }[]>([]);
    // NEW: Track setup actions captured during session (e.g., tab navigation)
    const [setupActions, setSetupActions] = useState<Array<{tool_name: string; parameters: Record<string, unknown>}>>([]);
    const [isStartAllowed, setIsStartAllowed] = useState<boolean>(true);
    const [screenshotIntervalSec, setScreenshotIntervalSec] = useState<number>(10);
    const [timeToNextScreenshot, setTimeToNextScreenshot] = useState<number | null>(null);
    const [isShowMeRecording, setIsShowMeRecording] = useState<boolean>(false);
    const showMeQuestionRef = useRef<string | null>(null);
    
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const curriculumId = courseId as string;

    // VNC session helpers removed

    // VNC cleanup removed

    const handleSeedSubmit = async (content: string) => {
        setImprintingPhase('SEED_PROCESSING');
        try {
            await processSeedDocument({ curriculum_id: String(curriculumId), content });
            const draft = await fetchCurriculumDraft(String(curriculumId));
            setCurriculumDraft(draft);
            setImprintingPhase('REVIEW_DRAFT');
        } catch (error) {
            setImprintingPhase('SEED_INPUT');
        }
    };

    // Conceptual audio recording: start/stop-and-send
    const handleToggleConceptualRecording = async () => {
        if (!isConceptualRecording) {
            try {
                setStatusMessage('Starting conceptual audio recording...');
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
                conceptualAudioChunksRef.current = [];
                recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) conceptualAudioChunksRef.current.push(e.data); };
                recorder.start();
                conceptualMediaRecorderRef.current = recorder;
                setIsConceptualRecording(true);
                setConceptualRecordingDuration(0);
                if (conceptualRecordingIntervalRef.current) clearInterval(conceptualRecordingIntervalRef.current);
                conceptualRecordingIntervalRef.current = setInterval(() => {
                    setConceptualRecordingDuration((prev) => prev + 1);
                }, 1000);
            } catch (err: any) {
                console.error('[TeacherPage] Conceptual recording start failed', err);
                setSubmitError(err?.message || 'Failed to start conceptual recording');
            }
        } else {
            try {
                setStatusMessage('Stopping conceptual recording and sending...');
                if (conceptualRecordingIntervalRef.current) clearInterval(conceptualRecordingIntervalRef.current);
                if (conceptualMediaRecorderRef.current && conceptualMediaRecorderRef.current.state !== 'inactive') {
                    // Stop and release mic
                    const tracks = conceptualMediaRecorderRef.current.stream.getTracks();
                    conceptualMediaRecorderRef.current.stop();
                    tracks.forEach((t) => t.stop());
                }
                setIsConceptualRecording(false);
                // Wait briefly to ensure dataavailable has flushed
                await new Promise((r) => setTimeout(r, 150));
                const blob = new Blob(conceptualAudioChunksRef.current, { type: 'audio/webm' });
                const audio_b64 = await convertBlobToWavDataURL(blob);
                conceptualAudioChunksRef.current = [];
                // Submit to LangGraph via imprinter service
                try {
                    const resp = await conversationalTurnAudio({
                        curriculum_id: String(curriculumId),
                        session_id: roomName,
                        imprinting_mode: 'DEBRIEF_CONCEPTUAL',
                        latest_expert_audio_b64: audio_b64,
                        current_lo: currentLO || undefined,
                    });
                    const aiText = resp?.text || 'Got it. Let\'s continue.';
                    setDebriefMessage({ text: aiText });
                    setConceptualStarted(true);
                    setStatusMessage('AI replied to your audio answer.');
                    setIsStartAllowed(!(aiText && /\?/.test(aiText)));
                } catch (e: any) {
                    console.error('[TeacherPage] Conceptual audio turn failed', e);
                    setDebriefMessage({ text: `Sorry, I encountered an error processing your audio. ${e?.message || e}` });
                }
            } catch (err: any) {
                console.error('[TeacherPage] Conceptual recording stop/send failed', err);
                setSubmitError(err?.message || 'Failed to send conceptual audio');
            }
        }
    };

    const handleCaptureScreenshot = async () => {
        try {
            if (!isRecording) {
                setStatusMessage('Start recording to capture and persist screenshots.');
                // eslint-disable-next-line no-console
                console.log('[TeacherPage] captureScreenshot: ignored (not recording)');
                return;
            }
            setStatusMessage('Capturing screenshot...');
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] captureScreenshot → request');
            await sendBrowser('screenshot');
            setStatusMessage('Manual screenshot captured.');
            setTimeToNextScreenshot(screenshotIntervalSec);
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] captureScreenshot ✓');
        } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error('[TeacherPage] captureScreenshot ✗', e);
            setStatusMessage(`Screenshot failed: ${e?.message || e}`);
        }
    };

    const [setupActionsText, setSetupActionsText] = useState<string>('');

    const handleSaveSetupText = async () => {
        if (!currentLO) {
            setSubmitError('Please enter/select a Topic (LO) before saving setup.');
            return;
        }
        const raw = (setupActionsText || '').trim();
        if (!raw) {
            setSubmitError('Please paste setup actions JSON into the textbox.');
            return;
        }
        type BrowserAction = Record<string, unknown>;
        let actions: BrowserAction[];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('JSON must be an array of action objects');
            actions = parsed as BrowserAction[];
        } catch (e: any) {
            setSubmitError(`Invalid JSON: ${e?.message || e}`);
            return;
        }

        setIsSavingSetup(true);
        setSubmitMessage(null);
        setSubmitError(null);
        try {
            setStatusMessage('Saving setup script...');
            const resp = await saveSetupScript({ curriculum_id: String(curriculumId), lo_name: currentLO, actions });
            setSubmitMessage(resp?.message || `Setup script saved for ${currentLO}.`);
            setStatusMessage('Setup script saved.');
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to save setup script');
        } finally {
            setIsSavingSetup(false);
        }
    };
    
    const executeFinalizeTopic = async () => {
        if (!currentLO) {
            setSubmitError('Please select a Topic (LO) before finalizing.');
            setIsFinalizeModalOpen(false);
            return;
        }
        
        setIsFinalizingLO(true);
        setSubmitMessage(null);
        setSubmitError(null);
        setIsFinalizeModalOpen(false);

        try {
            setStatusMessage(`Finalizing "${currentLO}"...`);
            const resp = await finalizeLO({ curriculum_id: String(curriculumId), lo_name: currentLO });
            setSubmitMessage(resp?.message || `Topic "${currentLO}" finalized.`);
            setStatusMessage('Topic finalized.');
            setIsStartAllowed(true);
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to finalize topic');
        } finally {
            setIsFinalizingLO(false);
        }
    };

    const handleFinalizeTopicClick = () => {
        setIsFinalizeModalOpen(true);
    };

    const handleReviewComplete = () => setImprintingPhase('LO_SELECTION');
    const handleLoSelected = (loName: string) => { setCurrentLO(loName); setImprintingPhase('LIVE_IMPRINTING'); };

    // Debrief message now comes from global store so LiveKit updates can re-render UI
    const currentDebrief = useSessionStore((s) => s.debriefMessage);
    // Conceptual started flag also comes from store (enables Show Me after debrief arrives)
    const conceptualStarted = useSessionStore((s) => s.conceptualStarted);
    const [topicInput, setTopicInput] = useState<string>('');
    const [seedText, setSeedText] = useState<string>('');
    const topicInputRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    // Conceptual side audio recording state
    const conceptualMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const conceptualAudioChunksRef = useRef<BlobPart[]>([]);
    const [isConceptualRecording, setIsConceptualRecording] = useState<boolean>(false);
    const [conceptualRecordingDuration, setConceptualRecordingDuration] = useState(0);
    const conceptualRecordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleSubmitSeed = async () => {
        if (!user?.id || !seedText.trim()) return;
        try {
            setStatusMessage('Submitting seed...');
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] submitSeed →', { expert_id: user.id, session_id: roomName, curriculumId });
            await submitSeed({ expert_id: user.id, session_id: roomName, curriculum_id: String(curriculumId), content: seedText });
            setStatusMessage('Seed submitted.');
            setSeedText('');
        } catch (e: any) { setStatusMessage(`Seed submit failed: ${e?.message || e}`); }
    };

    const handleStartRecording = async () => {
        if (!user?.id) return;
        try {
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] handleStartRecording: begin', { activeView, screenshotIntervalSec });
            setSubmitMessage(null);
            setSubmitError(null);
            setImprintingMode('WORKFLOW');
            setActiveView('vnc');
            setStatusMessage('Initializing recording on server...');
            setPacketsCount(0);
            setStagedAssets([]);
            setIsPaused(false);
            // In LiveKit flow, instruct the browser pod to start recording via data channel
            await sendBrowser('start_recording', { session_id: roomName, screenshot_interval_sec: screenshotIntervalSec, environment: imprintingEnvironment });
            setTimeToNextScreenshot(screenshotIntervalSec);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => { audioBlobRef.current = new Blob(audioChunksRef.current, { type: 'audio/webm' }); };
            recorder.start();
            mediaRecorderRef.current = recorder;

            setIsRecording(true);
            setStatusMessage('Recording...');
            
            setRecordingDuration(0);
            if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] handleStartRecording: done');
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('[TeacherPage] handleStartRecording: error', err);
            setSubmitError(err?.message || 'Failed to start recording');
            setIsRecording(false);
        }
    };
    
    // =================================================================================================
    // === NEW LOGIC STARTS HERE =======================================================================
    // =================================================================================================
    const handleRestartRecording = async () => {
        const confirmed = window.confirm(
            "Are you sure you want to restart the recording? This will delete the current take."
        );
        if (confirmed) {
            setStatusMessage('Restarting recording...');
            
            // 1. Stop the current recording and clean up local resources
            await handleStopRecording(); // This already clears intervals and stops media recorder
            
            // 2. Clear out old data that handleStopRecording doesn't touch
            audioBlobRef.current = null;
            audioChunksRef.current = [];
            packetsRef.current = [];
            setPacketsCount(0);
            setStagedAssets([]);
            setRecordingDuration(0);
            setIsPaused(false);

            // 3. Tell the browser pod to stop and discard its current recording (rrweb, screenshots, VS Code actions)
            try {
                console.log('[TeacherPage] Instructing pod to discard current recording segment.');
                await sendBrowser('stop_recording', { discard: true, session_id: roomName });
            } catch (e) {
                console.warn('[TeacherPage] Pod discard instruction failed during restart, may result in orphaned data segment on pod.', e);
            }

            // 4. Wait a moment for everything to settle
            await new Promise(resolve => setTimeout(resolve, 200));

            // 5. Start a fresh recording
            console.log('[TeacherPage] Starting new recording after restart.');
            await handleStartRecording();
        }
    };
    // =================================================================================================
    // === NEW LOGIC ENDS HERE =========================================================================
    // =================================================================================================

    const handleVncInteraction = (interaction: { action: string; x: number; y: number }) => {
        if (!isRecording) return;
        // Send a click through the LiveKit data channel
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] onInteraction(click) →', interaction);
        void sendBrowser('click', { x: interaction.x, y: interaction.y });
    };

    const handleSendConceptual = async () => {
        if (imprinting_mode !== 'DEBRIEF_CONCEPTUAL') return;
        const msg = (topicInput || '').trim();
        if (!msg) return;

        setTopicInput('');
        setStatusMessage('Sending response...');

        if (MOCK_BACKEND) {
            await new Promise(r => setTimeout(r, 1000));
            const fakeResponses = [
                "That's an interesting point. How does that relate to the stability of the system?",
                "Understood. What would be the primary disadvantage of using that approach?",
                "Great, that clarifies things. Let's move on. Please continue when you're ready.",
            ];
            const currentQuestion = currentDebrief?.text || "";
            const nextResponse = fakeResponses[Math.floor(Math.random() * fakeResponses.length)]
            const newDebrief = {
                text: nextResponse !== currentQuestion ? nextResponse : "Can you elaborate on that further?"
            };
            setDebriefMessage(newDebrief);
            setStatusMessage('AI replied (Mocked).');
        } else {
            try {
                const resp = await conversationalTurn({
                    curriculum_id: curriculumId,
                    session_id: roomName,
                    imprinting_mode: 'DEBRIEF_CONCEPTUAL',
                    latest_expert_response: msg,
                    current_lo: currentLO || undefined
                });
                const aiText = resp?.text || 'Got it. Let\'s continue.';
                setDebriefMessage({ text: aiText });
                setStatusMessage('AI replied.');
                setIsStartAllowed(!(aiText && /\?/.test(aiText)));
            } catch (e: any) {
                setDebriefMessage({ text: `Sorry, I encountered an error. ${e?.message}` });
            }
        }
    };

    const handleShowMe = async () => {
        if (imprinting_mode !== 'DEBRIEF_CONCEPTUAL' || !conceptualStarted) return;
        const lastQ = currentDebrief?.text || '';
        if (!lastQ) return;
        const msg = (topicInput || '').trim();
        if (!msg) {
            setStatusMessage('Type what you want me to demonstrate, then click Show Me.');
            setTimeout(() => topicInputRef.current?.focus(), 0);
            return;
        }
        showMeQuestionRef.current = lastQ;
        setIsShowMeRecording(true);
        setImprintingMode('WORKFLOW');
        setActiveView('vnc');
        setStatusMessage('Show Me: switched to Browser. Starting recording...');
        setTopicInput('');
        if (!isRecording) {
            try { await handleStartRecording(); }
            catch (e: any) { setStatusMessage(`Failed to start Show Me recording: ${e?.message || e}`); }
        }
    };

    const handleStopRecording = async () => {
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] handleStopRecording: begin');
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        } catch (err) { console.warn('Stop recording warning:', err); }
        setIsRecording(false);
        setTimeToNextScreenshot(null);
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] handleStopRecording: done');
    };
    
    const handleTogglePauseResume = () => {
        if (!mediaRecorderRef.current) return;
        if (isPaused) {
            // Resume local mic and instruct pod to resume
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            try { void sendBrowser('resume_recording'); } catch {}
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] handleTogglePauseResume: resumed');
        } else {
            // Pause local mic and instruct pod to pause
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            try { void sendBrowser('pause_recording'); } catch {}
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] handleTogglePauseResume: paused');
        }
    };

    useEffect(() => {
        if (!isRecording) return;
        setTimeToNextScreenshot((prev) => (prev == null ? screenshotIntervalSec : prev));
        const id = setInterval(() => {
            setTimeToNextScreenshot((prev) => {
                if (prev == null) return screenshotIntervalSec;
                const next = prev - 1;
                if (next <= 1) {
                    // eslint-disable-next-line no-console
                    console.log('[TeacherPage] T-minus next periodic screenshot', { next });
                }
                return next <= 0 ? screenshotIntervalSec : next;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [isRecording, screenshotIntervalSec]);

    const handleSubmitEpisode = async () => {
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] handleSubmitEpisode: begin', { MOCK_BACKEND, isRecording, stagedAssetsCount: stagedAssets.length, currentLO });
        setSubmitMessage(null);
        setSubmitError(null);
        setIsSubmitting(true);
        // Start global loading; will be stopped when AI response arrives via LiveKit
        try { setIsAwaitingAIResponse(true); } catch {}
        setIsStartAllowed(false);
        // Ensure we stop recording to finalize audio and actions
        if (isRecording) {
            await handleStopRecording();
            // Give MediaRecorder.onstop a moment to populate the blob
            await new Promise((r) => setTimeout(r, 150));
        }

        try {
            if (MOCK_BACKEND) {
                setStatusMessage('Stopping recording and preparing data (Mocked)...');
                await new Promise(r => setTimeout(r, 1000));
                setStatusMessage('Submitting episode (Mocked)...');
                await new Promise(r => setTimeout(r, 2000));
                // eslint-disable-next-line no-console
                console.log('[TeacherPage] handleSubmitEpisode: MOCK flow');
                const fakeResponse = {
                    action: 'SPEAK_AND_INITIATE_DEBRIEF',
                    text: "Great question! On the real axis, the root locus exists between an odd number of poles and zeros. Count the total number of poles and zeros to the right of any point on the real axis. If it's odd, that section is part of the root locus."
                };
                setSubmitMessage(`Submitted. Processed 123 fake actions.`);
                setStatusMessage('Episode submitted. AI is analyzing (Mocked)...');
                if (fakeResponse.action === 'SPEAK_AND_INITIATE_DEBRIEF') {
                    const aiText = fakeResponse.text || '';
                    let hypothesis = 'Great question!';
                    let question = aiText.replace('Great question! ', '');
                    const lastSentenceEnd = Math.max(aiText.lastIndexOf('. '), aiText.lastIndexOf('! '), aiText.lastIndexOf('? '));
                    if (lastSentenceEnd > -1 && lastSentenceEnd < aiText.length - 2) {
                        hypothesis = aiText.substring(0, lastSentenceEnd + 1);
                        question = aiText.substring(lastSentenceEnd + 2).trim();
                    }
                    try { setDebriefMessage({ hypothesis, text: question }); } catch {}
                    try { setImprintingMode('DEBRIEF_CONCEPTUAL'); } catch {}
                    try { setActiveView('excalidraw'); } catch {}
                    try { setConceptualStarted(true); } catch {}
                    try { setIsAwaitingAIResponse(false); } catch {}
                    setIsStartAllowed(false);
                    setStatusMessage('AI has a question for you (Mocked).');
                    setTimeout(() => topicInputRef.current?.focus(), 0);
                }
                return; // Do not hit real backend in mock mode
            }

            // Real backend flow
            // Prepare audio: upload via HTTP to get an asset_id (avoid sending audio over LiveKit data channel)
            const blob = audioBlobRef.current;
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] handleSubmitEpisode: audio prepared', { blobPresent: !!blob, blobSize: blob?.size });

            // Upload audio first (staging), then send only a small payload over LiveKit
            let audioAssetId: string | null = null;
            if (blob && user?.id) {
                try {
                    setStatusMessage('Uploading audio narration...');
                    const audioFile = new File([blob], 'narration.wav', { type: 'audio/wav' });
                    const assetInfo = await stageAsset({
                        expert_id: user.id,
                        session_id: roomName,
                        curriculum_id: String(curriculumId),
                        file: audioFile,
                    });
                    audioAssetId = assetInfo.asset_id;
                    // eslint-disable-next-line no-console
                    console.log('[TeacherPage] Audio uploaded, asset_id:', audioAssetId);
                } catch (e) {
                    // eslint-disable-next-line no-console
                    console.warn('[TeacherPage] Audio upload failed (continuing without audio asset):', e);
                }
            }

            // In LiveKit flow, instruct the browser pod to stop and submit payload to imprinter.
            setStatusMessage('Submitting episode via browser pod...');
            try {
                // Merge any previously staged assets with the new audio asset reference (if any)
                const staged_assets_compact = [
                    ...stagedAssets,
                    ...(audioAssetId ? [{ asset_id: audioAssetId, filename: 'narration.wav', role: 'AUDIO_NARRATION' }] : []),
                ];

                const payload: Record<string, unknown> = {
                    expert_id: user?.id || 'expert',
                    session_id: roomName,
                    curriculum_id: String(curriculumId),
                    // Do NOT include audio_b64 in data-channel payload
                    staged_assets: staged_assets_compact,
                    current_lo: currentLO || undefined,
                    narration: 'Expert narration from episode.',
                    imprinting_mode: imprinting_mode,
                    // Use selected environment for both keys (backend + browser_manager)
                    imprinting_environment: imprintingEnvironment,
                    environment: imprintingEnvironment,
                    // Include captured setup actions
                    setup_actions: setupActions,
                };
                if (isShowMeRecording && showMeQuestionRef.current) {
                    (payload as any).in_response_to_question = showMeQuestionRef.current;
                }
                // eslint-disable-next-line no-console
                console.log('[TeacherPage] handleSubmitEpisode → sendBrowser(stop_recording)', { keys: Object.keys(payload) });
                await sendBrowser('stop_recording', payload);
                setSubmitMessage('Submitted. Processing on server...');
                setStatusMessage('Episode submitted. AI is analyzing...');
                // eslint-disable-next-line no-console
                console.log('[TeacherPage] handleSubmitEpisode ✓ submitted via pod');
                
                // NEW: Explicitly save setup script if we have setup actions and a current LO
                if (setupActions.length > 0 && currentLO) {
                    try {
                        // eslint-disable-next-line no-console
                        console.log('[TeacherPage] Saving setup script for LO:', currentLO, 'with', setupActions.length, 'actions');
                        await saveSetupScript({
                            curriculum_id: String(curriculumId),
                            lo_name: currentLO,
                            actions: setupActions,
                        });
                        // eslint-disable-next-line no-console
                        console.log('[TeacherPage] Setup script saved successfully');
                    } catch (setupErr: any) {
                        // eslint-disable-next-line no-console
                        console.warn('[TeacherPage] Failed to save setup script (non-fatal):', setupErr);
                    }
                }
            } catch (postErr: any) {
                setSubmitError(postErr?.message || 'Failed to submit via pod');
                setStatusMessage('Submit failed.');
                try { setIsAwaitingAIResponse(false); } catch {}
                // eslint-disable-next-line no-console
                console.error('[TeacherPage] handleSubmitEpisode ✗', postErr);
                // Optional direct fallback to imprinter if pod submission fails
                const DIRECT_FALLBACK = (process.env.NEXT_PUBLIC_TEACHER_DIRECT_SUBMIT_IF_POD_FAILS ?? 'true') === 'true';
                if (DIRECT_FALLBACK) {
                    try {
                        // eslint-disable-next-line no-console
                        console.warn('[TeacherPage] Falling back to direct imprinter submission');
                        const audio_b64: string = blob ? await convertBlobToWavDataURL(blob) : '';
                        const directPayload = {
                            expert_id: user?.id || 'expert',
                            session_id: roomName,
                            curriculum_id: String(curriculumId),
                            narration: 'Expert narration from episode.',
                            audio_b64,
                            expert_actions: [], // No local action capture in Teacher; rely on audio and staged assets
                            current_lo: currentLO || undefined,
                            staged_assets: stagedAssets,
                            in_response_to_question: (isShowMeRecording && showMeQuestionRef.current) ? showMeQuestionRef.current : undefined,
                        };
                        const resp = await submitImprintingEpisode(directPayload as any);
                        setSubmitMessage('Submitted directly. Processing on server...');
                        setStatusMessage('Episode submitted (direct). AI is analyzing...');
                        console.log('[TeacherPage] Direct submit ✓', { keys: Object.keys(resp || {}) });
                        
                        // NEW: Also save setup script in direct fallback path
                        if (setupActions.length > 0 && currentLO) {
                            try {
                                console.log('[TeacherPage] Saving setup script (direct fallback) for LO:', currentLO);
                                await saveSetupScript({
                                    curriculum_id: String(curriculumId),
                                    lo_name: currentLO,
                                    actions: setupActions,
                                });
                                console.log('[TeacherPage] Setup script saved successfully (direct fallback)');
                            } catch (setupErr: any) {
                                console.warn('[TeacherPage] Failed to save setup script in direct fallback (non-fatal):', setupErr);
                            }
                        }
                    } catch (directErr: any) {
                        console.error('[TeacherPage] Direct submit ✗', directErr);
                    }
                }
            }

            // Reset buffers/state after submit
            packetsRef.current = [];
            setPacketsCount(0);
            audioChunksRef.current = [];
            audioBlobRef.current = null;
            setStagedAssets([]);
            setSetupActions([]);
            setIsShowMeRecording(false);
            showMeQuestionRef.current = null;
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to submit');
            // eslint-disable-next-line no-console
            console.error('[TeacherPage] handleSubmitEpisode catch ✗', err);
            try { setIsAwaitingAIResponse(false); } catch {}
        } finally {
            setIsSubmitting(false);
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] handleSubmitEpisode: end');
        }
    };

    const handleAssetUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id) return;
        
        // Determine the role based on file type
        let role: string;
        if (file.name.endsWith('.zip')) {
            role = 'WORKSPACE_ARCHIVE';
        } else {
            role = window.prompt("Role for this file? (e.g., STARTER_CODE, DATASET)", "STARTER_CODE") || "STARTER_CODE";
        }
        
        try {
            setStatusMessage('Uploading asset...');
            const assetInfo = await stageAsset({ expert_id: user.id, session_id: roomName, curriculum_id: String(curriculumId), file });
            const item = { filename: assetInfo.filename || file.name, role: role, asset_id: assetInfo.asset_id };
            setStagedAssets(prev => [...prev, item]);
            
            // If it's a workspace archive, immediately unzip it in the teacher's pod
            if (role === 'WORKSPACE_ARCHIVE') {
                try {
                    setStatusMessage('Extracting workspace...');
                    await sendBrowser('unzip_staged_asset_in_workspace', { asset_id: assetInfo.asset_id });
                    setStatusMessage('Workspace uploaded and extracted successfully.');
                    // eslint-disable-next-line no-console
                    console.log('[TeacherPage] Workspace extracted for teacher preview:', assetInfo.asset_id);
                } catch (unzipErr: any) {
                    console.error('[TeacherPage] Workspace extraction failed:', unzipErr);
                    setStatusMessage(`Workspace uploaded but extraction failed: ${unzipErr?.message || unzipErr}`);
                }
            } else {
                setStatusMessage('Asset uploaded.');
            }
        } catch (e: any) {
            setStatusMessage(`Error uploading asset: ${e?.message || e}`);
        } finally {
            if (event.target) event.target.value = '';
        }
    };
    
    // Remove a staged asset by index
    const handleRemoveStagedAsset = (index: number) => setStagedAssets(prev => prev.filter((_, i) => i !== index));

    // Finish session: stop recording, cleanup VNC session, reset URLs
    const executeFinishSession = async () => {
        try {
            setIsFinishModalOpen(false);
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] executeFinishSession: begin', { isRecording, hasAudioBlob: !!audioBlobRef.current, stagedAssets: stagedAssets.length });
            if (isRecording || audioBlobRef.current) {
                // If we have something to submit (either still recording or we have captured audio), submit it.
                await handleSubmitEpisode();
            } else {
                // If nothing to submit, just ensure local mic is stopped
                if (isRecording) await handleStopRecording();
            }
        } catch (e: any) {
            setSubmitError(e?.message || 'Failed to finish session');
            // eslint-disable-next-line no-console
            console.error('[TeacherPage] executeFinishSession ✗', e);
        } finally {
            // eslint-disable-next-line no-console
            console.log('[TeacherPage] executeFinishSession: end');
        }
    };

    const handleFinishClick = () => {
        setIsFinishModalOpen(true);
    };

    // Removed legacy VNC sensor connect effect

    const handleIncreaseTimer = () => {
        setScreenshotIntervalSec(prev => prev + 5);
    };

    // --- NEW: VS Code environment switch ---
    const handleSwitchToVSCode = () => {
        // 1) Set environment for subsequent recording/submission
        setImprintingEnvironment('vscode');
        // 2) Navigate browser pod to code-server
        void sendBrowser('navigate', { url: 'http://localhost:4600' });
        // 3) Feedback
        setStatusMessage('Switched to VS Code environment.');
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] UI: Switched to VS Code. Subsequent recordings will capture VS Code actions.');
    };

    // --- NEW: Open Salesforce in browser environment ---
    const handleOpenSalesforce = () => {
        // Ensure we're in the browser environment
        setImprintingEnvironment('browser');
        // Navigate the browser pod to the Salesforce Home URL
        void sendBrowser('navigate', { url: 'https://ruby-ruby-7891.lightning.force.com/lightning/page/home' });
        // Feedback
        setStatusMessage('Opening Salesforce Home in the browser...');
        // eslint-disable-next-line no-console
        console.log('[TeacherPage] UI: Opening Salesforce Home URL in browser pod');
    };

    // Paste text from local clipboard into the remote session
    const handlePasteFromLocal = async () => {
        try {
            const clipboardText = await navigator.clipboard.readText();
            if (clipboardText) {
                setStatusMessage('Pasting from clipboard...');
                await sendBrowser('paste_from_local', { text: clipboardText });
                setStatusMessage('Pasted content into session.');
                // eslint-disable-next-line no-console
                console.log('[TeacherPage] Pasted text from local clipboard into pod.');
            } else {
                setStatusMessage('Your clipboard is empty.');
            }
        } catch (err: any) {
            // eslint-disable-next-line no-console
            console.error('[TeacherPage] Clipboard read failed:', err);
            setStatusMessage('Could not access clipboard. Please grant permission in your browser.');
            setSubmitError(`Clipboard Error: ${err?.message || String(err)}`);
        }
    };


    if (!isLoaded) return <div className="w-full h-full flex items-center justify-center text-white">Loading...</div>;
    if (isIntroActive) return <IntroPage onAnimationComplete={handleIntroComplete} />;

    // Guard: require a courseId in the URL. Prevents accidental fallback to a hardcoded curriculum.
    if (!courseId) {
        return (
            <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center max-w-md">
                    <h2 className="text-xl mb-3">Missing courseId</h2>
                    <p className="mb-4 opacity-80">Please open this page with a valid course identifier, e.g. /teacher?courseId=your_course_id</p>
                    <button
                        onClick={() => router.push('/')}
                        className="bg-[#566FE9] text-white px-6 py-2 rounded-full hover:bg-[#566FE9]/95 transition"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

// ...


    return (
        <>
            {(DEV_BYPASS || isSignedIn) ? (
                <>
                   
                    {
                        imprintingPhase !== 'LIVE_IMPRINTING' ? (
                            <div className='w-full h-full'>
                                {imprintingPhase === 'SEED_INPUT' && (<SeedInput onSubmit={handleSeedSubmit} />)}
                                {imprintingPhase === 'REVIEW_DRAFT' && (<CurriculumEditor initialDraft={curriculumDraft} onFinalize={handleReviewComplete} curriculumId={String(curriculumId)} />)}
                                {imprintingPhase === 'LO_SELECTION' && (<LoSelector learningObjectives={curriculumDraft} onSelect={handleLoSelected} />)}
                            </div>
                        ) : (
                            <>
                                <div className='flex flex-col w-full h-full items-center justify-between'>
                                    <SessionContent
                                        activeView={activeView}
                                        imprintingMode={imprinting_mode}
                                        componentButtons={componentButtons}
                                        room={room}
                                        livekitUrl={livekitUrl}
                                        livekitToken={livekitToken}
                                        isConnected={isConnected}
                                        currentDebrief={currentDebrief}
                                        topicInput={topicInput}
                                        setTopicInput={setTopicInput}
                                        handleSendConceptual={handleSendConceptual}
                                        topicInputRef={topicInputRef}
                                        sendBrowserInteraction={sendBrowserInteraction}
                                        onToggleConceptualRecording={handleToggleConceptualRecording}
                                        isConceptualRecording={isConceptualRecording}
                                        conceptualRecordingDuration={conceptualRecordingDuration}
                                        onSwitchTab={switchTab}
                                        onOpenNewTab={handleOpenNewTabWithCapture}
                                        onCloseTab={closeTab}
                                    />
                                    
                                </div>
                                {/* MODIFICATION: Conditionally render TeacherFooter. */}
                                {imprinting_mode === 'WORKFLOW' && (
                                    <TeacherFooter
                                        onUploadClick={() => fileInputRef.current?.click()}
                                        onCaptureClick={handleCaptureScreenshot}
                                        onIncreaseTimer={handleIncreaseTimer}
                                        screenshotIntervalSec={screenshotIntervalSec}
                                        onSaveScriptClick={handleSaveSetupText}
                                        onPasteClick={handlePasteFromLocal}
                                        onVSCodeClick={handleSwitchToVSCode}
                                        onSalesforceClick={handleOpenSalesforce}
                                        isRecording={isRecording}
                                        isPaused={isPaused}
                                        recordingDuration={recordingDuration}
                                        onStartRecording={handleStartRecording}
                                        onTogglePauseResume={handleTogglePauseResume}
                                        onRestartRecording={handleRestartRecording}
                                        onSubmitEpisode={handleSubmitEpisode}
                                        onShowMeClick={handleShowMe}
                                        isShowMeDisabled={(imprinting_mode as unknown as string) !== 'DEBRIEF_CONCEPTUAL' || !conceptualStarted || isRecording}
                                        onFinalizeTopicClick={handleFinalizeTopicClick}
                                        isFinalizeDisabled={!currentLO || isFinalizingLO}
                                    />
                                )}
                            </>
                        )
                    }
                    {/* Hidden file input for asset uploads */}
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAssetUpload}
                        style={{ display: 'none' }}
                        accept=".zip,.csv,.json,.py,.ipynb,.txt,.md"
                    />
                    {/* This modal is for finishing the session, which is no longer triggered by the footer but might be used elsewhere. */}
                    <SendModal
                        isModalOpen={isFinishModalOpen}
                        onClose={() => setIsFinishModalOpen(false)}
                        onSubmit={executeFinishSession}
                        title="Finish this session?"
                        description="Any unsaved recordings will be submitted before ending the session."
                    />
                    {/* This is the NEW modal for finalizing the topic. */}
                    <SendModal
                        isModalOpen={isFinalizeModalOpen}
                        onClose={() => setIsFinalizeModalOpen(false)}
                        onSubmit={executeFinalizeTopic}
                        title="Finalize this Topic?"
                        description={`This will lock the topic "${currentLO}" and prevent further questions. Are you sure you want to continue?`}
                    />
                </>
            ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                        <h2 className="text-xl mb-4">Authentication Required</h2>
                        <p className="mb-4">Please sign in to access the session.</p>
                        <button onClick={() => router.push('/login')} className="bg-[#566FE9] text-white px-6 py-2 rounded-full hover:bg-[#566FE9]/95 transition">
                            Go to Login
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}

export default function Session() {
    return (
        <Suspense fallback={
            <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center">
                    <Wand className="w-10 h-10 text-white animate-pulse mb-4 mx-auto" />
                    <p className="text-lg">Loading session...</p>
                </div>
            </div>
        }>
            <TeacherSession />
        </Suspense>
    );
}
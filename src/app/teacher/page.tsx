"use client";

import React, { useState, useEffect, useRef } from 'react';
// Import the specific buttons we need for the new footer

import { UploadButton } from '@/components/UploadButton';

// MODIFICATION: Removed Mic icon, as we'll use an SVG file instead.
import { Camera, Plus, Timer, Square, Pause, Wand, CheckCircle, Send } from 'lucide-react';
// Keep other existing imports
import dynamic from 'next/dynamic';

import { useSessionStore } from '@/lib/store';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { Room } from 'livekit-client';
import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';

import { submitImprintingEpisode, stageAsset, conversationalTurn, conversationalTurnAudio, submitSeed, processSeedDocument, fetchCurriculumDraft, saveSetupScript, finalizeLO } from '@/lib/imprinterService';
import SeedInput from '@/components/imprinting/SeedInput';
import CurriculumEditor from '@/components/imprinting/CurriculumEditor';
import LoSelector from '@/components/imprinting/LoSelector';
// --- MODIFICATION: Import the new modal component ---
import { SendModal } from '@/components/SendModal';


const IntroPage = dynamic(() => import('@/components/session/IntroPage'));
const LiveKitViewer = dynamic(() => import('@/components/session/LiveKitViewer'), { ssr: false });
const VideoViewer = dynamic(() => import('@/components/session/VideoViewer'), { ssr: false });


// --- NEW: Type definition for the AI's debrief message ---
interface DebriefMessage {
  hypothesis?: string; // For the AI's initial summary
  text: string;       // For the question or any subsequent message
}

// --- NEW: The component for the conceptual chat view ---
// MODIFICATION: This component now only displays the debrief content. The input bar is moved to the footer.
interface ConceptualDebriefViewProps {
  debrief: DebriefMessage | null;
}

const ConceptualDebriefView = ({ debrief }: ConceptualDebriefViewProps) => {
  return (
    // MODIFICATION: Changed to justify-start as the input is no longer at the bottom of this container.
    <div className="w-full h-full flex flex-col justify-start items-center text-black bg-transparent p-4 md:p-8">
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
    sendBrowserInteraction: (payload: object) => Promise<void>;
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
    currentDebrief,
    sendBrowserInteraction,
}: SessionContentProps) {
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
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full`}>
                    <ConceptualDebriefView
                        debrief={currentDebrief}
                    />
                </div>
                <div className={`${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full`}>
                    <div className="w-full h-full flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            {room ? (
                                <LiveKitViewer room={room} onInteraction={isConnected ? sendBrowserInteraction : undefined} />
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

interface TeacherFooterProps {
    onUploadClick?: () => void;
    onCaptureClick?: () => void;
    onIncreaseTimer: () => void;
    screenshotIntervalSec: number;
    onVSCodeClick?: () => void;
    isRecording: boolean;
    isPaused: boolean;
    recordingDuration: number;
    onStartRecording: () => void;
    onTogglePauseResume: () => void;
    onSubmitEpisode: () => void;
    onFinalizeTopicClick?: () => void;
    isFinalizeDisabled?: boolean;
    onFinishClick?: () => void;
    isFinishDisabled?: boolean;
}
const TeacherFooter = ({ 
    onUploadClick, 
    onCaptureClick, 
    onIncreaseTimer, 
    screenshotIntervalSec, 
    onVSCodeClick,
    isRecording,
    isPaused,
    recordingDuration,
    onStartRecording,
    onTogglePauseResume,
    onSubmitEpisode,
    onFinalizeTopicClick,
    isFinalizeDisabled,
    onFinishClick,
    isFinishDisabled
}: TeacherFooterProps) => {
    const formatTime = (seconds: number) => {
        const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
        const secs = String(seconds % 60).padStart(2, '0');
        return `${mins}:${secs}`;
    };

    return (
        <footer className="fixed bottom-[32px] w-full h-[60px] p-4 z-20">
            <div className="relative w-full h-full">
                <div 
                  className="absolute top-1/2 left-1/2 flex items-center gap-6" 
                  style={{ transform: 'translate(-50%, -50%)' }}
                >
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
                    
                    <button
                        onClick={onVSCodeClick}
                        title="Switch to VS Code Environment"
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#566FE91A] hover:bg-[#566FE9]/20 transition-colors`}
                    >
                        <img src="/vscode.svg" alt="Switch to VS Code" className="w-6 h-6" />
                    </button>

                    <UploadButton
                        isVisible={true}
                        onClick={onUploadClick}
                    />

                    {!isRecording ? (
                        <button
                            onClick={onStartRecording}
                            className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#E9EBFD] hover:bg-[#566FE9]/20 transition-colors`}
                        >
                            <img src="/RecordStart.svg" alt="Start Recording" className="w-6 h-6" />
                        </button>
                    ) : (
                        <div className="w-[202px] h-[56px] flex items-center justify-between bg-[#EBEFFF] py-2 pr-2 pl-4 rounded-[600px]">
                            <div className='flex items-center gap-2'>
                               <Timer className="w-6 h-6 text-[#566FE9]" />
                               <span className="font-semibold text-sm text-[#566FE9] font-[500] text-[16px]">{formatTime(recordingDuration)}</span>
                            </div>
                            <div className='flex items-center gap-2'>
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
                    
                    <button
                        onClick={onFinalizeTopicClick}
                        disabled={isFinalizeDisabled}
                        title={isFinalizeDisabled ? 'Select a topic to finalize' : 'Finalize Topic'}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${isFinalizeDisabled ? 'bg-[#E9EBFD] cursor-not-allowed' : 'bg-[#566FE91A] hover:bg-[#566FE9]/20'}`}
                    >
                        <img
                            src="/Correct.svg"
                            alt="Finalize Topic"
                            className={`w-6 h-6 ${isFinalizeDisabled ? 'filter grayscale' : ''}`}
                        />
                    </button>
                    <button
                        onClick={onFinishClick}
                        disabled={isFinishDisabled}
                        className="w-[134px] h-[56px] flex items-center justify-center rounded-[50px] py-4 px-5 bg-[#566FE9] text-white font-semibold text-sm hover:bg-[#4a5fd1] transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
                    >
                        Finish Session
                    </button>
                </div>
            </div>
        </footer>
    );
};

interface ConceptualFooterProps {
    userInput: string;
    onUserInput: (value: string) => void;
    onSubmit: () => void;
    inputRef: React.RefObject<HTMLTextAreaElement | null>;
    onToggleRecording: () => void;
    isRecording: boolean;
    recordingDuration: number;
}
// --- MODIFICATION START ---
const ConceptualFooter = ({ userInput, onUserInput, onSubmit, inputRef, onToggleRecording, isRecording, recordingDuration }: ConceptualFooterProps) => {
    return (
        <footer className="fixed bottom-0 left-0 w-full z-20 flex justify-center p-4" style={{ paddingBottom: '32px' }}>
            <div className="w-full max-w-[850px] h-14 flex-shrink-0">
                <div className="flex items-center w-full h-full bg-white/[0.01] shadow-[inset_0px_0px_60px_rgba(86,111,233,0.2)]  border border-[#C7CCF8] rounded-[600px] pl-4 pr-2 py-2">
                    <textarea
                        ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                        value={userInput}
                        onChange={(e) => onUserInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
                        className="w-full h-full bg-transparent focus:outline-none resize-none text-lg text-black placeholder-gray-500"
                        placeholder="Define the in-scope and out-of-scope boundaries for this LO..."
                    />
                    <div className="flex items-center gap-1">
                        <button 
                            onClick={onToggleRecording} 
                            className={`p-3 rounded-md transition-colors flex items-center justify-center ${isRecording ? 'bg-red-600 hover:bg-red-500' : 'hover:bg-gray-200'}`} 
                            title={isRecording ? 'Stop and send' : 'Record an audio answer'}
                        >
                            {/* {isRecording ? (
                                <img src="/Stop.svg" alt="Stop Recording" className="w-5 h-5" />
                            ) : (
                                <img src="/Mic.svg" alt="Start Recording" className="w-5 h-5" />
                            )} */}
                        </button>
                        <button onClick={onSubmit} className="p-3 rounded-full bg-[#566FE9]">
                            <Send className="w-5 h-5 text-white" />
                        </button>
                    </div>
                </div>
                {isRecording && (
                <div className="mt-2 text-sm text-[#566FE9] flex items-center gap-2">
                    <Timer className="w-4 h-4" />
                    <span>Recording... {String(Math.floor(recordingDuration / 60)).padStart(2, '0')}:{String(recordingDuration % 60).padStart(2, '0')}</span>
                </div>
                )}
            </div>
        </footer>
    );
};
// --- MODIFICATION END ---


export default function Session() {
    // --- MOCK BACKEND FLAG ---
    const MOCK_BACKEND = (process.env.NEXT_PUBLIC_MOCK_BACKEND ?? 'false') === 'true';
    // eslint-disable-next-line no-console
    console.log('[TeacherPage] INIT', { MOCK_BACKEND, now: new Date().toISOString() });

    const { activeView, setActiveView, imprinting_mode, setImprintingMode, currentLO, setCurrentLO, imprintingPhase, setImprintingPhase, curriculumDraft, setCurriculumDraft } = useSessionStore();
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


    // --- MODIFICATION: Add state for the finish confirmation modal ---
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);


    
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
    } = useLiveKitSession(
        shouldInitializeLiveKit ? lkRoomName : '',
        shouldInitializeLiveKit ? lkUserName : '',
        (courseId as string) || undefined
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

    // VNC auto-create and cache restore removed

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
    const [isFinalizingLO, setIsFinalizingLO] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('Session started. Waiting for initial prompt.');
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    type RecordedPacket = { interaction_type?: string } & Record<string, unknown>;

    const packetsRef = useRef<RecordedPacket[]>([]);
    const [packetsCount, setPacketsCount] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const audioBlobRef = useRef<Blob | null>(null);
    const [stagedAssets, setStagedAssets] = useState<{ filename: string; role: string; asset_id: string }[]>([]);
    const [isStartAllowed, setIsStartAllowed] = useState<boolean>(true);
    const [screenshotIntervalSec, setScreenshotIntervalSec] = useState<number>(10);
    const [isShowMeRecording, setIsShowMeRecording] = useState<boolean>(false);
    const showMeQuestionRef = useRef<string | null>(null);
    
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const curriculumId = courseId as string;

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
                    const tracks = conceptualMediaRecorderRef.current.stream.getTracks();
                    conceptualMediaRecorderRef.current.stop();
                    tracks.forEach((t) => t.stop());
                }
                setIsConceptualRecording(false);
                await new Promise((r) => setTimeout(r, 150));
                const blob = new Blob(conceptualAudioChunksRef.current, { type: 'audio/webm' });
                const audio_b64 = await convertBlobToWavDataURL(blob);
                conceptualAudioChunksRef.current = [];
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
                return;
            }
            setStatusMessage('Capturing screenshot...');
            await sendBrowser('screenshot');
            setStatusMessage('Manual screenshot captured.');
        } catch (e: any) {
            console.error('[TeacherPage] captureScreenshot ✗', e);
            setStatusMessage(`Screenshot failed: ${e?.message || e}`);
        }
    };

    const handleFinalizeTopic = async () => {
        if (!currentLO) {
            setSubmitError('Please select a Topic (LO) before finalizing.');
            return;
        }
        const ok = window.confirm(`Finalize topic "${currentLO}"? This stops further questions for this topic.`);
        if (!ok) return;
        setIsFinalizingLO(true);
        setSubmitMessage(null);
        setSubmitError(null);
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

    const handleReviewComplete = () => setImprintingPhase('LO_SELECTION');
    const handleLoSelected = (loName: string) => { setCurrentLO(loName); setImprintingPhase('LIVE_IMPRINTING'); };

    const currentDebrief = useSessionStore((s) => s.debriefMessage);
    const setDebriefMessage = useSessionStore((s) => s.setDebriefMessage);
    const conceptualStarted = useSessionStore((s) => s.conceptualStarted);
    const setConceptualStarted = useSessionStore((s) => s.setConceptualStarted);
    const [topicInput, setTopicInput] = useState<string>('');
    const topicInputRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const conceptualMediaRecorderRef = useRef<MediaRecorder | null>(null);
    const conceptualAudioChunksRef = useRef<BlobPart[]>([]);
    const [isConceptualRecording, setIsConceptualRecording] = useState<boolean>(false);
    const [conceptualRecordingDuration, setConceptualRecordingDuration] = useState(0);
    const conceptualRecordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const handleStartRecording = async () => {
        if (!user?.id) return;
        try {
            setSubmitMessage(null);
            setSubmitError(null);
            setImprintingMode('WORKFLOW');
            setActiveView('vnc');
            setStatusMessage('Initializing recording on server...');
            setPacketsCount(0);
            setStagedAssets([]);
            setIsPaused(false);
            await sendBrowser('start_recording', { session_id: roomName, screenshot_interval_sec: screenshotIntervalSec, environment: imprintingEnvironment });

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
        } catch (err: any) {
            console.error('[TeacherPage] handleStartRecording: error', err);
            setSubmitError(err?.message || 'Failed to start recording');
            setIsRecording(false);
        }
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

    const handleStopRecording = async () => {
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        } catch (err) { console.warn('Stop recording warning:', err); }
        setIsRecording(false);
    };
    
    const handleTogglePauseResume = () => {
        if (!mediaRecorderRef.current) return;
        if (isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            try { void sendBrowser('resume_recording'); } catch {}
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            try { void sendBrowser('pause_recording'); } catch {}
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    const handleSubmitEpisode = async () => {
        setSubmitMessage(null);
        setSubmitError(null);
        setIsSubmitting(true);
        setIsStartAllowed(false);
        if (isRecording) {
            await handleStopRecording();
            await new Promise((r) => setTimeout(r, 150));
        }

        try {
            if (MOCK_BACKEND) {
                setStatusMessage('Submitting episode (Mocked)...');
                await new Promise(r => setTimeout(r, 2000));
                const fakeResponse = {
                    action: 'SPEAK_AND_INITIATE_DEBRIEF',
                    text: "Great question! Let's break that down."
                };
                setSubmitMessage(`Submitted. Processed mock actions.`);
                if (fakeResponse.action === 'SPEAK_AND_INITIATE_DEBRIEF') {
                    setDebriefMessage({ text: fakeResponse.text });
                    setImprintingMode('DEBRIEF_CONCEPTUAL');
                    setActiveView('excalidraw');
                    setConceptualStarted(true);
                    setIsStartAllowed(false);
                    setStatusMessage('AI has a question for you (Mocked).');
                    setTimeout(() => topicInputRef.current?.focus(), 0);
                }
                return;
            }

            const blob = audioBlobRef.current;
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
                } catch (e) {
                    console.warn('[TeacherPage] Audio upload failed:', e);
                }
            }

            setStatusMessage('Submitting episode via browser pod...');
            const staged_assets_compact = [
                ...stagedAssets,
                ...(audioAssetId ? [{ asset_id: audioAssetId, filename: 'narration.wav', role: 'AUDIO_NARRATION' }] : []),
            ];
            const payload = {
                expert_id: user?.id || 'expert',
                session_id: roomName,
                curriculum_id: String(curriculumId),
                staged_assets: staged_assets_compact,
                current_lo: currentLO || undefined,
                imprinting_mode: imprinting_mode,
                imprinting_environment: imprintingEnvironment,
                environment: imprintingEnvironment,
                in_response_to_question: (isShowMeRecording && showMeQuestionRef.current) ? showMeQuestionRef.current : undefined,
            };
            await sendBrowser('stop_recording', payload);
            setSubmitMessage('Submitted. Processing on server...');
            setStatusMessage('Episode submitted. AI is analyzing...');

            packetsRef.current = [];
            setPacketsCount(0);
            audioChunksRef.current = [];
            audioBlobRef.current = null;
            setStagedAssets([]);
            setIsShowMeRecording(false);
            showMeQuestionRef.current = null;
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to submit');
        } finally {
            setIsSubmitting(false);
        }
    };

    const executeFinishSession = async () => {
        try {
            setIsFinishModalOpen(false);
            if (isRecording || audioBlobRef.current) {
                await handleSubmitEpisode();
            } else if (isRecording) {
                await handleStopRecording();
            }
        } catch (e: any) {
            setSubmitError(e?.message || 'Failed to finish session');
        }
    };

    const handleFinishClick = () => setIsFinishModalOpen(true);
    const handleIncreaseTimer = () => setScreenshotIntervalSec(prev => prev + 5);
    const handleSwitchToVSCode = () => {
        setImprintingEnvironment('vscode');
        void sendBrowser('navigate', { url: 'http://localhost:4600' });
        setStatusMessage('Switched to VS Code environment.');
    };

    if (!isLoaded) return <div className="w-full h-full flex items-center justify-center text-white">Loading...</div>;
    if (isIntroActive) return <IntroPage onAnimationComplete={handleIntroComplete} />;

    if (!courseId) {
        return (
            <div className="w-full h-full flex items-center justify-center text-white">
                <div className="text-center max-w-md">
                    <h2 className="text-xl mb-3">Missing courseId</h2>
                    <p className="mb-4 opacity-80">Please open this page with a valid course identifier, e.g. /teacher?courseId=your_course_id</p>
                    <button onClick={() => router.push('/')} className="bg-[#566FE9] text-white px-6 py-2 rounded-full hover:bg-[#566FE9]/95 transition">
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    return (
        <>
            {(DEV_BYPASS || isSignedIn) ? (
                <>
                    {imprintingPhase !== 'LIVE_IMPRINTING' ? (
                        <div className='w-full h-full'>
                            {imprintingPhase === 'SEED_INPUT' && (<SeedInput onSubmit={handleSeedSubmit} />)}
                            {imprintingPhase === 'REVIEW_DRAFT' && (<CurriculumEditor initialDraft={curriculumDraft} onFinalize={handleReviewComplete} curriculumId={String(curriculumId)} />)}
                            {imprintingPhase === 'LO_SELECTION' && (<LoSelector learningObjectives={curriculumDraft} onSelect={handleLoSelected} />)}
                        </div>
                    ) : (
                        <>
                            <div className={`flex flex-col w-full h-full items-center justify-between ${imprinting_mode === 'DEBRIEF_CONCEPTUAL' ? 'pb-[120px]' : ''}`}>
                                <SessionContent
                                    activeView={activeView}
                                    imprintingMode={imprinting_mode}
                                    componentButtons={componentButtons}
                                    room={room}
                                    livekitUrl={livekitUrl}
                                    livekitToken={livekitToken}
                                    isConnected={isConnected}
                                    currentDebrief={currentDebrief}
                                    sendBrowserInteraction={sendBrowserInteraction}
                                />
                            </div>
                            {imprinting_mode === 'WORKFLOW' ? (
                                <TeacherFooter
                                    onUploadClick={() => fileInputRef.current?.click()}
                                    onCaptureClick={handleCaptureScreenshot}
                                    onIncreaseTimer={handleIncreaseTimer}
                                    screenshotIntervalSec={screenshotIntervalSec}
                                    onVSCodeClick={handleSwitchToVSCode}
                                    isRecording={isRecording}
                                    isPaused={isPaused}
                                    recordingDuration={recordingDuration}
                                    onStartRecording={handleStartRecording}
                                    onTogglePauseResume={handleTogglePauseResume}
                                    onSubmitEpisode={handleSubmitEpisode}
                                    onFinalizeTopicClick={handleFinalizeTopic}
                                    isFinalizeDisabled={!currentLO || isFinalizingLO}
                                    onFinishClick={handleFinishClick}
                                    isFinishDisabled={isSubmitting}
                                />
                            ) : (
                                <ConceptualFooter
                                    userInput={topicInput}
                                    onUserInput={setTopicInput}
                                    onSubmit={handleSendConceptual}
                                    inputRef={topicInputRef}
                                    onToggleRecording={handleToggleConceptualRecording}
                                    isRecording={isConceptualRecording}
                                    recordingDuration={conceptualRecordingDuration}
                                />
                            )}
                        </>
                    )}
                    <SendModal
                        isModalOpen={isFinishModalOpen}
                        onClose={() => setIsFinishModalOpen(false)}
                        onSubmit={executeFinishSession}
                        title="Finish this session?"
                        description="Any unsaved recordings will be submitted before ending the session."
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
"use client";

import React, { useState, useEffect, useRef } from 'react';
// Import the specific buttons we need for the new footer
import { MicButton } from '@/components/MicButton';
import { UploadButton } from '@/components/UploadButton';
import { MessageButton } from '@/components/MessageButton';
// MODIFICATION: Added Send icon for the new chat input
import { Camera, Plus, Timer, Square, Pause, Wand, CheckCircle, Send } from 'lucide-react';
// Keep other existing imports
import dynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { useBrowserActionExecutor } from '@/hooks/useBrowserActionExecutor';
import { useBrowserInteractionSensor } from '@/hooks/useBrowserInteractionSensor';
import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sphere from '@/components/Sphere';
import { submitImprintingEpisode, stageAsset, conversationalTurn, submitSeed, processSeedDocument, fetchCurriculumDraft, saveSetupScript, finalizeLO } from '@/lib/imprinterService';
import SeedInput from '@/components/imprinting/SeedInput';
import CurriculumEditor from '@/components/imprinting/CurriculumEditor';
import LoSelector from '@/components/imprinting/LoSelector';

// --- (existing imports remain unchanged) ---

const IntroPage = dynamic(() => import('@/components/session/IntroPage'));
const VncViewer = dynamic(() => import('@/components/session/VncViewer'), { ssr: false });
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
  inputRef: React.RefObject<HTMLInputElement>;
}

const ConceptualDebriefView = ({ debrief, userInput, onUserInput, onSubmit, inputRef }: ConceptualDebriefViewProps) => {
  return (
    // MODIFICATION: Changed background to light, and default text to black
    <div className="w-full h-full flex flex-col justify-between items-center text-black bg-transparent p-4 md:p-8">
      {/* Debrief Content */}
      <div className="w-full max-w-4xl space-y-8 overflow-y-auto pr-4 animate-fade-in">
        {debrief && (
          <div className="space-y-4">
            {debrief.hypothesis && (
              // MODIFICATION: Set hypothesis text color to #566FE9
              <p className="text-lg text-[#566FE9] leading-relaxed">{debrief.hypothesis}</p>
            )}
            {/* MODIFICATION: Set question text color to black */}
            <p className="text-lg text-black leading-relaxed">{debrief.text}</p>
          </div>
        )}
      </div>

      {/* Input Bar with specific styling */}
      <div className="w-full max-w-[850px] h-[86px] flex-shrink-0">
          <div className="flex items-center justify-between w-full h-full bg-transparent border border-[#C7CCF8] rounded-xl pl-4 pr-[6px] pt-[6px] pb-1">
            <textarea
              ref={inputRef as any}
              value={userInput}
              onChange={(e) => onUserInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSubmit(); } }}
              className="w-full h-full bg-transparent focus:outline-none resize-none text-lg text-black placeholder-gray-500"
              placeholder="Define the in-scope and out-of-scope boundaries for this LO..."
            />
            <button onClick={onSubmit} className="self-start p-3 rounded-md bg-blue-600 hover:bg-blue-500 transition-colors">
              <Send className="w-5 h-5 text-white" />
            </button>
          </div>
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
    vncUrl: string;
    controlPanel?: React.ReactNode;
    vncOverlay?: React.ReactNode;
    handleVncInteraction: (interaction: { action: string; x: number; y: number }) => void;
    // Props for the debrief view
    currentDebrief: DebriefMessage | null;
    topicInput: string;
    setTopicInput: (value: string) => void;
    handleSendConceptual: () => void;
    topicInputRef: React.RefObject<HTMLInputElement>;
}

function SessionContent({
    activeView,
    imprintingMode,
    componentButtons,
    vncUrl,
    controlPanel,
    vncOverlay,
    handleVncInteraction,
    // Destructure new props
    currentDebrief,
    topicInput,
    setTopicInput,
    handleSendConceptual,
    topicInputRef
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
                        userInput={topicInput}
                        onUserInput={setTopicInput}
                        onSubmit={handleSendConceptual}
                        inputRef={topicInputRef}
                    />
                </div>
                <div className={`${activeView === 'vnc' ? 'block' : 'hidden'} w-full h-full`}>
                    <div className="w-full h-full flex flex-col md:flex-row gap-4">
                        <div className="flex-1">
                            <VncViewer url={vncUrl} onInteraction={handleVncInteraction} overlay={vncOverlay} />
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
    // ...
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
    // ...
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
    // ...
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
    // ...
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
}

function encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    // ...
    const numChannels = 1; // mono
    const bytesPerSample = 2; // 16-bit PCM
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataView = floatTo16BitPCM(samples);
    const buffer = new ArrayBuffer(44 + dataView.byteLength);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataView.byteLength, true);
    writeString(view, 8, 'WAVE');
    // fmt chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // PCM chunk size
    view.setUint16(20, 1, true); // linear PCM
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    // data chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataView.byteLength, true);

    // copy PCM data
    new Uint8Array(buffer, 44).set(new Uint8Array(dataView.buffer));
    return buffer;
}

async function convertBlobToWavDataURL(blob: Blob): Promise<string> {
    // ...
    const arr = await blobToArrayBufferSafe(blob);
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const decoded: AudioBuffer = await audioCtx.decodeAudioData(arr.slice(0));
    const mono = interleaveToMono(decoded);
    const wavBuffer = encodeWAV(mono, decoded.sampleRate);
    const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
    // Convert to Data URL (base64)
    const dataUrl: string = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onloadend = () => resolve(fr.result as string);
        fr.onerror = reject;
        fr.readAsDataURL(wavBlob);
    });
    try { audioCtx.close(); } catch {}
    return dataUrl;
}

// --- (TeacherFooter and ConceptualFooter remain unchanged) ---
interface TeacherFooterProps {
    onUploadClick?: () => void;
    onCaptureClick?: () => void;
    onIncreaseTimer: () => void;
    screenshotIntervalSec: number;
    onSaveScriptClick?: () => void;
    isRecording: boolean;
    isPaused: boolean;
    recordingDuration: number;
    onStartRecording: () => void;
    onTogglePauseResume: () => void;
    onSubmitEpisode: () => void;
    onShowMeClick?: () => void;
    isShowMeDisabled?: boolean;
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
    onSaveScriptClick,
    isRecording,
    isPaused,
    recordingDuration,
    onStartRecording,
    onTogglePauseResume,
    onSubmitEpisode,
    onShowMeClick,
    isShowMeDisabled,
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
        <footer className="absolute bottom-[32px] w-full h-[60px] p-4 z-10">
            <div className="relative w-full h-full">
                {/* Left Group */}
                <div 
                  className="absolute top-1/2 right-1/2 flex items-center gap-6" 
                  style={{ marginRight: '150px', transform: 'translateY(-50%)' }}
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
                                aria-label="Increase timer by 5 seconds"
                           >
                               <Plus className="w-5 h-5 text-[#566FE9]" />
                           </button>
                           <button
                                onClick={onCaptureClick}
                                className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5fd1] transition-colors"
                                aria-label="Capture Screenshot"
                           >
                               <Camera className="w-5 h-5 text-white" />
                           </button>
                        </div>
                    </div>

                    <button
                        onClick={onSaveScriptClick}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#566FE91A] hover:bg-[#566FE9]/20 transition-colors`}
                        aria-label="Save Script"
                    >
                        <img src="/Code.svg" alt="Save Script" className="w-6 h-6" />
                    </button>

                    <UploadButton
                        isVisible={true}
                        onClick={onUploadClick}
                    />
                    <MicButton />
                </div>

                {/* Right Group */}
                <div 
                  className="absolute top-1/2 left-1/2 flex items-center gap-6" 
                  style={{ marginLeft: '150px', transform: 'translateY(-50%)' }}
                >
                    <MessageButton />
                    
                    {!isRecording ? (
                        <button
                            onClick={onStartRecording}
                            className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#E9EBFD] hover:bg-[#566FE9]/20 transition-colors`}
                            aria-label="Start Recording"
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
                                    aria-label="Stop and Submit Episode"
                               >
                                   <Square className="w-5 h-5 text-white" />
                               </button>
                            </div>
                        </div>
                    )}
                    
                    <button
                        onClick={onShowMeClick}
                        disabled={isShowMeDisabled}
                        title={isShowMeDisabled ? 'Only available during conceptual debrief' : 'Start a demonstration'}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${isShowMeDisabled ? 'bg-[#E9EBFD] cursor-not-allowed' : 'bg-[#566FE91A] hover:bg-[#566FE9]/20'}`}
                        aria-label="Start Demonstration"
                    >
                        <img
                            src="./demonstrate.svg"
                            alt="Start Demonstration"
                            className={`w-6 h-6 ${isShowMeDisabled ? 'filter grayscale' : ''}`}
                        />
                    </button>

                    <button
                        onClick={onFinalizeTopicClick}
                        disabled={isFinalizeDisabled}
                        title={isFinalizeDisabled ? 'Select a topic to finalize' : 'Finalize Topic'}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${isFinalizeDisabled ? 'bg-[#E9EBFD] cursor-not-allowed' : 'bg-[#566FE91A] hover:bg-[#566FE9]/20'}`}
                        aria-label="Finalize Topic"
                    >
                        <img
                            src="./Correct.svg"
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
    onFinishClick?: () => void;
    isFinishDisabled?: boolean;
}
const ConceptualFooter = ({ onFinishClick, isFinishDisabled }: ConceptualFooterProps) => {
    return (
        <footer className="absolute bottom-[32px] w-full h-[60px] p-4 z-10">
            <div className="relative w-full h-full">
                {/* Left Group */}
                <div
                    className="absolute top-1/2 right-1/2 flex items-center gap-6"
                    style={{ marginRight: '150px', transform: 'translateY(-50%)' }}
                >
                    <MicButton />
                </div>
                {/* Right Group */}
                <div
                    className="absolute top-1/2 left-1/2 flex items-center gap-6"
                    style={{ marginLeft: '150px', transform: 'translateY(-50%)' }}
                >
                    <MessageButton />
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


export default function Session() {
    const { activeView, setActiveView, imprinting_mode, setImprintingMode, currentLO, setCurrentLO, imprintingPhase, setImprintingPhase, curriculumDraft, setCurriculumDraft } = useSessionStore();
    const [isIntroActive, setIsIntroActive] = useState(false);
    const handleIntroComplete = () => setIsIntroActive(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const SESSION_DEBUG = false;
    const DEV_BYPASS = true;
    const courseId = searchParams.get('courseId');
    const courseTitle = searchParams.get('title');

    if (SESSION_DEBUG) console.log('Session page - Course details:', { courseId, courseTitle });

    useEffect(() => {
        if (SESSION_DEBUG) console.log('Session page auth state:', { isLoaded, isSignedIn, userId: user?.id });
    }, [isLoaded, isSignedIn, user?.id]);

    useEffect(() => {
        if (DEV_BYPASS) return;
        if (isLoaded && !isSignedIn) {
            if (SESSION_DEBUG) console.log('User not authenticated, redirecting to login');
            const timeoutId = setTimeout(() => {
                if (!isSignedIn) {
                    if (SESSION_DEBUG) console.log('Authentication state still not synced, forcing redirect to login');
                    window.location.href = '/login';
                }
            }, 2000);

            return () => clearTimeout(timeoutId);
        }
    }, [isLoaded, isSignedIn, router]);

    const roomName = user?.id ? `session-${user.id}` : `session-${Date.now()}`;
    const vncViewerUrl = process.env.NEXT_PUBLIC_VNC_VIEWER_URL || 'ws://localhost:6901';
    const vncActionUrl = process.env.NEXT_PUBLIC_VNC_WEBSOCKET_URL || 'ws://localhost:8765';
    const sessionBubbleUrl = process.env.NEXT_PUBLIC_SESSION_BUBBLE_URL;

    const [viewerUrl, setViewerUrl] = useState<string>(vncViewerUrl);
    const [actionUrl, setActionUrl] = useState<string>(vncActionUrl);
    const [viewerUrlInput, setViewerUrlInput] = useState<string>(vncViewerUrl);
    const [actionUrlInput, setActionUrlInput] = useState<string>(vncActionUrl);

    const { isVNCConnected, disconnectVNC, executeBrowserAction, setOnVNCResponse, awaitVNCOpen } = useBrowserActionExecutor(null, actionUrl);
    const { connectToVNCSensor, disconnectFromVNCSensor } = useBrowserInteractionSensor(null);

    if (SESSION_DEBUG) console.log(`Zustand Sanity Check: SessionPage re-rendered. Active view is now: '${activeView}'`);

    const handleSelectPractical = () => {
        setImprintingMode('WORKFLOW');
        setActiveView('vnc');
    };

    const handleSelectConceptual = () => {
        setImprintingMode('DEBRIEF_CONCEPTUAL');
        setActiveView('excalidraw');
        setIsConceptualStarted(false);
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
    const packetsRef = useRef<any[]>([]);
    const [packetsCount, setPacketsCount] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const audioBlobRef = useRef<Blob | null>(null);
    const [stagedAssets, setStagedAssets] = useState<{ filename: string; role: string; asset_id: string }[]>([]);
    const [isStartAllowed, setIsStartAllowed] = useState<boolean>(true);
    const [screenshotIntervalSec, setScreenshotIntervalSec] = useState<number>(10);
    const [timeToNextScreenshot, setTimeToNextScreenshot] = useState<number | null>(null);
    const [isShowMeRecording, setIsShowMeRecording] = useState<boolean>(false);
    const showMeQuestionRef = useRef<string | null>(null);
    
    const [recordingDuration, setRecordingDuration] = useState(0);
    const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const curriculumId = courseId || 'pandas_expert_test_01';

    const handleSeedSubmit = async (content: string) => {
        setImprintingPhase('SEED_PROCESSING');
        try {
            await processSeedDocument({ curriculum_id: String(curriculumId), content });
            const draft = await fetchCurriculumDraft(String(curriculumId));
            setCurriculumDraft(draft);
            setImprintingPhase('REVIEW_DRAFT');
        } catch (error) {
            console.error('Seed processing failed:', error);
            setImprintingPhase('SEED_INPUT');
        }
    };

    const handleCaptureScreenshot = async () => {
        try {
            if (!isRecording) {
                setStatusMessage('Start recording to capture and persist screenshots.');
                return;
            }
            setStatusMessage('Capturing screenshot...');
            const resp = await sendAndAwait('browser_screenshot', {}, 'screenshot');
            console.log('[EpisodeControls] Manual screenshot response:', resp);
            setStatusMessage('Manual screenshot captured.');
            setTimeToNextScreenshot(screenshotIntervalSec);
        } catch (e: any) {
            console.error('Manual screenshot failed:', e);
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
        let actions: any[];
        try {
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) throw new Error('JSON must be an array of action objects');
            actions = parsed;
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
            console.error('Save setup script failed:', err);
            setSubmitError(err?.message || 'Failed to save setup script');
            setStatusMessage(`Error: ${err?.message || 'Failed to save setup script'}`);
        } finally {
            setIsSavingSetup(false);
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
            console.error('Finalize topic failed:', err);
            setSubmitError(err?.message || 'Failed to finalize topic');
            setStatusMessage(`Error: ${err?.message || 'Failed to finalize topic'}`);
        } finally {
            setIsFinalizingLO(false);
        }
    };

    const handleReviewComplete = () => setImprintingPhase('LO_SELECTION');
    const handleLoSelected = (loName: string) => { setCurrentLO(loName); setImprintingPhase('LIVE_IMPRINTING'); };

    const [currentDebrief, setCurrentDebrief] = useState<DebriefMessage | null>(null);
    const [isConceptualStarted, setIsConceptualStarted] = useState<boolean>(false);
    const [topicInput, setTopicInput] = useState<string>('');
    const [seedText, setSeedText] = useState<string>('');
    const topicInputRef = useRef<HTMLInputElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    type PendingResolver = { id: string; expectAction: string; resolve: (resp: any) => void; reject: (err: any) => void; timeoutId: any };
    const pendingResolversRef = useRef<PendingResolver[]>([]);

    useEffect(() => {
        setOnVNCResponse((resp: any) => {
            try {
                console.log('[TeacherPage] VNC response received:', resp);
                const idx = pendingResolversRef.current.findIndex(p => p.expectAction === resp?.action);
                if (idx >= 0) {
                    const [pending] = pendingResolversRef.current.splice(idx, 1);
                    clearTimeout(pending.timeoutId);
                    pending.resolve(resp);
                }
            } catch (e) { console.error('[TeacherPage] Error handling VNC response:', e); }
        });
    }, [setOnVNCResponse]);

    const sendAndAwait = async (tool_name: string, parameters: any, expectedAction?: string, timeoutMs = 15000): Promise<any> => {
        const expectAction = expectedAction || tool_name;
        return new Promise(async (resolve, reject) => {
            const id = `${expectAction}-${Date.now()}`;
            const timeoutId = setTimeout(() => {
                const idx = pendingResolversRef.current.findIndex(p => p.id === id);
                if (idx >= 0) pendingResolversRef.current.splice(idx, 1);
                reject(new Error(`Timed out waiting for action '${expectAction}' response`));
            }, timeoutMs);
            pendingResolversRef.current.push({ id, expectAction, resolve, reject, timeoutId });
            try {
                await executeBrowserAction({ tool_name, parameters });
            } catch (err) {
                clearTimeout(timeoutId);
                const idx = pendingResolversRef.current.findIndex(p => p.id === id);
                if (idx >= 0) pendingResolversRef.current.splice(idx, 1);
                reject(err);
            }
        });
    };

    const handleSubmitSeed = async () => {
        if (!user?.id || !seedText.trim()) return;
        try {
            setStatusMessage('Submitting seed...');
            const resp = await submitSeed({ expert_id: user.id, session_id: roomName, curriculum_id: String(curriculumId), content: seedText });
            setStatusMessage(resp?.message || 'Seed submitted.');
            setSeedText('');
        } catch (e: any) { setStatusMessage(`Seed submit failed: ${e?.message || e}`); }
    };

    const handleStartRecording = async () => {
        if (!user?.id) return;
        try {
            console.log('[SessionPage] Sending START_RECORDING command to backend...', { roomName, actionUrl });
            setSubmitMessage(null);
            setSubmitError(null);
            setImprintingMode('WORKFLOW');
            setStatusMessage('Initializing recording on server...');
            setPacketsCount(0);
            setStagedAssets([]);
            setIsPaused(false);

            if (!isVNCConnected) {
                setStatusMessage('Connecting to VNC backend...');
                try {
                    await awaitVNCOpen(15000);
                    console.log('[SessionPage] VNC connection established. Proceeding to start recording.');
                } catch (connErr: any) {
                    console.error('[SessionPage] Failed to establish VNC connection before start:', connErr);
                    setSubmitError(connErr?.message || 'Failed to connect to VNC backend');
                    setStatusMessage(connErr?.message || 'Failed to connect to VNC backend');
                    setIsRecording(false);
                    return;
                }
            }

            const startResp = await sendAndAwait('start_recording', { session_id: roomName, screenshot_interval_sec: screenshotIntervalSec }, 'start_recording', 45000);
            console.log('[SessionPage] Backend acknowledged start_recording:', startResp);
            setTimeToNextScreenshot(screenshotIntervalSec);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' } as any);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => { audioBlobRef.current = new Blob(audioChunksRef.current, { type: 'audio/webm' }); console.log('[SessionPage] Audio blob ready.', { size: audioBlobRef.current.size }); };
            recorder.start();
            mediaRecorderRef.current = recorder;

            setIsRecording(true);
            setStatusMessage('Recording... Actions are being captured by the server.');
            
            setRecordingDuration(0);
            if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err: any) {
            console.error('Failed to start recording:', err);
            setSubmitError(err?.message || 'Failed to start recording');
            setIsRecording(false);
        }
    };

    const handleVncInteraction = (interaction: { action: string; x: number; y: number }) => {
        if (!isRecording) {
            console.warn('Ignoring VNC interaction because recording is not active.');
            setStatusMessage("Click 'Start Recording' to begin imprinting.");
            return;
        }
        console.log('[SessionPage] Sensor detected interaction, sending to VNC listener:', interaction);
        executeBrowserAction({ tool_name: 'browser_click', parameters: { x: interaction.x, y: interaction.y } });
    };

    const handleSendConceptual = async () => {
        if (imprinting_mode !== 'DEBRIEF_CONCEPTUAL') return;
        const msg = (topicInput || '').trim();
        if (!msg) return;

        setTopicInput('');
        setStatusMessage('Sending response...');

        try {
            const resp = await conversationalTurn({
                curriculum_id: curriculumId,
                session_id: roomName,
                imprinting_mode: 'DEBRIEF_CONCEPTUAL',
                latest_expert_response: msg,
                current_lo: currentLO || undefined
            });
            const aiText = resp?.text || 'Got it. Let\'s continue.';
            
            setCurrentDebrief({ text: aiText });
            setStatusMessage('AI replied.');

            if (!(aiText && /\?/.test(aiText))) {
                setIsStartAllowed(true);
            } else {
                setIsStartAllowed(false);
            }
        } catch (e: any) {
            setStatusMessage(`Conceptual turn failed: ${e?.message || e}`);
            setCurrentDebrief({ text: `Sorry, I encountered an error. ${e?.message}` });
        }
    };

    const handleShowMe = async () => {
        if (imprinting_mode !== 'DEBRIEF_CONCEPTUAL' || !isConceptualStarted) return;
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
        console.log('[SessionPage] Sending STOP_RECORDING command to backend...');
        if (recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        } catch (err) { console.warn('Stop recording warning:', err); }
        try {
            const stopResp = await sendAndAwait('stop_recording', {}, 'stop_recording');
            console.log('[SessionPage] Backend acknowledged stop_recording:', stopResp);
            if (stopResp?.count != null) setPacketsCount(stopResp.count);
            setStatusMessage(`Recording stopped. Server captured ${stopResp?.count || 0} actions.`);
        } catch (err: any) {
            console.error('Failed to stop backend recording:', err);
            setStatusMessage(`Error: ${err?.message || 'Failed to stop recording'}`);
        } finally {
            setIsRecording(false);
            setTimeToNextScreenshot(null);
        }
    };
    
    const handleTogglePauseResume = () => {
        if (!mediaRecorderRef.current) return;
        
        if (isPaused) {
            mediaRecorderRef.current.resume();
            setIsPaused(false);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } else {
            mediaRecorderRef.current.pause();
            setIsPaused(true);
            if (recordingIntervalRef.current) {
                clearInterval(recordingIntervalRef.current);
            }
        }
    };

    useEffect(() => {
        if (!isRecording) return;
        setTimeToNextScreenshot((prev) => (prev == null ? screenshotIntervalSec : prev));
        const id = setInterval(() => {
            setTimeToNextScreenshot((prev) => {
                if (prev == null) return screenshotIntervalSec;
                const next = prev - 1;
                return next <= 0 ? screenshotIntervalSec : next;
            });
        }, 1000);
        return () => clearInterval(id);
    }, [isRecording, screenshotIntervalSec]);

    const handleSubmitEpisode = async () => {
        console.log('[EpisodeControls] Submit Episode clicked');
        setSubmitMessage(null);
        setSubmitError(null);
        setIsSubmitting(true);
        setIsStartAllowed(false);
        try {
            setStatusMessage('Stopping recording and preparing data...');
            if (isRecording) {
                await handleStopRecording();
                await new Promise(r => setTimeout(r, 250));
            }

            const audioBlob = audioBlobRef.current || (audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null);
            if (!audioBlob) throw new Error('No audio captured. Please record before submitting.');

            const audio_b64: string = await convertBlobToWavDataURL(audioBlob);

            setStatusMessage('Fetching recorded actions from server...');
            const actionsResp = await sendAndAwait('get_recorded_actions', { session_id: roomName }, 'get_recorded_actions');
            const packets: any[] = Array.isArray(actionsResp?.packets) ? actionsResp.packets : [];
            const periodicCount = packets.filter(p => p?.interaction_type === 'periodic_screenshot').length;
            console.log('[EpisodeControls] Recorded actions ready:', { total: packets.length, periodic_screenshots: periodicCount, source: actionsResp?.source });
            setStatusMessage(`Submitting episode... (${packets.length} actions, ${periodicCount} periodic screenshots)`);

            const response = await submitImprintingEpisode({
                expert_id: user?.id || 'unknown_expert',
                session_id: roomName,
                curriculum_id: String(curriculumId),
                narration: 'Expert narration from episode.',
                audio_b64,
                expert_actions: packets,
                staged_assets: stagedAssets,
                current_lo: currentLO || undefined,
                in_response_to_question: isShowMeRecording && showMeQuestionRef.current ? showMeQuestionRef.current : undefined,
            });

            console.log('[EpisodeControls] Submit success', response);
            setSubmitMessage(`Submitted. Processed ${packets.length} actions.`);
            setStatusMessage('Episode submitted. AI is analyzing...');

            if (response?.action === 'SPEAK_AND_INITIATE_DEBRIEF') {
                const aiText = response.text || '';
                
                let hypothesis = 'Here is what I understood from your demonstration.';
                let question = aiText;
                const lastSentenceEnd = Math.max(aiText.lastIndexOf('. '), aiText.lastIndexOf('! '), aiText.lastIndexOf('? '));

                if (lastSentenceEnd > -1 && lastSentenceEnd < aiText.length - 2) {
                     hypothesis = aiText.substring(0, lastSentenceEnd + 1);
                     question = aiText.substring(lastSentenceEnd + 2).trim();
                }

                setCurrentDebrief({
                  hypothesis: hypothesis,
                  text: question
                });
                
                setImprintingMode('DEBRIEF_CONCEPTUAL');
                setActiveView('excalidraw');
                setIsConceptualStarted(true);
                setIsStartAllowed(false);
                setStatusMessage(`AI has a question for you.`);
                setTimeout(() => topicInputRef.current?.focus(), 0);
            } else {
                setImprintingMode('WORKFLOW');
                setIsStartAllowed(true);
                setStatusMessage(response?.text || 'Analysis complete. Ready for next demonstration.');
            }

            packetsRef.current = [];
            setPacketsCount(0);
            audioChunksRef.current = [];
            audioBlobRef.current = null;
            setStagedAssets([]);
            setIsShowMeRecording(false);
            showMeQuestionRef.current = null;
        } catch (err: any) {
            console.error('Submit episode failed:', err);
            setSubmitError(err?.message || 'Failed to submit');
            setStatusMessage(`Error: ${err?.message || 'Failed to submit'}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssetUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id) return;
        const role = window.prompt("Role for this file? (e.g., STARTER_CODE, DATASET)", "STARTER_CODE") || "STARTER_CODE";
        setStatusMessage(`Uploading asset: ${file.name}...`);
        try {
            const assetInfo = await stageAsset({ expert_id: user.id, session_id: roomName, curriculum_id: String(curriculumId), file });
            const item = { filename: assetInfo.filename || file.name, role, asset_id: assetInfo.asset_id };
            setStagedAssets(prev => [...prev, item]);
            setStatusMessage(`Asset '${file.name}' staged successfully as ${role}.`);
        } catch (e: any) {
            setStatusMessage(`Error uploading asset: ${e?.message || e}`);
        } finally {
            if (event.target) event.target.value = '';
        }
    };

    const handleRemoveStagedAsset = (index: number) => setStagedAssets(prev => prev.filter((_, i) => i !== index));

    const handleFinish = async () => {
        console.log('[EpisodeControls] Finish Session clicked');
        try {
            setSubmitMessage(null);
            setSubmitError(null);
            if (isRecording) {
                await handleStopRecording();
                await new Promise(r => setTimeout(r, 200));
            }
            if (packetsCount > 0 && audioBlobRef.current) {
                await handleSubmitEpisode();
            } else {
                if (!submitMessage) setSubmitMessage('Session finished. No episode to submit.');
            }
        } catch (err: any) {
            console.error('Finish session encountered an error:', err);
        } finally {
            try { disconnectVNC(); } catch {}
            try { disconnectFromVNCSensor(); } catch {}
            if (!submitMessage) setSubmitMessage(prev => prev || 'Session finished.');
            console.log('[EpisodeControls] Finish Session complete');
        }
    };

    useEffect(() => {
        if (sessionBubbleUrl) {
            if (SESSION_DEBUG) console.log("Connecting to session-bubble services...");
            connectToVNCSensor(sessionBubbleUrl);
        }
        return () => {
            disconnectVNC();
            disconnectFromVNCSensor();
        };
    }, [sessionBubbleUrl, disconnectVNC, connectToVNCSensor, disconnectFromVNCSensor]);

    const handleIncreaseTimer = () => {
        setScreenshotIntervalSec(prev => prev + 5);
    };

    if (!isLoaded) return <div className="w-full h-full flex items-center justify-center text-white">Loading...</div>;
    if (isIntroActive) return <IntroPage onAnimationComplete={handleIntroComplete} />;

    return (
        <>
            {(DEV_BYPASS || isSignedIn) ? (
                <>
                    <Sphere />
                    {
                        false ? (
                            <div className='w-full h-full'>
                                {imprintingPhase === 'SEED_INPUT' && (<SeedInput onSubmit={handleSeedSubmit} />)}
                                {imprintingPhase === 'SEED_PROCESSING' && (<div className="w-full h-full flex items-center justify-center text-white">Analyzing your curriculum... Please wait.</div>)}
                                {imprintingPhase === 'REVIEW_DRAFT' && (<CurriculumEditor initialDraft={curriculumDraft} onFinalize={handleReviewComplete} curriculumId={String(curriculumId)} />)}
                                {imprintingPhase === 'LO_SELECTION' && (<LoSelector learningObjectives={curriculumDraft} onSelect={handleLoSelected} />)}
                            </div>
                        ) : (
                            <>
                                <div className='flex flex-col w-full h-full items-center justify-between pb-28'>
                                    <SessionContent
                                        activeView={activeView}
                                        imprintingMode={imprinting_mode}
                                        componentButtons={componentButtons}
                                        vncUrl={viewerUrl}
                                        vncOverlay={null}
                                        handleVncInteraction={handleVncInteraction}
                                        currentDebrief={currentDebrief}
                                        topicInput={topicInput}
                                        setTopicInput={setTopicInput}
                                        handleSendConceptual={handleSendConceptual}
                                        topicInputRef={topicInputRef}
                                    />
                                    {/* The bottom debug panel is now visually separate from the main content */}
                                    <div className="fixed bottom-100 left-0 right-0 z-50">
                                        <div className="mx-auto w-full md:w-[90%] lg:w-[70%] px-3 pb-3">
                                            <div className="bg-[#0F1226]/90 border border-[#2A2F4A] backdrop-blur-md rounded-t-xl p-3 text-white">
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                                    <div className="flex flex-wrap gap-2 items-center">
                                                        <div className="ml-2 flex items-start gap-2">
                                                            <textarea value={setupActionsText} onChange={(e) => setSetupActionsText(e.target.value)} placeholder='Paste setup actions JSON array, e.g. [{"action":"open_url","url":"https://example.com"}]' className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-64 h-16 text-xs" />
                                                        </div>
                                                        <input ref={fileInputRef} type="file" onChange={handleAssetUpload} className="hidden" />
                                                        {isShowMeRecording && (<span title={showMeQuestionRef.current ? `In response to: ${showMeQuestionRef.current}` : 'Show Me demo active'} className="ml-2 inline-flex items-center gap-1 rounded-full border border-indigo-400/70 bg-indigo-600/20 px-2 py-1 text-[11px] text-indigo-200"><span className="inline-block h-2 w-2 rounded-full bg-indigo-300 animate-pulse" />Show Me demo active</span>)}
                                                    </div>
                                                    <div className="text-xs text-gray-300 space-y-1 md:text-right">
                                                        <div><span className="text-gray-400">Mic:</span> {isRecording ? 'Recording' : 'Idle'}</div>
                                                        <div><span className="text-gray-400">Packets:</span> {packetsCount}</div>
                                                        <div><span className="text-gray-400">Action WS:</span> {isVNCConnected ? 'Connected' : 'Disconnected'}</div>
                                                        <div className="opacity-80 break-all"><span className="text-gray-400">Viewer:</span> {viewerUrl}</div>
                                                        <div className="opacity-80 break-all"><span className="text-gray-400">Action:</span> {actionUrl}</div>
                                                        {viewerUrl === actionUrl && (<div className="text-amber-300">Warning: Viewer and Action URLs are identical. Use 6901 for viewer, 8765 for action.</div>)}
                                                        {statusMessage && <div className="text-sky-300">{statusMessage}</div>}
                                                        {submitMessage && <div className="text-emerald-300">{submitMessage}</div>}
                                                        {submitError && <div className="text-red-300">{submitError}</div>}
                                                        {stagedAssets.length > 0 && (<div className="mt-2"><div className="text-gray-400">Staged assets:</div><ul className="mt-1 max-h-24 overflow-y-auto space-y-1">{stagedAssets.map((a, i) => (<li key={`${a.asset_id}-${i}`} className="flex items-center justify-between gap-2 text-[11px] bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1"><div className="truncate" title={`${a.filename} (${a.role})`}><span className="text-white">{a.filename}</span><span className="text-gray-400"> · {a.role}</span></div><button onClick={() => handleRemoveStagedAsset(i)} className="text-red-300 hover:text-red-200" disabled={isSubmitting}>Remove</button></li>))}</ul></div>)}
                                                        <div className="mt-2 flex flex-col gap-2">
                                                            <div className="flex items-center gap-2"><input type="text" value={seedText} onChange={(e) => setSeedText(e.target.value)} className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-64" placeholder="Seed text (curriculum seed)" /><button onClick={handleSubmitSeed} className="rounded-md px-3 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-500">Submit Seed</button></div>
                                                            <div className="flex gap-2"><input type="text" value={viewerUrlInput} onChange={(e) => setViewerUrlInput(e.target.value)} className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-52" placeholder="Viewer URL (ws://localhost:6901)" /><input type="text" value={actionUrlInput} onChange={(e) => setActionUrlInput(e.target.value)} className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-52" placeholder="Action URL (ws://localhost:8765)" /><button onClick={() => { setViewerUrl(viewerUrlInput); setActionUrl(actionUrlInput); }} className="rounded-md px-3 py-1 text-xs font-medium bg-slate-600 hover:bg-slate-500">Apply URLs</button></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {imprinting_mode === 'WORKFLOW' ? (
                                <TeacherFooter
                                    onUploadClick={() => fileInputRef.current?.click()}
                                    onCaptureClick={handleCaptureScreenshot}
                                    onIncreaseTimer={handleIncreaseTimer}
                                    screenshotIntervalSec={screenshotIntervalSec}
                                    onSaveScriptClick={handleSaveSetupText}
                                    isRecording={isRecording}
                                    isPaused={isPaused}
                                    recordingDuration={recordingDuration}
                                    onStartRecording={handleStartRecording}
                                    onTogglePauseResume={handleTogglePauseResume}
                                    onSubmitEpisode={handleSubmitEpisode}
                                    onShowMeClick={handleShowMe}
                                    isShowMeDisabled={imprinting_mode !== 'DEBRIEF_CONCEPTUAL' || !isConceptualStarted || isRecording}
                                    onFinalizeTopicClick={handleFinalizeTopic}
                                    isFinalizeDisabled={!currentLO || isFinalizingLO}
                                    onFinishClick={handleFinish}
                                    isFinishDisabled={isSubmitting}
                                />
                                ) : (
                                <ConceptualFooter
                                    onFinishClick={handleFinish}
                                    isFinishDisabled={isSubmitting}
                                />
                                )}
                            </>
                        )
                    }
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
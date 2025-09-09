"use client";

import React, { useState, useEffect, useRef } from 'react';
// Import the specific buttons we need for the new footer
import { MicButton } from '@/components/MicButton';
import { UploadButton } from '@/components/UploadButton';
import { MessageButton } from '@/components/MessageButton';
// MODIFICATION: Added Send icon for the new chat input and Minus icon for the timer
import { Camera, Plus, Timer, Square, Pause, Wand, CheckCircle, Send, Minus } from 'lucide-react';
// Keep other existing imports
import dynamic from 'next/dynamic';
import Image from 'next/image';
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
import { SendModal } from '@/components/SendModal';
// --- MODIFICATION: Import the new StatusPill component ---
import { StatusPill } from '@/components/StatusPill';
// --- NEW: Import the SubmissionProgress component ---
import { SubmissionProgress } from '@/components/SubmissionProgress';


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
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
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
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
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
    topicInputRef: React.RefObject<HTMLTextAreaElement | null>;
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
    onDecreaseTimer: () => void;
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
    onDecreaseTimer,
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
                <div 
                  className="absolute top-1/2 right-1/2 flex items-center gap-6" 
                  style={{ marginRight: '150px', transform: 'translateY(-50%)' }}
                >
                    <div className="w-[250px] h-[56px] flex items-center justify-between bg-transparent border border-[#C7CCF8] py-2 pr-2 pl-4 rounded-[600px]">
                        <div className='flex items-center gap-2'>
                           <Timer className="w-6 h-6 text-[#566FE9]" />
                           <span className="font-semibold text-sm text-[#566FE9] font-[500] text-[16px]">{formatTime(screenshotIntervalSec)}</span>
                        </div>
                        <div className='flex items-center gap-2'>
                           <button 
                                onClick={onDecreaseTimer}
                                className="w-[40px] h-[40px] rounded-full flex items-center justify-center bg-[#566FE9]/10 hover:bg-[#566FE9]/20 transition-colors"
                           >
                               <Minus className="w-5 h-5 text-[#566FE9]" />
                           </button>
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
                        onClick={onSaveScriptClick}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center bg-[#566FE91A] hover:bg-[#566FE9]/20 transition-colors`}
                    >
                        <img src="/Code.svg" alt="Save Script" className="w-6 h-6" />
                    </button>
                    <UploadButton
                        isVisible={true}
                        onClick={onUploadClick}
                    />
                    <MicButton />
                </div>
                <div 
                  className="absolute top-1/2 left-1/2 flex items-center gap-6" 
                  style={{ marginLeft: '150px', transform: 'translateY(-50%)' }}
                >
                    <MessageButton />
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
                        onClick={onShowMeClick}
                        disabled={isShowMeDisabled}
                        title={isShowMeDisabled ? 'Only available during conceptual debrief' : 'Start a demonstration'}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${isShowMeDisabled ? 'bg-[#E9EBFD] cursor-not-allowed' : 'bg-[#566FE91A] hover:bg-[#566FE9]/20'}`}
                    >
                        <img
                            src="/demonstrate.svg"
                            alt="Start Demonstration"
                            className={`w-6 h-6 ${isShowMeDisabled ? 'filter grayscale' : ''}`}
                        />
                    </button>
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
    onFinishClick?: () => void;
    isFinishDisabled?: boolean;
    onShowMeClick?: () => void;
    isShowMeDisabled?: boolean;
}
const ConceptualFooter = ({ onFinishClick, isFinishDisabled, onShowMeClick, isShowMeDisabled }: ConceptualFooterProps) => {
    return (
        <footer className="absolute bottom-[32px] w-full h-[60px] p-4 z-10">
            <div className="relative w-full h-full">
                <div
                    className="absolute top-1/2 right-1/2 flex items-center gap-6"
                    style={{ marginRight: '150px', transform: 'translateY(-50%)' }}
                >
                    <MicButton />
                </div>
                <div
                    className="absolute top-1/2 left-1/2 flex items-center gap-6"
                    style={{ marginLeft: '150px', transform: 'translateY(-50%)' }}
                >
                    <MessageButton />
                    <button
                        onClick={onShowMeClick}
                        disabled={isShowMeDisabled}
                        title={isShowMeDisabled ? 'Answer first, then click Show Me' : 'Switch to browser to demonstrate'}
                        className={`w-[56px] h-[56px] rounded-[50%] flex items-center justify-center transition-colors ${isShowMeDisabled ? 'bg-[#E9EBFD] cursor-not-allowed' : 'bg-[#566FE91A] hover:bg-[#566FE9]/20'}`}
                    >
                        <img
                            src="./demonstrate.svg"
                            alt="Start Demonstration"
                            className={`w-6 h-6 ${isShowMeDisabled ? 'filter grayscale' : ''}`}
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


export default function Session() {
    // --- MOCK BACKEND FLAG ---
    const MOCK_BACKEND = false;

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
    const [isFinishModalOpen, setIsFinishModalOpen] = useState(false);
    
    // --- NEW STATE MANAGEMENT FOR STATUS PILL ---
    const [pillMessage, setPillMessage] = useState<string>('Waiting for your input...');
    const [pillType, setPillType] = useState<'ai' | 'notification'>('ai');
    const pillTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // --- HELPER FUNCTION FOR TEMPORARY NOTIFICATIONS ---
    const showNotification = (message: string, duration: number = 3000) => {
        if (pillTimeoutRef.current) {
            clearTimeout(pillTimeoutRef.current);
        }
        setPillMessage(message);
        setPillType('notification');
        pillTimeoutRef.current = setTimeout(() => {
            setPillMessage('Waiting for your input...');
            setPillType('ai');
            pillTimeoutRef.current = null;
        }, duration);
    };
    
    if (SESSION_DEBUG) console.log('Session page - Course details:', { courseId, courseTitle });

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
    const vncViewerUrl = process.env.NEXT_PUBLIC_VNC_VIEWER_URL || 'ws://localhost:6901';
    const vncActionUrl = process.env.NEXT_PUBLIC_VNC_WEBSOCKET_URL || 'ws://localhost:8765';
    const sessionBubbleUrl = process.env.NEXT_PUBLIC_SESSION_BUBBLE_URL;

    const [viewerUrl, setViewerUrl] = useState<string>(vncViewerUrl);
    const [actionUrl, setActionUrl] = useState<string>(vncActionUrl);
    const [viewerUrlInput, setViewerUrlInput] = useState<string>(vncViewerUrl);
    const [actionUrlInput, setActionUrlInput] = useState<string>(vncActionUrl);

    const { isVNCConnected, disconnectVNC, executeBrowserAction, setOnVNCResponse, awaitVNCOpen } = useBrowserActionExecutor(null, actionUrl);
    const { connectToVNCSensor, disconnectFromVNCSensor } = useBrowserInteractionSensor(null);

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
    // --- MODIFIED: isSubmitting is now used for the progress indicator ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingSetup, setIsSavingSetup] = useState(false);
    const [isFinalizingLO, setIsFinalizingLO] = useState(false);
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    
    // --- NEW: State for submission progress UI ---
    const [submissionProgress, setSubmissionProgress] = useState(0);
    const [submissionMessage, setSubmissionMessage] = useState('');

    type VNCActionResponse = { action?: string } & Record<string, unknown>;
    type RecordedPacket = { interaction_type?: string } & Record<string, unknown>;

    const packetsRef = useRef<RecordedPacket[]>([]);
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

    const handleCaptureScreenshot = async () => {
        try {
            if (!isRecording) {
                showNotification('Start recording to capture screenshots.');
                return;
            }
            setPillMessage('Capturing screenshot...');
            await sendAndAwait('browser_screenshot', {}, 'screenshot');
            showNotification('Screenshot sent');
            setTimeToNextScreenshot(screenshotIntervalSec);
        } catch (e: any) {
             setSubmitError(`Screenshot failed: ${e?.message || e}`);
             setPillMessage('Waiting for your input...');
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
            setPillMessage('Saving script...');
            const resp = await saveSetupScript({ curriculum_id: String(curriculumId), lo_name: currentLO, actions });
            showNotification('Setup script saved.');
            setSubmitMessage(resp?.message || `Setup script saved for ${currentLO}.`);
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to save setup script');
             setPillMessage('Waiting for your input...');
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
            setPillMessage(`Finalizing "${currentLO}"...`);
            const resp = await finalizeLO({ curriculum_id: String(curriculumId), lo_name: currentLO });
            showNotification(`Topic "${currentLO}" finalized.`);
            setSubmitMessage(resp?.message || `Topic "${currentLO}" finalized.`);
            setIsStartAllowed(true);
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to finalize topic');
            setPillMessage('Waiting for your input...');
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
    const topicInputRef = useRef<HTMLTextAreaElement | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    type PendingResolver = { id: string; expectAction: string; resolve: (resp: VNCActionResponse) => void; reject: (err: any) => void; timeoutId: any };
    const pendingResolversRef = useRef<PendingResolver[]>([]);

    useEffect(() => {
        setOnVNCResponse((resp: VNCActionResponse) => {
            try {
                const idx = pendingResolversRef.current.findIndex(p => p.expectAction === resp?.action);
                if (idx >= 0) {
                    const [pending] = pendingResolversRef.current.splice(idx, 1);
                    clearTimeout(pending.timeoutId);
                    pending.resolve(resp);
                }
            } catch (e) { console.error('[TeacherPage] Error handling VNC response:', e); }
        });
    }, [setOnVNCResponse]);

    const sendAndAwait = async (
        tool_name: string,
        parameters: Record<string, unknown>,
        expectedAction?: string,
        timeoutMs = 15000
    ): Promise<VNCActionResponse> => {
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
            setPillMessage('Submitting seed...');
            await submitSeed({ expert_id: user.id, session_id: roomName, curriculum_id: String(curriculumId), content: seedText });
            showNotification('Seed submitted.');
            setSeedText('');
        } catch (e: any) { setSubmitError(`Seed submit failed: ${e?.message || e}`); }
    };

    const handleStartRecording = async () => {
        if (!user?.id) return;
        try {
            setSubmitMessage(null);
            setSubmitError(null);
            setImprintingMode('WORKFLOW');
            setActiveView('vnc');
            setPillMessage('Initializing...');
            setPacketsCount(0);
            setStagedAssets([]);
            setIsPaused(false);

            if (!MOCK_BACKEND) {
                if (!isVNCConnected) {
                     setPillMessage('Connecting to backend...');
                    try {
                        await awaitVNCOpen(15000);
                    } catch (connErr: any) {
                        setSubmitError(connErr?.message || 'Failed to connect to VNC backend');
                        setIsRecording(false);
                        return;
                    }
                }
                await sendAndAwait('start_recording', { session_id: roomName, screenshot_interval_sec: screenshotIntervalSec }, 'start_recording', 45000);
            }
            setTimeToNextScreenshot(screenshotIntervalSec);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => { if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data); };
            recorder.onstop = () => { audioBlobRef.current = new Blob(audioChunksRef.current, { type: 'audio/webm' }); };
            recorder.start();
            mediaRecorderRef.current = recorder;

            setIsRecording(true);
            showNotification('Demonstration started');
            
            setRecordingDuration(0);
            if(recordingIntervalRef.current) clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to start recording');
            setIsRecording(false);
            setPillMessage('Waiting for your input...');
        }
    };

    const handleVncInteraction = (interaction: { action: string; x: number; y: number }) => {
        if (!isRecording) return;
        executeBrowserAction({ tool_name: 'browser_click', parameters: { x: interaction.x, y: interaction.y } });
    };

    const handleSendConceptual = async () => {
        if (imprinting_mode !== 'DEBRIEF_CONCEPTUAL') return;
        const msg = (topicInput || '').trim();
        if (!msg) return;

        setTopicInput('');
        setPillMessage('AI is thinking...');

        if (MOCK_BACKEND) {
            await new Promise(r => setTimeout(r, 1500));
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
            setCurrentDebrief(newDebrief);
            setPillMessage('AI has a question for you...');
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
                setCurrentDebrief({ text: aiText });
                setPillMessage('AI replied. Waiting for your input...');
                setIsStartAllowed(!(aiText && /\?/.test(aiText)));
            } catch (e: any) {
                setCurrentDebrief({ text: `Sorry, I encountered an error. ${e?.message}` });
                setPillMessage('Waiting for your input...');
            }
        }
    };

    const handleShowMe = async () => {
        if (imprinting_mode !== 'DEBRIEF_CONCEPTUAL' || !isConceptualStarted) return;
        const lastQ = currentDebrief?.text || '';
        if (!lastQ) return;
        const msg = (topicInput || '').trim();
        if (!msg) {
             showNotification('Type what you want to demonstrate, then click Show Me.');
            setTimeout(() => topicInputRef.current?.focus(), 0);
            return;
        }
        showMeQuestionRef.current = lastQ;
        setIsShowMeRecording(true);
        setImprintingMode('WORKFLOW');
        setActiveView('vnc');
        setPillMessage('Switching to browser for "Show Me" demo...');
        setTopicInput('');
        if (!isRecording) {
            try { await handleStartRecording(); }
            catch (e: any) { 
                setSubmitError(`Failed to start Show Me recording: ${e?.message || e}`);
                setPillMessage('Waiting for your input...');
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
        try {
            if (!MOCK_BACKEND) {
                type StopRecordingResp = VNCActionResponse & { count?: number };
                const stopResp = (await sendAndAwait('stop_recording', {}, 'stop_recording')) as StopRecordingResp;
                if (typeof stopResp?.count === 'number') setPacketsCount(stopResp.count);
            }
             showNotification('Recording stopped.');

        } catch (err: any) {
             setSubmitError(`Error: ${err?.message || 'Failed to stop recording'}`);
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

    // --- MODIFIED: handleSubmitEpisode now updates progress ---
    const handleSubmitEpisode = async () => {
        setSubmitMessage(null);
        setSubmitError(null);
        setIsSubmitting(true);
        setIsStartAllowed(false);
        setSubmissionProgress(0);
        setSubmissionMessage("Finalizing recording...");

        if (isRecording) {
            await handleStopRecording();
            await new Promise((r) => setTimeout(r, 150));
        }

        try {
            if (MOCK_BACKEND) {
                setSubmissionProgress(50);
                setSubmissionMessage("Submitting episode...");
                await new Promise(r => setTimeout(r, 2000));
                
                const fakeResponse = {
                    action: 'SPEAK_AND_INITIATE_DEBRIEF',
                    text: "Great question! On the real axis, the root locus exists between an odd number of poles and zeros. Count the total number of poles and zeros to the right of any point on the real axis. If it's odd, that section is part of the root locus."
                };
                
                setSubmitMessage(`Submitted. Processed 123 fake actions.`);
                setSubmissionProgress(80);
                setSubmissionMessage("Analysing your teachings...");
                await new Promise(r => setTimeout(r, 2000));
                setSubmissionProgress(100);

                if (fakeResponse.action === 'SPEAK_AND_INITIATE_DEBRIEF') {
                    const aiText = fakeResponse.text || '';
                    let hypothesis = 'Great question!';
                    let question = aiText.replace('Great question! ', '');
                    
                    setCurrentDebrief({ hypothesis, text: question });
                    setImprintingMode('DEBRIEF_CONCEPTUAL');
                    setActiveView('excalidraw');
                    setIsConceptualStarted(true);
                    setIsStartAllowed(false);
                    setPillMessage('AI has a question for you...');
                    setTimeout(() => topicInputRef.current?.focus(), 0);
                }
                return; 
            }

            const blob = audioBlobRef.current;
            setSubmissionProgress(20);
            setSubmissionMessage("Preparing assets...");
            const audio_b64: string = blob ? await convertBlobToWavDataURL(blob) : '';
            
            setSubmissionProgress(40);
            setSubmissionMessage("Fetching recorded actions...");
            const actionsResp = await sendAndAwait('get_recorded_actions', { session_id: roomName }, 'get_recorded_actions');
            const packets: RecordedPacket[] = Array.isArray((actionsResp as any)?.packets) ? (actionsResp as any).packets : [];
            
            setSubmissionProgress(60);
            setSubmissionMessage(`Submitting episode...`);
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

            setSubmitMessage(`Submitted. Processed ${packets.length} actions.`);
            setSubmissionProgress(80);
            setSubmissionMessage("Analysing your teachings...");
            await new Promise(r => setTimeout(r, 1500)); // Simulate analysis time
            setSubmissionProgress(100);

            if (response?.action === 'SPEAK_AND_INITIATE_DEBRIEF') {
                const aiText = (response as any).text || '';
                const hasQuestion = !!aiText && /\?/.test(aiText);
                if (hasQuestion) {
                    setImprintingMode('DEBRIEF_CONCEPTUAL');
                    setActiveView('excalidraw');
                    setIsConceptualStarted(true);
                    setIsStartAllowed(false);
                    setPillMessage('AI has a question for you...');
                } else {
                    setImprintingMode('WORKFLOW');
                    setIsStartAllowed(true);
                    setPillMessage('Waiting for your input...');
                }
            }
            
            packetsRef.current = [];
            setPacketsCount(0);
            audioChunksRef.current = [];
            audioBlobRef.current = null;
            setStagedAssets([]);
            setIsShowMeRecording(false);
            showMeQuestionRef.current = null;
        } catch (err: any) {
            setSubmitError(err?.message || 'Failed to submit');
            setPillMessage('Waiting for your input...');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAssetUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !user?.id) return;
        const role = window.prompt("Role for this file? (e.g., STARTER_CODE, DATASET)", "STARTER_CODE") || "STARTER_CODE";
        try {
            const assetInfo = await stageAsset({ expert_id: user.id, session_id: roomName, curriculum_id: String(curriculumId), file });
            const item = { filename: assetInfo.filename || file.name, role: role || "ASSET", asset_id: assetInfo.asset_id };
            setStagedAssets(prev => [...prev, item]);
            showNotification(`${file.name} uploaded.`);
        } catch (e: any) {
            showNotification(`Error uploading asset: ${e?.message || e}`);
        } finally {
            if (event.target) event.target.value = '';
        }
    };

    const handleRemoveStagedAsset = (index: number) => setStagedAssets(prev => prev.filter((_, i) => i !== index));

    const executeFinishSession = async () => {
        try {
            if (isRecording) {
                await handleStopRecording();
                await new Promise(r => setTimeout(r, 200));
            }
            if (packetsCount > 0 || (MOCK_BACKEND && activeView === 'vnc')) {
                await handleSubmitEpisode();
            } else {
                setSubmitMessage('Session finished.');
            }
        } catch (err: any) {
            console.error('Finish session error:', err);
        } finally {
            try { disconnectVNC(); } catch {}
            try { disconnectFromVNCSensor(); } catch {}
        }
    };

    const handleFinishClick = () => {
        setIsFinishModalOpen(true);
    };

    useEffect(() => {
        if (sessionBubbleUrl) {
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

    const handleDecreaseTimer = () => {
        setScreenshotIntervalSec(prev => Math.max(5, prev - 5));
    };


    if (!isLoaded) return <div className="w-full h-full flex items-center justify-center text-white">Loading...</div>;
    if (isIntroActive) return <IntroPage onAnimationComplete={handleIntroComplete} />;

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

    return (
        <>
            {/* --- NEW: Conditionally render the submission progress UI --- */}
            {isSubmitting && (
                <SubmissionProgress
                    progress={submissionProgress}
                    message={submissionMessage}
                />
            )}
            {(DEV_BYPASS || isSignedIn) ? (
                <>
                    <Sphere />
                    {/* --- RENDER THE NEW STATUS PILL --- */}
                    <StatusPill message={pillMessage} type={pillType} />
                    
                    {
                        false ? (
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
                                        vncUrl={viewerUrl}
                                        vncOverlay={null}
                                        handleVncInteraction={handleVncInteraction}
                                        currentDebrief={currentDebrief}
                                        topicInput={topicInput}
                                        setTopicInput={setTopicInput}
                                        handleSendConceptual={handleSendConceptual}
                                        topicInputRef={topicInputRef}
                                    />
                                    {/* --- THIS IS THE PANEL THAT HAS BEEN REMOVED --- */}
                                </div>
                                {imprinting_mode === 'WORKFLOW' ? (
                                <TeacherFooter
                                    onUploadClick={() => fileInputRef.current?.click()}
                                    onCaptureClick={handleCaptureScreenshot}
                                    onIncreaseTimer={handleIncreaseTimer}
                                    onDecreaseTimer={handleDecreaseTimer}
                                    screenshotIntervalSec={screenshotIntervalSec}
                                    onSaveScriptClick={handleSaveSetupText}
                                    isRecording={isRecording}
                                    isPaused={isPaused}
                                    recordingDuration={recordingDuration}
                                    onStartRecording={handleStartRecording}
                                    onTogglePauseResume={handleTogglePauseResume}
                                    onSubmitEpisode={handleSubmitEpisode}
                                    onShowMeClick={handleShowMe}
                                    isShowMeDisabled={(imprinting_mode as unknown as string) !== 'DEBRIEF_CONCEPTUAL' || !isConceptualStarted || isRecording}
                                    onFinalizeTopicClick={handleFinalizeTopic}
                                    isFinalizeDisabled={!currentLO || isFinalizingLO}
                                    onFinishClick={handleFinishClick}
                                    isFinishDisabled={isSubmitting}
                                />
                                ) : (
                                <ConceptualFooter
                                    onFinishClick={handleFinishClick}
                                    isFinishDisabled={isSubmitting}
                                    onShowMeClick={handleShowMe}
                                    isShowMeDisabled={!isConceptualStarted || isRecording}
                                />
                                )}
                            </>
                        )
                    }
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
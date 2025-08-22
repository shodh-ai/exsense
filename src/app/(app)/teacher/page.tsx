"use client";

import React, { useState, useEffect, useRef } from 'react';
import Footer from '@/components/Footer';
import { Room } from 'livekit-client';

import dynamic from 'next/dynamic';
import { useSessionStore } from '@/lib/store';
import { useLiveKitSession } from '@/hooks/useLiveKitSession';
import { useBrowserActionExecutor } from '@/hooks/useBrowserActionExecutor';
import { useBrowserInteractionSensor } from '@/hooks/useBrowserInteractionSensor';
import { useUser, SignedIn, SignedOut } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Sphere from '@/components/Sphere';
import { submitImprintingEpisode, stageAsset, conversationalTurn, submitSeed } from '@/lib/imprinterService';

// File: exsense/src/app/session/page.tsx



const IntroPage = dynamic(() => import('@/components/session/IntroPage'));
type TipTapEditorPropsLocal = { className?: string; initialContent?: string; placeholder?: string; onUpdate?: (html: string) => void };
const TipTapEditor = dynamic<TipTapEditorPropsLocal>(() => import('@/components/session/TipTapEditor'), { ssr: false });
const VncViewer = dynamic(() => import('@/components/session/VncViewer'), { ssr: false });
const VideoViewer = dynamic(() => import('@/components/session/VideoViewer'), { ssr: false });
const MessageDisplay = dynamic(() => import('@/components/session/MessageDisplay'), { ssr: false });

// Fallback room for when LiveKit is not connected
const fallbackRoom = new Room();
type ViewKey = ReturnType<typeof useSessionStore.getState>['activeView'];

// Define a type for button configuration, including both active and inactive icon paths
interface ButtonConfig {
    key: ViewKey;
    label: string;
    inactiveImagePath: string; // Path for icon when button is inactive
    activeImagePath: string;   // Path for icon when button is active
}

// SessionContent component to render the main session UI
interface SessionContentProps {
    activeView: ViewKey;
    setActiveView: (view: ViewKey) => void;
    componentButtons: ButtonConfig[];
    vncUrl: string;
    controlPanel?: React.ReactNode;
    vncOverlay?: React.ReactNode;
    handleVncInteraction: (interaction: { action: string; x: number; y: number }) => void;
}

function SessionContent({ activeView, setActiveView, componentButtons, vncUrl, controlPanel, vncOverlay, handleVncInteraction }: SessionContentProps) {
    return (
        <div className='w-full h-full flex flex-col items-center justify-between'>
            <div className="w-full flex justify-center pt-[20px]">
                <div className="p-0 w-full md:w-1/2 lg:w-1/3 h-[53px] bg-[#566FE9]/10 rounded-full flex justify-center items-center">
                    {componentButtons.map(({ key, label, inactiveImagePath, activeImagePath }) => (
                        <button
                            key={key}
                            onClick={() => setActiveView(key)}
                            className={`w-[32.5%] h-[45px] flex items-center justify-center gap-2 rounded-full border-transparent font-jakarta-sans font-semibold-600 text-sm transition-all duration-200 ${activeView === key ? 'bg-[#566FE9] text-[#ffffff]' : 'text-[#566FE9] bg-transparent'}`}
                        >
                            <img
                                src={activeView === key ? activeImagePath : inactiveImagePath}
                                alt={label}
                                className="w-[20px] h-[20px]"
                            />
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            
            <div className="flex-grow relative w-full h-full">
                <div className={`${activeView === 'excalidraw' ? 'block' : 'hidden'} w-full h-full`}>
                    <TipTapEditor className="w-full h-full rounded-xl border border-[#2A2F4A] bg-[#0F1226]/60" />
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

// --- Audio utils: convert recorded blob (webm/ogg) to WAV ---
async function blobToArrayBufferSafe(blob: Blob): Promise<ArrayBuffer> {
    // Some environments throw on direct await blob.arrayBuffer(); use FileReader as fallback
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

export default function Session() {
    const { activeView, setActiveView, imprinting_mode, setImprintingMode, currentLO, setCurrentLO } = useSessionStore();
    const [isIntroActive, setIsIntroActive] = useState(true);
    const handleIntroComplete = () => setIsIntroActive(false);
    const { user, isSignedIn, isLoaded } = useUser();
    const router = useRouter();
    const searchParams = useSearchParams();
    const SESSION_DEBUG = false;
    
    // Get course details from URL parameters
    const courseId = searchParams.get('courseId');
    const courseTitle = searchParams.get('title');
    
    if (SESSION_DEBUG) console.log('Session page - Course details:', { courseId, courseTitle });
    
    // Add debugging for authentication state
    useEffect(() => {
        if (SESSION_DEBUG) console.log('Session page auth state:', { isLoaded, isSignedIn, userId: user?.id });
    }, [isLoaded, isSignedIn, user?.id]);
    
    // Redirect to login if not authenticated (after Clerk has loaded)
    useEffect(() => {
        if (isLoaded && !isSignedIn) {
            if (SESSION_DEBUG) console.log('User not authenticated, redirecting to login');
            // Use window.location.href to force a complete page refresh
            // This helps resolve Clerk authentication state synchronization issues
            const timeoutId = setTimeout(() => {
                if (!isSignedIn) {
                    if (SESSION_DEBUG) console.log('Authentication state still not synced, forcing redirect to login');
                    window.location.href = '/login';
                }
            }, 2000); // Increased timeout to 2 seconds for better state settling
            
            return () => clearTimeout(timeoutId);
        }
    }, [isLoaded, isSignedIn, router]);
    
    // Wait for authentication to settle before initializing LiveKit
    const shouldInitializeLiveKit = isLoaded && isSignedIn && user?.id;
    
    // Generate unique room and user identifiers using Clerk user data
    const roomName = shouldInitializeLiveKit ? `session-${user.id}` : `session-${Date.now()}`;
    const userName = shouldInitializeLiveKit ? (user.emailAddresses[0]?.emailAddress || user.username || `user-${user.id}`) : `student-${Date.now()}`;
    
    // Initialize LiveKit session only when authenticated
    const {
        room,
        isConnected,
        isLoading,
        connectionError,
        startTask,
        agentIdentity,
        transcriptionMessages,
        statusMessages
    } = useLiveKitSession(shouldInitializeLiveKit ? roomName : '', shouldInitializeLiveKit ? userName : '');
    
    // Get URLs from environment variables
    // Viewer (noVNC): typically 6901
    const vncViewerUrl = process.env.NEXT_PUBLIC_VNC_VIEWER_URL || 'ws://localhost:6901';
    // Action listener (automation): typically 8765
    const vncActionUrl = process.env.NEXT_PUBLIC_VNC_WEBSOCKET_URL || 'ws://localhost:8765';
    const sessionBubbleUrl = process.env.NEXT_PUBLIC_SESSION_BUBBLE_URL;

    // Allow editing URLs at runtime
    const [viewerUrl, setViewerUrl] = useState<string>(vncViewerUrl);
    const [actionUrl, setActionUrl] = useState<string>(vncActionUrl);
    const [viewerUrlInput, setViewerUrlInput] = useState<string>(vncViewerUrl);
    const [actionUrlInput, setActionUrlInput] = useState<string>(vncActionUrl);

    // Initialize browser automation hooks (connect to action listener, not viewer)
    const { isVNCConnected, disconnectVNC, executeBrowserAction, setOnVNCResponse } = useBrowserActionExecutor(room, actionUrl);
    const { connectToVNCSensor, disconnectFromVNCSensor } = useBrowserInteractionSensor(room);
    
    // Initialize Mermaid visualization hook


    if (SESSION_DEBUG) console.log(`Zustand Sanity Check: SessionPage re-rendered. Active view is now: '${activeView}'`);

    const componentButtons: ButtonConfig[] = [
        {
            key: 'vnc',
            label: 'Browser',
            inactiveImagePath: '/browser-inactive.svg',
            activeImagePath: '/browser-active.svg'
        },
        {
            key: 'excalidraw',
            label: 'Notes',
            inactiveImagePath: '/whiteboard-inactive.svg',
            activeImagePath: '/whiteboard-active.svg'
        },
        {
            key: 'video',
            label: 'Video',
            inactiveImagePath: '/video-inactive.svg',
            activeImagePath: '/video-active.svg'
        },
    ];

    // ---- Episode Recording + Packet Collection ----
    const [isRecording, setIsRecording] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string>('Session started. Waiting for initial prompt.');
    const [submitMessage, setSubmitMessage] = useState<string | null>(null);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const packetsRef = useRef<any[]>([]);
    const [packetsCount, setPacketsCount] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<BlobPart[]>([]);
    const audioBlobRef = useRef<Blob | null>(null);
    const stagedAssetsRef = useRef<any[]>([]);
    const [isStartAllowed, setIsStartAllowed] = useState<boolean>(true);

    const curriculumId = courseId || 'pandas_expert_test_01';

    // ---- Conceptual chat state ----
    const [conceptualInput, setConceptualInput] = useState<string>('');
    const [lastConceptualReply, setLastConceptualReply] = useState<string>('');
    const [isConceptualStarted, setIsConceptualStarted] = useState<boolean>(false);
    const [topicInput, setTopicInput] = useState<string>(currentLO || '');
    const [seedText, setSeedText] = useState<string>('');
    const topicInputRef = useRef<HTMLInputElement | null>(null);

    // --- Lightweight response awaiter infrastructure ---
    type PendingResolver = { id: string; expectAction: string; resolve: (resp: any) => void; reject: (err: any) => void; timeoutId: any };
    const pendingResolversRef = useRef<PendingResolver[]>([]);

    useEffect(() => {
        // Route incoming VNC responses to awaiting callers
        setOnVNCResponse((resp: any) => {
            try {
                console.log('[TeacherPage] VNC response received:', resp);
                // Match by action
                const idx = pendingResolversRef.current.findIndex(p => p.expectAction === resp?.action);
                if (idx >= 0) {
                    const [pending] = pendingResolversRef.current.splice(idx, 1);
                    clearTimeout(pending.timeoutId);
                    pending.resolve(resp);
                }
            } catch (e) {
                console.error('[TeacherPage] Error handling VNC response:', e);
            }
        });
    }, [setOnVNCResponse]);

    const sendAndAwait = async (tool_name: string, parameters: any, expectedAction?: string, timeoutMs = 15000): Promise<any> => {
        const expectAction = expectedAction || tool_name;
        return new Promise(async (resolve, reject) => {
            const id = `${expectAction}-${Date.now()}`;
            const timeoutId = setTimeout(() => {
                // Remove from pending if still present
                const idx = pendingResolversRef.current.findIndex(p => p.id === id);
                if (idx >= 0) pendingResolversRef.current.splice(idx, 1);
                reject(new Error(`Timed out waiting for action '${expectAction}' response`));
            }, timeoutMs);
            pendingResolversRef.current.push({ id, expectAction, resolve, reject, timeoutId });
            try {
                await executeBrowserAction({ tool_name, parameters });
            } catch (err) {
                clearTimeout(timeoutId);
                // Remove from pending
                const idx = pendingResolversRef.current.findIndex(p => p.id === id);
                if (idx >= 0) pendingResolversRef.current.splice(idx, 1);
                reject(err);
            }
        });
    };

    const handleSubmitSeed = async () => {
        if (!user?.id) return;
        if (!seedText.trim()) return;
        try {
            setStatusMessage('Submitting seed...');
            const resp = await submitSeed({
                expert_id: user.id,
                session_id: roomName,
                content: seedText,
            });
            setStatusMessage(resp?.message || 'Seed submitted.');
            setSeedText('');
        } catch (e: any) {
            setStatusMessage(`Seed submit failed: ${e?.message || e}`);
        }
    };

    const handleStartRecording = async () => {
        if (!user?.id) return;
        try {
            console.log('[SessionPage] Sending START_RECORDING command to backend...', { roomName, actionUrl });
            setSubmitMessage(null);
            setSubmitError(null);
            setImprintingMode('WORKFLOW');
            setStatusMessage('Initializing recording on server...');
            // Reset local counters (server will track actions)
            setPacketsCount(0);
            stagedAssetsRef.current = [];

            // 1) Tell backend to start recording and await server ack
            const startResp = await sendAndAwait('start_recording', {
                session_id: roomName,
                screenshot_interval_sec: 10,
            }, 'start_recording', 45000);
            console.log('[SessionPage] Backend acknowledged start_recording:', startResp);

            // 2) Start local microphone recording
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' } as any);
            audioChunksRef.current = [];
            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) audioChunksRef.current.push(e.data);
            };
            recorder.onstop = () => {
                audioBlobRef.current = new Blob(audioChunksRef.current, { type: 'audio/webm' });
                console.log('[SessionPage] Audio blob ready.', { size: audioBlobRef.current.size });
            };
            recorder.start();
            mediaRecorderRef.current = recorder;

            // 3) Update UI state
            setIsRecording(true);
            setStatusMessage('Recording... Actions are being captured by the server.');
        } catch (err: any) {
            console.error('Failed to start recording:', err);
            setSubmitError(err?.message || 'Failed to start recording');
            setIsRecording(false);
        }
    };

    // Connect sensor interactions to the VNC action executor
    const handleVncInteraction = (interaction: { action: string; x: number; y: number }) => {
        if (!isRecording) {
            console.warn('Ignoring VNC interaction because recording is not active.');
            setStatusMessage("Click 'Start Recording' to begin imprinting.");
            return;
        }
        console.log('[SessionPage] Sensor detected interaction, sending to VNC listener:', interaction);
        executeBrowserAction({
            tool_name: 'browser_click',
            parameters: { x: interaction.x, y: interaction.y },
        });
    };

    const handleSelectPractical = () => {
        setImprintingMode('WORKFLOW');
        setActiveView('vnc');
    };

    const handleSelectConceptual = () => {
        setImprintingMode('DEBRIEF_CONCEPTUAL');
        setActiveView('excalidraw');
        setIsConceptualStarted(false);
    };

    const handleSendConceptual = async () => {
        if (imprinting_mode !== 'DEBRIEF_CONCEPTUAL') return;
        try {
            setStatusMessage('Sending conceptual turn...');
            // If not started, kick off using the topicInput as both current_lo and initial expert response
            if (!isConceptualStarted) {
                const topic = (topicInput || '').trim();
                if (!topic) return;
                // Persist topic as current LO for practical submissions
                setCurrentLO(topic);
                const resp = await conversationalTurn({
                    curriculum_id: curriculumId,
                    session_id: roomName,
                    imprinting_mode: 'DEBRIEF_CONCEPTUAL',
                    latest_expert_response: topic,
                    current_lo: topic,
                });
                const aiText = resp?.text || '';
                setLastConceptualReply(aiText);
                setStatusMessage(aiText ? `AI: ${aiText}` : '');
                // Enable start only if AI did not ask a follow-up question
                setIsStartAllowed(!(aiText && /\?/.test(aiText)));
                setIsConceptualStarted(true);
                setTimeout(() => topicInputRef.current?.focus(), 0);
                // Clear input so it can be used to answer next question
                setTopicInput('');
            } else {
                const msg = (topicInput || '').trim();
                if (!msg) return;
                const resp = await conversationalTurn({
                    curriculum_id: curriculumId,
                    session_id: roomName,
                    imprinting_mode: 'DEBRIEF_CONCEPTUAL',
                    latest_expert_response: msg,
                    current_lo: currentLO || undefined,
                });
                const aiText = resp?.text || '';
                setLastConceptualReply(aiText);
                setStatusMessage(aiText ? `AI: ${aiText}` : '');
                // If no more question from AI, allow starting a new episode and return to Practical
                if (!(aiText && /\?/.test(aiText))) {
                    setIsStartAllowed(true);
                    setImprintingMode('WORKFLOW');
                } else {
                    setIsStartAllowed(false);
                }
                setTopicInput('');
            }
        } catch (e: any) {
            setStatusMessage(`Conceptual turn failed: ${e?.message || e}`);
        }
    };

    

    const handleStopRecording = async () => {
        console.log('[SessionPage] Sending STOP_RECORDING command to backend...');
        // 1) Stop local mic to finalize the audio blob
        try {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
            }
        } catch (err) {
            console.warn('Stop recording warning:', err);
        }
        // 2) Tell backend to stop recording and save actions.json
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
        }
    };

    const handleSubmitEpisode = async () => {
        console.log('[EpisodeControls] Submit Episode clicked');
        setSubmitMessage(null);
        setSubmitError(null);
        setIsSubmitting(true);
        // While debrief is pending, disable Start until AI says "No further gaps"
        setIsStartAllowed(false);
        try {
            setStatusMessage('Stopping recording and preparing data...');
            // Ensure recording is stopped and blob assembled
            if (isRecording) {
                handleStopRecording();
                await new Promise(r => setTimeout(r, 250));
            }

            const audioBlob = audioBlobRef.current || (audioChunksRef.current.length > 0 ? new Blob(audioChunksRef.current, { type: 'audio/webm' }) : null);
            if (!audioBlob) {
                throw new Error('No audio captured. Please record before submitting.');
            }

            // Convert recorded audio (webm/ogg) to WAV Data URL
            const audio_b64: string = await convertBlobToWavDataURL(audioBlob);

            // Fetch recorded actions (including periodic screenshots)
            setStatusMessage('Fetching recorded actions from server...');
            const actionsResp = await sendAndAwait('get_recorded_actions', { session_id: roomName }, 'get_recorded_actions');
            const packets: any[] = Array.isArray(actionsResp?.packets) ? actionsResp.packets : [];
            const periodicCount = packets.filter(p => p?.interaction_type === 'periodic_screenshot').length;
            console.log('[EpisodeControls] Recorded actions ready:', { total: packets.length, periodic_screenshots: periodicCount, source: actionsResp?.source });
            setStatusMessage(`Submitting episode... (${packets.length} actions, ${periodicCount} periodic screenshots)`);

            const response = await submitImprintingEpisode({
                expert_id: user?.id || 'unknown_expert',
                session_id: roomName,
                narration: 'Expert narration from episode.',
                audio_b64,
                expert_actions: packets,
                staged_assets: stagedAssetsRef.current,
                current_lo: currentLO || undefined,
            });

            console.log('[EpisodeControls] Submit success', response);
            setSubmitMessage(`Submitted. Processed ${packets.length} actions.`);
            setStatusMessage('Episode submitted. AI is analyzing...');

            if (response?.action === 'SPEAK_AND_INITIATE_DEBRIEF') {
                const aiText = response.text || '';
                const hasQuestion = !!aiText && /\?/.test(aiText);
                if (hasQuestion) {
                    // Move to conceptual mode to answer, and disable Start until resolved
                    setImprintingMode('DEBRIEF_CONCEPTUAL');
                    setIsConceptualStarted(true);
                    setIsStartAllowed(false);
                    setStatusMessage(`AI: ${aiText}`);
                    setTimeout(() => topicInputRef.current?.focus(), 0);
                } else {
                    // No follow-up questions; allow starting a new episode
                    setImprintingMode('WORKFLOW');
                    setIsStartAllowed(true);
                    setStatusMessage(`AI: ${aiText || 'Debrief complete.'}`);
                }
                // Optionally trigger speech via LiveKit: startTask({ task_name: 'speak_text', text: aiText })
            }

            // Reset after successful submit
            packetsRef.current = [];
            setPacketsCount(0);
            audioChunksRef.current = [];
            audioBlobRef.current = null;
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
        setStatusMessage(`Uploading asset: ${file.name}...`);
        try {
            const assetInfo = await stageAsset({
                expert_id: user.id,
                session_id: roomName,
                file,
            });
            stagedAssetsRef.current.push({ filename: assetInfo.filename, asset_id: assetInfo.asset_id });
            setStatusMessage(`Asset '${file.name}' staged successfully.`);
            // TODO: push into VNC via a new listener command
        } catch (e: any) {
            setStatusMessage(`Error uploading asset: ${e.message}`);
        }
    };

    const handleFinish = async () => {
        console.log('[EpisodeControls] Finish Session clicked');
        try {
            setSubmitMessage(null);
            setSubmitError(null);
            // If recording, stop and allow blob assembly
            if (isRecording) {
                handleStopRecording();
                await new Promise(r => setTimeout(r, 200));
            }

            // Submit only if we have packets and audio
            if (packetsCount > 0 && audioBlobRef.current) {
                await handleSubmitEpisode();
            } else {
                // Provide a gentle status if nothing to submit
                if (!submitMessage) {
                    setSubmitMessage('Session finished. No episode to submit.');
                }
            }
        } catch (err) {
            console.error('Finish session encountered an error:', err);
        } finally {
            // Disconnect services regardless of submit outcome
            try { disconnectVNC(); } catch {}
            try { disconnectFromVNCSensor(); } catch {}
            if (!submitMessage) {
                setSubmitMessage(prev => prev || 'Session finished.');
            }
            console.log('[EpisodeControls] Finish Session complete');
        }
    };

    // Effect to manage WebSocket connections for browser automation
    useEffect(() => {
        // Only connect when the LiveKit session is fully established
        if (isConnected && sessionBubbleUrl) {
            if (SESSION_DEBUG) console.log("LiveKit connected, now connecting to session-bubble services...");
            
            // The VNC connection is now managed by the useBrowserActionExecutor hook
            // We still need to manage the sensor connection here
            connectToVNCSensor(sessionBubbleUrl);
        }

        // Return a cleanup function to disconnect when the component unmounts
        return () => {
            if (isConnected) {
                if (SESSION_DEBUG) console.log("Session component unmounting, disconnecting from session-bubble.");
                disconnectVNC();
                disconnectFromVNCSensor();
            }
        };
    }, [isConnected, sessionBubbleUrl, disconnectVNC, connectToVNCSensor, disconnectFromVNCSensor]);

    // Show loading while Clerk is initializing
    if (!isLoaded) {
        return <div className="w-full h-full flex items-center justify-center text-white">Loading...</div>;
    }
    
    // Show loading while authentication is settling
    if (!isLoaded) {
        return <div className="w-full h-full flex items-center justify-center text-white">Loading authentication...</div>;
    }
    
    // Show loading while LiveKit is initializing
    if (isLoading) {
        return <div className="w-full h-full flex items-center justify-center text-white">Initializing Session...</div>;
    }
    if (connectionError) {
        return <div className="w-full h-full flex items-center justify-center text-red-400">Connection Error: {connectionError}</div>;
    }
    if (isIntroActive) {
        return <IntroPage onAnimationComplete={handleIntroComplete} />;
    }

    return (
        <>
            <SignedIn>
                <Sphere />
                <div className='flex flex-col w-full h-full items-center justify-between pb-28'>
                    <SessionContent 
                        activeView={activeView} 
                        setActiveView={setActiveView} 
                        componentButtons={componentButtons} 
                        vncUrl={viewerUrl}
                        vncOverlay={null}
                        handleVncInteraction={handleVncInteraction}
                    />

                    {/* Fixed bottom Episode Controls bar */}
                    <div className="fixed bottom-0 left-0 right-0 z-50">
                        <div className="mx-auto w-full md:w-[90%] lg:w-[70%] px-3 pb-3">
                            <div className="bg-[#0F1226]/90 border border-[#2A2F4A] backdrop-blur-md rounded-t-xl p-3 text-white">
                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                                    <div className="flex flex-wrap gap-2 items-center">
                                        <button
                                            onClick={handleSelectPractical}
                                            className={`rounded-md px-4 py-2 text-sm font-medium ${imprinting_mode === 'WORKFLOW' ? 'bg-blue-700' : 'bg-slate-600 hover:bg-slate-500'}`}
                                        >
                                            Practical
                                        </button>
                                        <button
                                            onClick={handleSelectConceptual}
                                            className={`rounded-md px-4 py-2 text-sm font-medium ${imprinting_mode === 'DEBRIEF_CONCEPTUAL' ? 'bg-blue-700' : 'bg-slate-600 hover:bg-slate-500'}`}
                                        >
                                            Conceptual
                                        </button>
                                        <div className="flex items-center gap-2">
                                            <input
                                                ref={topicInputRef}
                                                type="text"
                                                value={topicInput}
                                                onChange={(e) => {
                                                    const v = e.target.value;
                                                    setTopicInput(v);
                                                    // Update current LO only if not mid conceptual Q&A
                                                    if (!(imprinting_mode === 'DEBRIEF_CONCEPTUAL' && isConceptualStarted)) {
                                                        setCurrentLO(v);
                                                    }
                                                }}
                                                placeholder={imprinting_mode === 'DEBRIEF_CONCEPTUAL' ? (isConceptualStarted ? 'Answer AI...' : 'Topic (Current LO)') : 'Topic (Current LO)'}
                                                className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-56 text-xs"
                                            />
                                            {imprinting_mode === 'DEBRIEF_CONCEPTUAL' && (
                                                <button
                                                    onClick={handleSendConceptual}
                                                    className="rounded-md px-3 py-1 text-xs font-medium bg-indigo-600 hover:bg-indigo-500"
                                                >
                                                    Send
                                                </button>
                                            )}
                                        </div>
                                        <button
                                            onClick={handleStartRecording}
                                            disabled={isRecording || !isStartAllowed || isSubmitting}
                                            className={`rounded-md px-4 py-2 text-sm font-medium ${(isRecording || !isStartAllowed || isSubmitting) ? 'bg-gray-600 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500'}`}
                                        >
                                            Start Recording
                                        </button>
                                        <button
                                            onClick={handleStopRecording}
                                            disabled={!isRecording}
                                            className={`rounded-md px-4 py-2 text-sm font-medium ${!isRecording ? 'bg-gray-600 cursor-not-allowed' : 'bg-yellow-600 hover:bg-yellow-500'}`}
                                        >
                                            Stop/Pause
                                        </button>
                                        
                                        <label className="text-xs opacity-80">
                                            <span className="sr-only">Upload Asset</span>
                                            <input
                                                type="file"
                                                onChange={handleAssetUpload}
                                                disabled={!isRecording}
                                                className="block text-xs"
                                            />
                                        </label>
                                        <button
                                            onClick={handleSubmitEpisode}
                                            disabled={isSubmitting || packetsCount === 0}
                                            className={`rounded-md px-4 py-2 text-sm font-medium ${isSubmitting || packetsCount === 0 ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500'}`}
                                        >
                                            {isSubmitting ? 'Submitting...' : 'Submit Episode'}
                                        </button>
                                        <button
                                            onClick={handleFinish}
                                            disabled={isSubmitting}
                                            className={`rounded-md px-4 py-2 text-sm font-medium ${isSubmitting ? 'bg-gray-600 cursor-not-allowed' : 'bg-red-600 hover:bg-red-500'}`}
                                        >
                                            Finish Session
                                        </button>
                                    </div>
                                    <div className="text-xs text-gray-300 space-y-1 md:text-right">
                                        <div><span className="text-gray-400">Mic:</span> {isRecording ? 'Recording' : 'Idle'}</div>
                                        <div><span className="text-gray-400">Packets:</span> {packetsCount}</div>
                                        <div><span className="text-gray-400">Action WS:</span> {isVNCConnected ? 'Connected' : 'Disconnected'}</div>
                                        <div className="opacity-80 break-all"><span className="text-gray-400">Viewer:</span> {viewerUrl}</div>
                                        <div className="opacity-80 break-all"><span className="text-gray-400">Action:</span> {actionUrl}</div>
                                        {viewerUrl === actionUrl && (
                                            <div className="text-amber-300">Warning: Viewer and Action URLs are identical. Use 6901 for viewer, 8765 for action.</div>
                                        )}
                                        {statusMessage && <div className="text-sky-300">{statusMessage}</div>}
                                        {submitMessage && <div className="text-emerald-300">{submitMessage}</div>}
                                        {submitError && <div className="text-red-300">{submitError}</div>}
                                        <div className="mt-2 flex flex-col gap-2">
                                            
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={seedText}
                                                    onChange={(e) => setSeedText(e.target.value)}
                                                    className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-64"
                                                    placeholder="Seed text (curriculum seed)"
                                                />
                                                <button
                                                    onClick={handleSubmitSeed}
                                                    className="rounded-md px-3 py-1 text-xs font-medium bg-purple-600 hover:bg-purple-500"
                                                >
                                                    Submit Seed
                                                </button>
                                            </div>
                                            <div className="flex gap-2">
                                                <input
                                                    type="text"
                                                    value={viewerUrlInput}
                                                    onChange={(e) => setViewerUrlInput(e.target.value)}
                                                    className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-52"
                                                    placeholder="Viewer URL (ws://localhost:6901)"
                                                />
                                                <input
                                                    type="text"
                                                    value={actionUrlInput}
                                                    onChange={(e) => setActionUrlInput(e.target.value)}
                                                    className="bg-[#15183A] border border-[#2A2F4A] rounded px-2 py-1 w-52"
                                                    placeholder="Action URL (ws://localhost:8765)"
                                                />
                                                <button
                                                    onClick={() => { setViewerUrl(viewerUrlInput); setActionUrl(actionUrlInput); }}
                                                    className="rounded-md px-3 py-1 text-xs font-medium bg-slate-600 hover:bg-slate-500"
                                                >
                                                    Apply URLs
                                                </button>
                                            </div>
                                            {lastConceptualReply && imprinting_mode === 'DEBRIEF_CONCEPTUAL' && (
                                                <div className="text-xs text-sky-300 break-words">AI: {lastConceptualReply}</div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <Footer room={room} agentIdentity={agentIdentity || undefined} />
                
                {/* Display transcription and status messages when connected */}
                {isConnected && (
                    <MessageDisplay 
                        transcriptionMessages={transcriptionMessages || []}
                        statusMessages={statusMessages || []}
                    />
                )}
          
            </SignedIn>
            
            <SignedOut>
                <div className="w-full h-full flex items-center justify-center text-white">
                    <div className="text-center">
                        <h2 className="text-xl mb-4">Authentication Required</h2>
                        <p className="mb-4">Please sign in to access the session.</p>
                        <button 
                            onClick={() => router.push('/login')}
                            className="bg-[#566FE9] text-white px-6 py-2 rounded-full hover:bg-[#566FE9]/95 transition"
                        >
                            Go to Login
                        </button>
                    </div>
                </div>
            </SignedOut>
        </>
    );
}
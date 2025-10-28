import React, {

// File: exsense/src/components/Registrationform.tsx


    useState,
    useEffect,
    useRef,
    useCallback,
} from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";



// --- Custom Audio Recorder Hook ---
// (No changes in this hook)
export interface UseAudioRecorderReturn {
    isRecording: boolean;
    duration: number;
    startRecording: () => Promise<void>;
    stopRecording: () => void;
    audioBlob: Blob | null;
    error: string | null;
}

export const useAudioRecorder = (maxDuration: number): UseAudioRecorderReturn => {
    const [isRecording, setIsRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [error, setError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const chunksRef = useRef<Blob[]>([]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        }
    }, []);

    const startRecording = useCallback(async () => {
        try {
            setError(null);
            setAudioBlob(null);
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 44100 } });
            streamRef.current = stream;
            chunksRef.current = [];
            const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
            mediaRecorderRef.current = mediaRecorder;
            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) chunksRef.current.push(event.data);
            };
            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: "audio/webm;codecs=opus" });
                setAudioBlob(blob);
                setIsRecording(false);
                if (streamRef.current) {
                    streamRef.current.getTracks().forEach((track) => track.stop());
                    streamRef.current = null;
                }
            };
            mediaRecorder.start(100);
            setIsRecording(true);
            setDuration(0);
            intervalRef.current = setInterval(() => {
                setDuration((prev) => {
                    const newTime = prev + 1;
                    if (newTime >= maxDuration) {
                        stopRecording();
                        return maxDuration;
                    }
                    return newTime;
                });
            }, 1000);
        } catch (err) {
            console.error("Error starting recording:", err);
            setError("Failed to start recording. Please check microphone permissions.");
        }
    }, [maxDuration, stopRecording]);

    return { isRecording, duration, startRecording, stopRecording, audioBlob, error };
};


// --- RecordingBar Component ---
// (This component has the requested change)
interface RecordingBarProps {
    isRecording: boolean;
    duration: number;
    maxDuration: number;
    onToggleRecording: () => void;
    audioBlob: Blob | null;
    onReset: () => void;
    onPlay: () => void;
    onSubmit: () => void;
    isPlaying: boolean;
}

const RecordingBar: React.FC<RecordingBarProps> = ({ isRecording, duration, maxDuration, onToggleRecording, audioBlob, onReset, onPlay, onSubmit, isPlaying }) => {
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
        const secs = (seconds % 60).toString().padStart(2, "0");
        return `${mins}:${secs}`;
    };

    let statusText = "Click to start recording";
    if (isRecording) {
        statusText = "Recording in progress...";
    } else if (audioBlob) {
        statusText = "Recording saved";
    }

    return (
        <div className="w-full h-full flex items-center gap-2 p-2 pl-4 border border-gray-200 bg-white/80 rounded-full shadow-sm">
            <div className="flex-grow flex items-center gap-1.5">
                <img src="/timer.svg" alt="Duration" className="w-5 h-5" />
                <span className="text-[16px] text-[#566FE9]">{formatTime(duration)} / {formatTime(maxDuration)}</span>
                <span className="ml-[1px] text-[16px] text-[#566fe9] hidden sm:inline-block">{statusText}</span>
            </div>
            <div className="flex items-center gap-[6px]">
                {isRecording ? (
                    <button onClick={onToggleRecording} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5ed1] transition-colors" aria-label="Stop recording"><img src="/record2.svg" alt="Stop recording" className="w-5 h-5" /></button>
                ) : !audioBlob ? (
                    <button onClick={onToggleRecording} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5ed1] transition-colors" aria-label="Start recording"><div className="relative w-5 h-5"><div className="absolute inset-0 rounded-full bg-transparent border-2 border-white" style={{ transform: "scale(1)" }} /><div className="absolute inset-0 rounded-full bg-transparent border-2 border-white" style={{ transform: "scale(0.6)" }} /></div></button>
                ) : (
                    <>
                        <button onClick={onReset} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#EEF1FD] hover:bg-[#EEF1FD] transition-colors" aria-label="Record again"><img src="resset.svg" alt="Record again" className="w-5 h-5" /></button>
                        <button onClick={onPlay} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#EEF1FD] hover:bg-[#EEF1FD] transition-colors" aria-label={isPlaying ? "Pause recording" : "Play recording"}>{isPlaying ? (<img src="pause1.svg" alt="Pause" className="w-5 h-5" />) : (<img src="play1.svg" alt="Play" className="w-5 h-5" />)}</button>
                        <button onClick={onSubmit} className="w-9 h-9 rounded-full flex items-center justify-center bg-[#566FE9] hover:bg-[#4a5ed1] transition-colors" aria-label="Send recording"><img src="send.svg" alt="Send recording" className="w-5 h-5" /></button>
                    </>
                )}
            </div>
        </div>
    );
};

// --- Configuration Data ---
// (No changes in this data)
const formSteps = [
    { id: 1, title: "Hi there!", subtitle: "I'm Rox, your personal AI TOEFL tutor. To get started, what's your name?", placeholder: "Name", inputType: "text" },
    { id: 2, title: "Nice to meet you!", subtitle: "What's your main goal for using this tutor?  For example, are you aiming for a specific score, focusing on improving speaking, or something else?", placeholder: "I want to improve speaking fluency", inputType: "text" },
    { id: 3, title: "Great!", subtitle: "How do you generally feel about your current English skills when it comes to academic tasks like those on the TOEFL?", placeholder: "Speaking and writing still makes me nervous", inputType: "text" },
    { id: 4, title: "Perfect!", subtitle: "And how are you feeling about tackling the TOFEL exam itself right now?", placeholder: "A bit nervous but ready to try", inputType: "text" },
    { id: 5, title: "Almost done!", subtitle: "Okay, to give me a better sense of your speaking style, could you please tell me a little bit about [a simple engaging topic like ' a favourite memory' or 'a place you dream of visiting']? ", placeholder: "Voice recording", inputType: "voice" },
];

const MAX_RECORDING_TIME = 30;
const API_ENDPOINT = `${process.env.NEXT_PUBLIC_REGISTRATION_API_URL}/user/fill-details`;
const API_ENDPOINT_LANGGRAPH = `${process.env.NEXT_PUBLIC_LANGGRAPH_API_URL}/user/register`;


// --- RegistrationProgressBar Component ---
// (This component has the requested change)
interface RegistrationProgressBarProps {
    currentStep: number;
    totalSteps: number;
    onPrevious: () => void;
}

const RegistrationProgressBar: React.FC<RegistrationProgressBarProps> = ({
    currentStep,
    totalSteps,
    onPrevious,
}) => {
    return (
        <header className="fixed top-0 left-0 right-0 z-10 bg-transparent pt-4 ">
            {/* THIS IS THE CHANGE: The width is now responsive */}
            <div className="w-[80%] md:w-[70%] lg:w-[39%] mx-auto flex items-center gap-2.5 p-4 pt-2 rounded-full">
                <Button
                    variant="ghost"
                    onClick={onPrevious}
                    disabled={currentStep === 0}
                    className="w-9 h-9 p-0 flex items-center justify-center hover:bg-gray-100 disabled:opacity-30 shrink-0 rounded-full"
                >
                    <img src="/frame-1.svg" alt="Back" className="w-6 h-6" />
                </Button>
                <div className="grid w-full grid-cols-5 gap-2">
                    {Array.from({ length: totalSteps }).map((_, index) => (
                        <div
                            key={index}
                            className={`h-2.5 rounded-[58px] transition-colors duration-300 ${index <= currentStep ? "bg-[#566fe9]" : "bg-[#E3E7FC]"
                                }`}
                        />
                    ))}
                </div>
                <div className="w-9 h-9 shrink-0"></div>
            </div>
        </header>
    );
};


// --- RegistrationFormContent Component ---
// (No changes in this component)
interface RegistrationFormContentProps {
    currentStep: number;
    formData: Record<string, string>;
    currentInput: string;
    isSubmitting: boolean;
    canProceed: boolean;
    isRecording: boolean;
    duration: number;
    audioBlob: Blob | null;
    audioUrl: string;
    isPlaying: boolean;
    isListening: boolean;
    setCurrentInput: (value: string) => void;
    handleNext: () => void;
    handleKeyPress: (e: React.KeyboardEvent) => void;
    startRecording: () => void;
    stopRecording: () => void;
    setAudioBlob: (blob: Blob | null) => void;
    setAudioUrl: (url: string) => void;
    handlePlayPause: () => void;
    startSpeechToText: () => void;
    stopSpeechToText: () => void;
    audioRef: React.RefObject<HTMLAudioElement | null>;
}

const RegistrationFormContent: React.FC<RegistrationFormContentProps> = ({ currentStep, formData, currentInput, isSubmitting, canProceed, isRecording, duration, audioBlob, audioUrl, isPlaying, isListening, setCurrentInput, handleNext, handleKeyPress, startRecording, stopRecording, setAudioBlob, setAudioUrl, handlePlayPause, startSpeechToText, stopSpeechToText, audioRef }) => {
    const currentFormStep = formSteps[currentStep];
    const name = formData["name"];

    const renderInput = () => {
        const containerClasses = "w-full h-[56px] relative";
        if (currentFormStep.inputType === "voice") {
            return (
                <div className={containerClasses}>
                    <RecordingBar isRecording={isRecording} duration={duration} maxDuration={MAX_RECORDING_TIME} onToggleRecording={() => isRecording ? stopRecording() : startRecording()} audioBlob={audioBlob} onReset={() => { setAudioBlob(null); setAudioUrl(""); }} onPlay={handlePlayPause} onSubmit={handleNext} isPlaying={isPlaying} />
                    {audioUrl && (
                        <audio ref={audioRef} src={audioUrl} onEnded={() => handlePlayPause()} className="hidden" />
                    )}
                </div>
            );
        }
        return (
            <div className={containerClasses}>
                <Input className="w-full h-full border border-gray-300 rounded-full px-4 pr-12 text-sm flex-grow bg-white" placeholder={currentFormStep.placeholder} type={currentFormStep.inputType} value={currentInput} onChange={(e) => setCurrentInput(e.target.value)} onKeyPress={handleKeyPress} />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-9 w-9">
                    {isListening ? (
                        <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[#566FE9] hover:bg-[#4a5ed1] animate-pulse" onClick={stopSpeechToText} aria-label="Stop voice input"><img src="/record2.svg" alt="Stop voice input" className="w-5 h-5" /></button>
                    ) : currentInput.trim() !== "" ? (
                        <Button className="w-9 h-9 p-2 bg-[#566FE9] hover:bg-[#4a5ed1] rounded-full flex items-center justify-center shrink-0" aria-label="Send" onClick={handleNext} disabled={isSubmitting || !canProceed}><img src="send.svg" alt="Send" className="w-5 h-5" /></Button>
                    ) : (
                        <button type="button" className="w-9 h-9 rounded-full flex items-center justify-center transition-colors bg-[#EEF1FD] hover:bg-[#EEF1FD]" onClick={startSpeechToText} aria-label="Use voice to text"><img src="mic-on.svg" alt="Use voice to text" className="w-5 h-5" /></button>
                    )}
                </div>
            </div>
        );
    };

    return (
        <main className="flex-grow flex items-center justify-center p-4 pt-24 pb-16 sm:pb-24">
            <div className="w-full max-w-lg">
                <div key={currentStep} className="animate-in fade-in slide-in-from-bottom-5 duration-500">
                    <Card className="border-none shadow-none bg-transparent w-full">
                        <CardContent className="p-0 space-y-3">
                            <div className="font-[600] text-black text-[0.875rem] leading-[170%] tracking-normal transition-opacity duration-300">
                                {currentStep === 1 && name ? (
                                    <>Nice to meet you, <span className="text-[#566FE9]">{name}</span>!</>
                                ) : (
                                    currentFormStep.title
                                )}{" "}
                                <br />
                                {currentFormStep.subtitle}
                            </div>
                            {renderInput()}
                        </CardContent>
                    </Card>
                </div>
                {isSubmitting && (
                    <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-20 backdrop-blur-sm">
                        <p className="text-lg font-semibold p-4 bg-white rounded shadow-lg">Submitting...</p>
                    </div>
                )}
            </div>
        </main>
    );
};


// --- Main RegistrationForm Component (Controller) ---
// (No changes in this component)
export const RegistrationForm = () => {
    const router = useRouter();
    const [currentStep, setCurrentStep] = useState(0);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [currentInput, setCurrentInput] = useState("");
    const { isRecording, duration, startRecording, stopRecording, audioBlob: recordedBlob, error: recorderError } = useAudioRecorder(MAX_RECORDING_TIME);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [audioUrl, setAudioUrl] = useState<string>("");
    const audioRef = useRef<HTMLAudioElement>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef<any | null>(null);

    useEffect(() => {
        if (recordedBlob) {
            setAudioBlob(recordedBlob);
            const url = URL.createObjectURL(recordedBlob);
            setAudioUrl(url);
        } else {
            setAudioBlob(null);
        }
    }, [recordedBlob]);

    useEffect(() => {
        if (recorderError) toast.error(recorderError);
    }, [recorderError]);

    useEffect(() => {
        return () => { if (audioUrl) URL.revokeObjectURL(audioUrl); };
    }, [audioUrl]);

    useEffect(() => {
        const token = localStorage.getItem("authToken");
        console.log("Token FOUND on RegistrationForm mount:", token);
    }, []);

    useEffect(() => {
        return () => { if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) { /* Ignore */ } };
    }, []);

    const canProceed = currentStep === 4 ? audioBlob !== null : currentInput.trim() !== "";

    const handleSubmitToBackend = async (dataToSubmit: Record<string, any>) => {
        setIsSubmitting(true);
        try {
            const submissionPayload: Record<string, any> = {};
            const voiceStepPlaceholderKey = formSteps.find((step) => step.inputType === "voice")?.placeholder.toLowerCase().replace(/\s+/g, "_");
            for (const key in dataToSubmit) {
                if (dataToSubmit.hasOwnProperty(key)) {
                    if (key === voiceStepPlaceholderKey) continue;
                    let targetKey = key;
                    let value = dataToSubmit[key];
                    if (key === "i_want_to_improve_speaking_fluency") targetKey = "goal";
                    else if (key === "speaking_and_writing_still_makes_me_nervous") targetKey = "feeling";
                    else if (key === "a_bit_nervous_but_ready_to_try") targetKey = "confidence";
                    submissionPayload[targetKey] = value;
                }
            }
            submissionPayload.analysis = "test";
            const token = localStorage.getItem("authToken");
            if (!token) {
                toast.error("Authentication error: You are not logged in.");
                setIsSubmitting(false);
                return;
            }
            const response = await fetch(API_ENDPOINT, { method: "POST", body: JSON.stringify(submissionPayload), headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ message: "Failed to submit form. Server returned an error." }));
                throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            const userId = result.user.id;
            if (!userId) {
                toast.error("Could not find user ID for AI backend submission.");
            } else {
                const langgraphPayload = { ...submissionPayload, user_id: userId };
                try {
                    const langgraphResponse = await fetch(API_ENDPOINT_LANGGRAPH, { method: "POST", body: JSON.stringify(langgraphPayload), headers: { "Content-Type": "application/json" } });
                    if (!langgraphResponse.ok) {
                        const errorData = await langgraphResponse.json().catch(() => ({ message: "Failed to submit to AI backend." }));
                        console.error("AI Backend submission failed:", errorData.message);
                        toast.error("Registration details submitted, but failed to update AI profile. Some features may be limited.");
                    } else {
                        await langgraphResponse.json();
                        toast.success("Registration successful! Your profile has been updated for the AI tutor.");
                    }
                } catch (aiError) {
                    console.error("Error submitting to AI backend:", aiError);
                    toast.error("Could not connect to the AI backend. Some features may be limited.");
                }
            }
            router.push("/dash_rox");
        } catch (error) {
            console.error("Error submitting form:", error);
            toast.error(`Submission failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const stopSpeechToText = () => {
        if (recognitionRef.current) {
            try { recognitionRef.current.stop(); } catch (error) { console.error("Error stopping speech recognition:", error); }
            setIsListening(false);
        }
    };

    const handleNext = () => {
        stopSpeechToText();
        const currentStepInfo = formSteps[currentStep];
        const stepKey = currentStepInfo.placeholder.toLowerCase().replace(/\s+/g, "_");
        let entryValue;
        if (currentStepInfo.inputType === "voice") {
            if (!audioBlob) return;
            entryValue = "recorded_audio_placeholder";
        } else {
            if (!currentInput.trim()) return;
            entryValue = currentInput;
        }
        const newFormData = { ...formData, [stepKey]: entryValue };
        setFormData(newFormData);
        if (currentStep < formSteps.length - 1) {
            const nextStepIndex = currentStep + 1;
            setCurrentStep(nextStepIndex);
            const nextStepInfo = formSteps[nextStepIndex];
            const nextStepKeyFromState = nextStepInfo.placeholder.toLowerCase().replace(/\s+/g, "_");
            if (nextStepInfo.inputType === "text") {
                setCurrentInput(newFormData[nextStepKeyFromState] || "");
            } else {
                setCurrentInput("");
            }
        } else {
            handleSubmitToBackend(newFormData);
        }
    };

    const handlePrevious = () => {
        stopSpeechToText();
        if (currentStep > 0) {
            const prevStepIndex = currentStep - 1;
            setCurrentStep(prevStepIndex);
            const prevStepInfo = formSteps[prevStepIndex];
            const stepKey = prevStepInfo.placeholder.toLowerCase().replace(/\s+/g, "_");
            if (prevStepInfo.inputType === "text") {
                setCurrentInput(formData[stepKey] || "");
            } else {
                setCurrentInput("");
            }
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && canProceed) handleNext();
    };

    const startSpeechToText = () => {
        if (typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window)) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = true;
            recognition.interimResults = true;
            recognition.lang = "en-US";
            recognition.onresult = (event: any) => {
                let transcript = "";
                for (let i = 0; i < event.results.length; i++) {
                    transcript += event.results[i][0].transcript + " ";
                }
                setCurrentInput(transcript.trim());
            };
            recognition.onerror = (event: any) => { console.error("Speech recognition error", event.error); setIsListening(false); };
            recognition.onend = () => { setIsListening(false); };
            recognitionRef.current = recognition;
            try { recognition.start(); setIsListening(true); } catch (error) { console.error("Error starting speech recognition:", error); }
        } else {
            toast.info("Speech recognition is not supported in this browser. Try Chrome or Edge.");
        }
    };

    const handlePlayPause = () => {
        if (audioRef.current) {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    return (
        <div className="min-h-full bg-transparent flex flex-col">
            <RegistrationProgressBar
                currentStep={currentStep}
                totalSteps={formSteps.length}
                onPrevious={handlePrevious}
            />
            <RegistrationFormContent
                currentStep={currentStep}
                formData={formData}
                currentInput={currentInput}
                isSubmitting={isSubmitting}
                canProceed={canProceed}
                isRecording={isRecording}
                duration={duration}
                audioBlob={audioBlob}
                audioUrl={audioUrl}
                isPlaying={isPlaying}
                isListening={isListening}
                setCurrentInput={setCurrentInput}
                handleNext={handleNext}
                handleKeyPress={handleKeyPress}
                startRecording={startRecording}
                stopRecording={stopRecording}
                setAudioBlob={setAudioBlob}
                setAudioUrl={setAudioUrl}
                handlePlayPause={handlePlayPause}
                startSpeechToText={startSpeechToText}
                stopSpeechToText={stopSpeechToText}
                audioRef={audioRef}
            />
        </div>
    );
};

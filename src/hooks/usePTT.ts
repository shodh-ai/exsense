import { useCallback, useRef } from 'react';
import type React from 'react';
import type { Room } from 'livekit-client';
import { Track, createLocalAudioTrack } from 'livekit-client';

interface UsePTTDeps {
  roomInstance: Room;
  agentAudioElsRef: React.MutableRefObject<HTMLAudioElement[]>;
  pttBufferRef: React.MutableRefObject<string[]>;
  pttAcceptUntilTsRef: React.MutableRefObject<number>;
  thinkingTimeoutRef: React.MutableRefObject<number | null>;
  thinkingTimeoutMsRef: React.MutableRefObject<number>;
  setIsPushToTalkActive: (v: boolean) => void;
  setIsMicEnabled: (v: boolean) => void;
  setIsAwaitingAIResponse: (v: boolean) => void;
  setShowWaitingPill: (v: boolean) => void;
  startTask: (taskName: string, payload: object) => Promise<void>;
}

// ============================= FIX START ==============================
// We're changing the return type to expose the new state and function
export interface UsePTTReturn {
  startPushToTalk: () => Promise<void>;
  stopPushToTalk: () => Promise<void>;
  pttStateRef: React.MutableRefObject<'idle' | 'listening' | 'stopping'>;
  sendTranscriptTask: () => Promise<void>;
}

export function usePTT(deps: UsePTTDeps): UsePTTReturn {
// ============================= FIX END ================================
  const {
    roomInstance,
    agentAudioElsRef,
    pttBufferRef,
    pttAcceptUntilTsRef,
    thinkingTimeoutRef,
    thinkingTimeoutMsRef,
    setIsPushToTalkActive,
    setIsMicEnabled,
    setIsAwaitingAIResponse,
    setShowWaitingPill,
    startTask,
  } = deps;

  const lastSentTranscriptRef = useRef<string>('');
  const lastSentAtRef = useRef<number>(0);
  const pttStartTimeRef = useRef<number>(0);
  
  // ============================= FIX START ==============================
  // 1. Introduce the state machine and a ref for the safety timer.
  const pttStateRef = useRef<'idle' | 'listening' | 'stopping'>('idle');
  const safetyTimeoutRef = useRef<number | null>(null);

  // 2. Create a new, separate function for sending the transcript.
  // This logic is moved from the old stopPushToTalk function.
  const sendTranscriptTask = useCallback(async () => {
    // Always clear the safety timer when this function is called.
    if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = null;
    }

    // Reset the state machine to idle.
    pttStateRef.current = 'idle';

    const text = (pttBufferRef.current || []).join(' ').trim();
    pttBufferRef.current = [];
    pttAcceptUntilTsRef.current = 0;

    const pttDuration = Date.now() - pttStartTimeRef.current;
    if (pttDuration < 250) {
      console.log(`[PTT] Ignoring quick tap (${pttDuration}ms < 250ms minimum).`);
      return;
    }

    if (!text) {
      console.log('[PTT] Transcript is empty. Skipping (no event sent).');
      return;
    }

    const now = Date.now();
    const norm = text.trim();
    const lastNorm = (lastSentTranscriptRef.current || '').trim();
    if (lastNorm && norm === lastNorm && (now - (lastSentAtRef.current || 0)) < 120000) {
      console.log('[PTT] Suppressing duplicate transcript resend within window.');
      return;
    }

    console.log('[PTT] Transcript is not empty. Sending "student_spoke_or_acted".');
    await startTask('student_spoke_or_acted', { transcript: text });
    lastSentTranscriptRef.current = norm;
    lastSentAtRef.current = now;

    try {
      setIsAwaitingAIResponse(true);
      if (thinkingTimeoutRef.current) {
        clearTimeout(thinkingTimeoutRef.current);
        thinkingTimeoutRef.current = null;
      }
      thinkingTimeoutRef.current = window.setTimeout(() => {
        try { setIsAwaitingAIResponse(false); } catch {}
        try { setShowWaitingPill(true); } catch {}
        thinkingTimeoutRef.current = null;
      }, thinkingTimeoutMsRef.current);
    } catch {}
    try { setShowWaitingPill(false); } catch {}
  }, [
    startTask,
    pttBufferRef,
    pttAcceptUntilTsRef,
    setIsAwaitingAIResponse,
    setShowWaitingPill,
    thinkingTimeoutRef,
    thinkingTimeoutMsRef,
  ]);
  // ============================= FIX END ================================

  const startPushToTalk = useCallback(async () => {
    try {
      pttStartTimeRef.current = Date.now();
      try { agentAudioElsRef.current.forEach((el) => { try { el.volume = 0; } catch {} }); } catch {}
      setIsPushToTalkActive(true);
      setIsMicEnabled(true);
      pttBufferRef.current = [];
      // ============================= FIX START ==============================
      // 3. Set the state to 'listening' when PTT starts.
      pttStateRef.current = 'listening';
      // ============================= FIX END ================================
      try { pttAcceptUntilTsRef.current = Date.now() + 60000; } catch {}
      if (roomInstance?.localParticipant) {
        let pub = roomInstance.localParticipant.getTrackPublication(Track.Source.Microphone);
        if (!pub) {
          try {
            const mic = await createLocalAudioTrack({ echoCancellation: true, noiseSuppression: true, autoGainControl: true });
            try { await roomInstance.localParticipant.publishTrack(mic); } catch {}
          } catch {}
          for (let i = 0; i < 5 && !pub; i++) {
            await new Promise(r => setTimeout(r, 120));
            pub = roomInstance.localParticipant.getTrackPublication(Track.Source.Microphone);
          }
        }
        try { await roomInstance.localParticipant.setMicrophoneEnabled(true); } catch {}
        try {
          const p = roomInstance.localParticipant.getTrackPublication(Track.Source.Microphone);
          console.log('[PTT DIAG] mic enabled -> hasTrack:', !!p, 'isMuted:', p?.isMuted);
        } catch {}
      }
      try { setIsAwaitingAIResponse(false); } catch {}
      try { if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; } } catch {}
      try { setShowWaitingPill(false); } catch {}
    } catch (e) {
      console.error('[PTT] startPushToTalk failed:', e);
    }
  }, [roomInstance, agentAudioElsRef, pttBufferRef, pttAcceptUntilTsRef, thinkingTimeoutRef, setIsPushToTalkActive, setIsMicEnabled, setIsAwaitingAIResponse, setShowWaitingPill]);

  // ============================= FIX START ==============================
  // 4. Drastically simplify stopPushToTalk.
  const stopPushToTalk = useCallback(async () => {
    try {
      if (roomInstance?.localParticipant) {
        try {
          await roomInstance.localParticipant.setMicrophoneEnabled(false);
        } catch {}
      }
      try { agentAudioElsRef.current.forEach((el) => { try { el.volume = 1; } catch {} }); } catch {}
      setIsPushToTalkActive(false);
      setIsMicEnabled(false);

      // If we were actively listening, change state to 'stopping' and start the safety timer.
      // We no longer wait or send the transcript from here.
      if (pttStateRef.current === 'listening') {
        console.log('[PTT] Stop detected. Now in "stopping" state, awaiting final transcript.');
        pttStateRef.current = 'stopping';

        // Safety Net: If a final segment never arrives, send what we have after 3 seconds.
        if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current);
        safetyTimeoutRef.current = window.setTimeout(() => {
            if (pttStateRef.current === 'stopping') {
                console.warn('[PTT] Safety timeout triggered. No final segment received. Sending buffered transcript.');
                sendTranscriptTask();
            }
        }, 3000); // 3-second safety net
      }
    } catch (e) {
      console.error('[PTT] stopPushToTalk failed:', e);
      // Ensure state is reset on error to prevent getting stuck
      pttBufferRef.current = [];
      pttStateRef.current = 'idle';
    }
  }, [
    roomInstance,
    agentAudioElsRef,
    setIsPushToTalkActive,
    setIsMicEnabled,
    pttBufferRef,
    sendTranscriptTask,
  ]);
  // ============================= FIX END ================================

  // ============================= FIX START ==============================
  // 5. Return the new refs and functions for the parent hook to use.
  return { startPushToTalk, stopPushToTalk, pttStateRef, sendTranscriptTask };
  // ============================= FIX END ================================
}

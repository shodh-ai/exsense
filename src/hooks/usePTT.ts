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
  isAwaitingAIResponse: boolean;
}

export function usePTT(deps: UsePTTDeps) {
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
    isAwaitingAIResponse,
  } = deps;

  const sentThisPTTRef = useRef<boolean>(false);
  const lastSentTranscriptRef = useRef<string>('');
  const lastSentAtRef = useRef<number>(0);
  const pttStartTimeRef = useRef<number>(0);

  const startPushToTalk = useCallback(async () => {
    try {
      // Prevent starting PTT while waiting for AI response
      if (isAwaitingAIResponse) {
        console.log('[PTT] Cannot start PTT while waiting for AI response');
        return;
      }
      pttStartTimeRef.current = Date.now();
      try { agentAudioElsRef.current.forEach((el) => { try { el.volume = 0; } catch {} }); } catch {}
      setIsPushToTalkActive(true);
      setIsMicEnabled(true);
      pttBufferRef.current = [];
      sentThisPTTRef.current = false;
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
  }, [roomInstance, agentAudioElsRef, pttBufferRef, pttAcceptUntilTsRef, thinkingTimeoutRef, setIsPushToTalkActive, setIsMicEnabled, setIsAwaitingAIResponse, setShowWaitingPill, isAwaitingAIResponse]);

  const stopPushToTalk = useCallback(async () => {
    try {
      if (roomInstance?.localParticipant) {
        try {
          await roomInstance.localParticipant.setMicrophoneEnabled(false);
          try {
            const pub = roomInstance.localParticipant.getTrackPublication(Track.Source.Microphone);
            console.log('[PTT DIAG] mic disabled -> hasTrack:', !!pub, 'isMuted:', pub?.isMuted);
          } catch {}
        } catch {}
      }
      try { agentAudioElsRef.current.forEach((el) => { try { el.volume = 1; } catch {} }); } catch {}
      setIsPushToTalkActive(false);
      setIsMicEnabled(false);

      // Check minimum duration (250ms) to prevent accidental quick taps
      const pttDuration = Date.now() - pttStartTimeRef.current;
      if (pttDuration < 250) {
        console.log(`[PTT] Ignoring quick tap (${pttDuration}ms < 250ms minimum).`);
        pttBufferRef.current = [];
        return;
      }

      // Per-press guard: ensure we send at most once for this PTT cycle
      if (sentThisPTTRef.current) {
        console.log('[PTT] Duplicate stop ignored (already sent for this press).');
        return;
      }
      sentThisPTTRef.current = true;

      // Short wait to accept late STT segments
      try { pttAcceptUntilTsRef.current = Date.now() + 1000; } catch {}
      try { await new Promise(r => setTimeout(r, 1100)); } catch {}

      const text = (pttBufferRef.current || []).join(' ').trim();
      pttBufferRef.current = [];
      try { pttAcceptUntilTsRef.current = 0; } catch {}

      // Diagnostics: log transcript and decision
      console.log(`[PTT] stopPushToTalk triggered. Duration: ${pttDuration}ms, Final transcript: "${text}"`);

      // If transcript is empty, re-enable mic immediately (user can try again)
      if (!text || text.length === 0) {
        console.log('[PTT] Transcript is empty. Re-enabling mic for retry.');
        try { setIsAwaitingAIResponse(false); } catch {}
        return;
      }

      const now = Date.now();
      // Short-window dedupe across presses in case something triggers an immediate resend
      const norm = text.trim();
      const lastNorm = (lastSentTranscriptRef.current || '').trim();
      if (lastNorm && norm === lastNorm && (now - (lastSentAtRef.current || 0)) < 120000) {
        console.log('[PTT] Suppressing duplicate transcript resend within window.');
        try { setIsAwaitingAIResponse(false); } catch {}
        return;
      }

      console.log('[PTT] Transcript is not empty. Sending "student_spoke_or_acted".');
      await startTask('student_spoke_or_acted', { transcript: text });
      lastSentTranscriptRef.current = norm;
      lastSentAtRef.current = now;

      // Keep mic disabled while waiting for AI response
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
    } catch (e) {
      console.error('[PTT] stopPushToTalk failed:', e);
    }
  }, [roomInstance, agentAudioElsRef, setIsPushToTalkActive, setIsMicEnabled, pttBufferRef, pttAcceptUntilTsRef, startTask, setIsAwaitingAIResponse, thinkingTimeoutRef, thinkingTimeoutMsRef, setShowWaitingPill]);

  return { startPushToTalk, stopPushToTalk };
}

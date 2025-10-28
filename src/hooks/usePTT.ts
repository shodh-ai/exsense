import { useCallback } from 'react';
import type React from 'react';
import type { Room } from 'livekit-client';
import { Track } from 'livekit-client';

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
  } = deps;

  const startPushToTalk = useCallback(async () => {
    try {
      try { agentAudioElsRef.current.forEach((el) => { try { el.volume = 0; } catch {} }); } catch {}
      setIsPushToTalkActive(true);
      setIsMicEnabled(true);
      pttBufferRef.current = [];
      try { pttAcceptUntilTsRef.current = Date.now() + 60000; } catch {}
      if (roomInstance?.localParticipant) {
        await roomInstance.localParticipant.setMicrophoneEnabled(true);
        try {
          const pub = roomInstance.localParticipant.getTrackPublication(Track.Source.Microphone);
          console.log('[PTT DIAG] mic enabled -> hasTrack:', !!pub, 'isMuted:', pub?.isMuted);
        } catch {}
      }
      try { setIsAwaitingAIResponse(false); } catch {}
      try { if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; } } catch {}
      try { setShowWaitingPill(false); } catch {}
    } catch (e) {
      console.error('[PTT] startPushToTalk failed:', e);
    }
  }, [roomInstance, agentAudioElsRef, pttBufferRef, pttAcceptUntilTsRef, thinkingTimeoutRef, setIsPushToTalkActive, setIsMicEnabled, setIsAwaitingAIResponse, setShowWaitingPill]);

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
      // Linger to accept late STT segments
      try { pttAcceptUntilTsRef.current = Date.now() + 1800; } catch {}
      try { await new Promise(r => setTimeout(r, 1850)); } catch {}
      const text = (pttBufferRef.current || []).join(' ').trim();
      pttBufferRef.current = [];
      try { pttAcceptUntilTsRef.current = 0; } catch {}
      // Diagnostics: log transcript and decision
      console.log(`[PTT] stopPushToTalk triggered. Final transcript: "${text}"`);
      if (text && text.length > 0) {
        console.log('[PTT] Transcript is not empty. Sending "student_spoke_or_acted".');
        await startTask('student_spoke_or_acted', { transcript: text });
      } else {
        console.log('[PTT] Transcript is empty. Sending "student_stopped_listening".');
        await startTask('student_stopped_listening', {});
      }
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

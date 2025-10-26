import { useCallback } from 'react';
import type React from 'react';
import type { Room } from 'livekit-client';

interface UsePTTDeps {
  roomInstance: Room;
  agentAudioElsRef: React.MutableRefObject<HTMLAudioElement[]>;
  pttBufferRef: React.MutableRefObject<string[]>;
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
      if (roomInstance?.localParticipant) {
        await roomInstance.localParticipant.setMicrophoneEnabled(true);
      }
      try { setIsAwaitingAIResponse(false); } catch {}
      try { if (thinkingTimeoutRef.current) { clearTimeout(thinkingTimeoutRef.current); thinkingTimeoutRef.current = null; } } catch {}
      try { setShowWaitingPill(false); } catch {}
    } catch (e) {
      console.error('[PTT] startPushToTalk failed:', e);
    }
  }, [roomInstance, agentAudioElsRef, pttBufferRef, thinkingTimeoutRef, setIsPushToTalkActive, setIsMicEnabled, setIsAwaitingAIResponse, setShowWaitingPill]);

  const stopPushToTalk = useCallback(async () => {
    try {
      if (roomInstance?.localParticipant) {
        try { await roomInstance.localParticipant.setMicrophoneEnabled(false); } catch {}
      }
      try { agentAudioElsRef.current.forEach((el) => { try { el.volume = 1; } catch {} }); } catch {}
      setIsPushToTalkActive(false);
      setIsMicEnabled(false);
      const text = (pttBufferRef.current || []).join(' ').trim();
      pttBufferRef.current = [];
      if (text && text.length > 0) {
        await startTask('student_spoke_or_acted', { transcript: text });
      } else {
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
  }, [roomInstance, agentAudioElsRef, setIsPushToTalkActive, setIsMicEnabled, pttBufferRef, startTask, setIsAwaitingAIResponse, thinkingTimeoutRef, thinkingTimeoutMsRef, setShowWaitingPill]);

  return { startPushToTalk, stopPushToTalk };
}

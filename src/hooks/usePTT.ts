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
  agentIdentity?: string | null;
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
    agentIdentity,
  } = deps;

  const textToBase64 = (str: string): string => {
    const bytes = new TextEncoder().encode(str);
    let bin = '';
    for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin);
  };

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
      // Diagnostics: log transcript and decision
      console.log(`[PTT] stopPushToTalk triggered. Final transcript: "${text}"`);
      const canRpc = !!agentIdentity && !!roomInstance?.localParticipant;
      if (canRpc) {
        try {
          if (text && text.length > 0) {
            console.log('[PTT] Transcript is not empty. Sending via RPC: student_spoke_or_acted');
            await (roomInstance.localParticipant as any).performRpc({
              destinationIdentity: agentIdentity,
              method: 'rox.interaction.AgentInteraction/student_spoke_or_acted',
              payload: textToBase64(text),
              responseTimeout: 30000,
            });
          } else {
            console.log('[PTT] Transcript empty. Sending via RPC: student_stopped_listening');
            await (roomInstance.localParticipant as any).performRpc({
              destinationIdentity: agentIdentity,
              method: 'rox.interaction.AgentInteraction/student_stopped_listening',
              payload: '',
              responseTimeout: 15000,
            });
          }
        } catch (e) {
          console.warn('[PTT] RPC path failed, falling back to DataChannel startTask:', e);
          if (text && text.length > 0) {
            await startTask('student_spoke_or_acted', { transcript: text });
          } else {
            await startTask('student_stopped_listening', {});
          }
        }
      } else {
        if (text && text.length > 0) {
          console.log('[PTT] RPC not available. Fallback DataChannel: student_spoke_or_acted');
          await startTask('student_spoke_or_acted', { transcript: text });
        } else {
          console.log('[PTT] RPC not available. Fallback DataChannel: student_stopped_listening');
          await startTask('student_stopped_listening', {});
        }
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

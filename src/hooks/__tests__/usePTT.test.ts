import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import type { Room } from 'livekit-client';
import { usePTT } from '../usePTT';

describe('usePTT', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.useFakeTimers();
  });

  afterEach(() => {
    try { createRoot(container).unmount(); } catch {}
    if (container.parentNode) container.parentNode.removeChild(container);
    jest.useRealTimers();
    jest.resetAllMocks();
  });

  function HarnessPTT({ deps, onReady }: { deps: Parameters<typeof usePTT>[0]; onReady: (api: ReturnType<typeof usePTT>) => void }) {
    const api = usePTT(deps);
    onReady(api);
    return null as any;
  }

  function makeDeps(overrides: Partial<Parameters<typeof usePTT>[0]> = {}): Parameters<typeof usePTT>[0] {
    const localParticipant = {
      setMicrophoneEnabled: jest.fn().mockResolvedValue(undefined),
    } as any;

    const roomInstance = { localParticipant } as unknown as Room;

    const audioEl = document.createElement('audio');
    Object.defineProperty(audioEl, 'volume', { value: 1, writable: true });

    const deps: Parameters<typeof usePTT>[0] = {
      roomInstance,
      agentAudioElsRef: { current: [audioEl] },
      pttBufferRef: { current: [] },
      thinkingTimeoutRef: { current: null },
      thinkingTimeoutMsRef: { current: 2000 },
      setIsPushToTalkActive: jest.fn(),
      setIsMicEnabled: jest.fn(),
      setIsAwaitingAIResponse: jest.fn(),
      setShowWaitingPill: jest.fn(),
      startTask: jest.fn().mockResolvedValue(undefined),
    };
    return { ...deps, ...overrides };
  }

  test('startPushToTalk enables mic, mutes agent audio, resets buffers and flags', async () => {
    const deps = makeDeps();
    let api!: ReturnType<typeof usePTT>;

    await act(async () => {
      createRoot(container).render(React.createElement(HarnessPTT, { deps, onReady: (a) => { api = a; } }));
    });

    await act(async () => {
      await api.startPushToTalk();
    });

    const localParticipant = (deps.roomInstance as any).localParticipant;
    expect(localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
    expect(deps.setIsPushToTalkActive).toHaveBeenCalledWith(true);
    expect(deps.setIsMicEnabled).toHaveBeenCalledWith(true);
    expect(deps.pttBufferRef.current).toEqual([]);
    // agent audio elements should be muted to prevent feedback
    expect(deps.agentAudioElsRef.current[0].volume).toBe(0);
    // thinking state cleared
    expect(deps.setIsAwaitingAIResponse).toHaveBeenCalledWith(false);
    expect(deps.setShowWaitingPill).toHaveBeenCalledWith(false);
  });

  test('stopPushToTalk disables mic, restores audio volume, and sends proper task with transcript', async () => {
    const deps = makeDeps();
    // simulate some buffered speech from STT
    deps.pttBufferRef.current = ['Hello', 'world'];
    let api!: ReturnType<typeof usePTT>;

    await act(async () => {
      createRoot(container).render(React.createElement(HarnessPTT, { deps, onReady: (a: any) => { api = a; } }));
    });

    await act(async () => {
      await api.stopPushToTalk();
    });

    const localParticipant = (deps.roomInstance as any).localParticipant;
    expect(localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(false);
    // task should be sent with merged transcript
    expect(deps.startTask).toHaveBeenCalledWith('student_spoke_or_acted', { transcript: 'Hello world' });
    // state toggles
    expect(deps.setIsPushToTalkActive).toHaveBeenCalledWith(false);
    expect(deps.setIsMicEnabled).toHaveBeenCalledWith(false);
    // agent audio volume restored
    expect(deps.agentAudioElsRef.current[0].volume).toBe(1);
    // awaiting state set and timeout scheduled
    expect(deps.setIsAwaitingAIResponse).toHaveBeenCalledWith(true);
    // run timers to trigger timeout side-effects
    act(() => { jest.advanceTimersByTime(2100); });
    expect(deps.setIsAwaitingAIResponse).toHaveBeenCalledWith(false);
    expect(deps.setShowWaitingPill).toHaveBeenCalledWith(true);
  });

  test('stopPushToTalk sends fallback task when no transcript collected', async () => {
    const deps = makeDeps();
    deps.pttBufferRef.current = [];
    let api!: ReturnType<typeof usePTT>;

    await act(async () => {
      createRoot(container).render(React.createElement(HarnessPTT, { deps, onReady: (a: any) => { api = a; } }));
    });

    await act(async () => {
      await api.stopPushToTalk();
    });

    expect(deps.startTask).toHaveBeenCalledWith('student_stopped_listening', {});
  });
});

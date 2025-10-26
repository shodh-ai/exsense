import React, { useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { useSessionCleanup } from '../useSessionCleanup';

describe('useSessionCleanup', () => {
  let container: HTMLDivElement;
  const originalFetch = global.fetch;
  const originalSendBeacon = (navigator as any).sendBeacon;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    jest.useFakeTimers();
    (global as any).fetch = jest.fn();
    (navigator as any).sendBeacon = jest.fn().mockReturnValue(true);
  });

  afterEach(() => {
    try { createRoot(container).unmount(); } catch {}
    if (container.parentNode) container.parentNode.removeChild(container);
    jest.useRealTimers();

    (global as any).fetch = originalFetch;
    (navigator as any).sendBeacon = originalSendBeacon;
    jest.resetAllMocks();
  });

  function Harness(props: Parameters<typeof useSessionCleanup>[0]) {
    useSessionCleanup(props);
    return null as any;
  }

  test('exposes imperative delete and calls DELETE endpoint directly with sessionId', async () => {
    const isUnloadingRef = { current: false } as React.MutableRefObject<boolean>;
    const sessionIdRef = { current: 'sess-123' } as React.MutableRefObject<string | null>;
    const sessionStatusUrlRef = { current: null } as React.MutableRefObject<string | null>;
    const sendDeleteNowRef = { current: null as null | (() => Promise<void>) };

    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await act(async () => {
      createRoot(container).render(
        React.createElement(Harness, {
          DELETE_ON_UNLOAD: true,
          isUnloadingRef,
          sessionIdRef,
          sessionStatusUrlRef,
          sendDeleteNowRef,
        })
      );
    });

    expect(typeof sendDeleteNowRef.current).toBe('function');

    await act(async () => {
      await sendDeleteNowRef.current!();
    });

    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/sess-123?_method=DELETE', expect.objectContaining({ method: 'DELETE' }));
    expect((navigator as any).sendBeacon).not.toHaveBeenCalled();
  });

  test('falls back to sendBeacon when fetch fails', async () => {
    const isUnloadingRef = { current: false } as React.MutableRefObject<boolean>;
    const sessionIdRef = { current: 'sess-abc' } as React.MutableRefObject<string | null>;
    const sessionStatusUrlRef = { current: null } as React.MutableRefObject<string | null>;
    const sendDeleteNowRef = { current: null as null | (() => Promise<void>) };

    (global.fetch as jest.Mock).mockRejectedValue(new Error('network error'));

    await act(async () => {
      createRoot(container).render(
        React.createElement(Harness, {
          DELETE_ON_UNLOAD: true,
          isUnloadingRef,
          sessionIdRef,
          sessionStatusUrlRef,
          sendDeleteNowRef,
        })
      );
    });

    await act(async () => {
      await sendDeleteNowRef.current!();
    });

    expect((navigator as any).sendBeacon).toHaveBeenCalled();
  });

  test('resolves sessionId via status URL when not yet set', async () => {
    const isUnloadingRef = { current: false } as React.MutableRefObject<boolean>;
    const sessionIdRef = { current: null } as React.MutableRefObject<string | null>;
    const sessionStatusUrlRef = { current: '/api/sessions/status/job-1' } as React.MutableRefObject<string | null>;
    const sendDeleteNowRef = { current: null as null | (() => Promise<void>) };

    (global.fetch as jest.Mock)
      // first call: status URL
      .mockResolvedValueOnce({ ok: true, json: async () => ({ sessionId: 'sess-from-status' }) })
      // second call: delete
      .mockResolvedValueOnce({ ok: true });

    await act(async () => {
      createRoot(container).render(
        React.createElement(Harness, {
          DELETE_ON_UNLOAD: true,
          isUnloadingRef,
          sessionIdRef,
          sessionStatusUrlRef,
          sendDeleteNowRef,
        })
      );
    });

    await act(async () => {
      await sendDeleteNowRef.current!();
    });

    expect(global.fetch).toHaveBeenNthCalledWith(
      1,
      '/api/sessions/status/job-1',
      expect.objectContaining({ cache: 'no-store' })
    );
    expect(global.fetch).toHaveBeenNthCalledWith(
      2,
      '/api/sessions/sess-from-status?_method=DELETE',
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  test('hooks beforeunload/pagehide to trigger deletion and sets isUnloadingRef', async () => {
    const isUnloadingRef = { current: false } as React.MutableRefObject<boolean>;
    const sessionIdRef = { current: 'sess-999' } as React.MutableRefObject<string | null>;
    const sessionStatusUrlRef = { current: null } as React.MutableRefObject<string | null>;
    const sendDeleteNowRef = { current: null as null | (() => Promise<void>) };

    (global.fetch as jest.Mock).mockResolvedValue({ ok: true });

    await act(async () => {
      createRoot(container).render(
        React.createElement(Harness, {
          DELETE_ON_UNLOAD: true,
          isUnloadingRef,
          sessionIdRef,
          sessionStatusUrlRef,
          sendDeleteNowRef,
        })
      );
    });

    expect(isUnloadingRef.current).toBe(false);

    // dispatch beforeunload
    act(() => {
      window.dispatchEvent(new Event('beforeunload'));
    });

    expect(isUnloadingRef.current).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('/api/sessions/sess-999?_method=DELETE', expect.anything());
  });
});

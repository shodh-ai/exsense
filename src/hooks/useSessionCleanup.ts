import { useEffect } from 'react';

interface UseSessionCleanupArgs {
  DELETE_ON_UNLOAD: boolean;
  isUnloadingRef: React.MutableRefObject<boolean>;
  sessionIdRef: React.MutableRefObject<string | null>;
  sessionStatusUrlRef: React.MutableRefObject<string | null>;
  sendDeleteNowRef: React.MutableRefObject<(() => Promise<void>) | null>;
}

export function useSessionCleanup({
  DELETE_ON_UNLOAD,
  isUnloadingRef,
  sessionIdRef,
  sessionStatusUrlRef,
  sendDeleteNowRef,
}: UseSessionCleanupArgs) {
  useEffect(() => {
    const sendDelete = async (force: boolean = false) => {
      try {
        let sessId = sessionIdRef.current;
        if (!sessId) {
          const statusUrl = sessionStatusUrlRef.current;
          if (statusUrl) {
            try {
              const ctrl = new AbortController();
              const t = setTimeout(() => ctrl.abort(), 1500);
              const stResp = await fetch(statusUrl, { signal: ctrl.signal, cache: 'no-store' });
              clearTimeout(t);
              if (stResp.ok) {
                const st = await stResp.json();
                const id = st?.sessionId as string | undefined;
                if (id && id.startsWith('sess-')) {
                  sessId = id;
                  sessionIdRef.current = id;
                }
              }
            } catch {}
          }
          if (!sessId) {
            for (let i = 0; i < 10; i++) {
              await new Promise((resolve) => setTimeout(resolve, 200));
              sessId = sessionIdRef.current;
              if (sessId) break;
            }
          }
        }
        if (!sessId) return;

        // By default, use grace period (allows refresh reconnection)
        // Only force immediate deletion if explicitly requested
        const forceParam = force ? '?force=true' : '';
        const url = `/api/sessions/${sessId}${forceParam}`;

        try {
          await fetch(url, { method: 'DELETE', keepalive: true, mode: 'cors' });
        } catch {
          try {
            if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
              const blob = new Blob([], { type: 'text/plain' });
              (navigator as any).sendBeacon(url, blob);
            }
          } catch {}
        }
      } catch {}
    };

    // Expose imperative deletion (with optional force parameter)
    // When called without force, uses grace period (good for navigation)
    // When called with force=true, immediately terminates pod
    sendDeleteNowRef.current = (force?: boolean) => sendDelete(force || false);

    if (DELETE_ON_UNLOAD) {
      const onUnload = () => {
        try {
          isUnloadingRef.current = true;
          // On page unload, use grace period (not force delete)
          // This allows the user to refresh without losing their session
          // The LiveKit webhook will handle actual disconnects
          void sendDelete(false);
        } catch {}
      };
      window.addEventListener('beforeunload', onUnload);
      window.addEventListener('pagehide', onUnload, { capture: true });
      return () => {
        window.removeEventListener('beforeunload', onUnload);
        window.removeEventListener('pagehide', onUnload, { capture: true } as any);
      };
    }

    return () => {};
  }, [DELETE_ON_UNLOAD]);
}

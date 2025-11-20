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
    const sendDelete = async () => {
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
            } catch { }
          }
          if (!sessId) {
            // Best-effort: if we don't have an ID yet, we can't delete.
            // We do NOT wait in a loop here because during 'unload' the browser
            // will likely kill the process before the loop completes.
          }
        }
        if (!sessId) return;
        const url = `/api/sessions/${sessId}`;
        try {
          // Use keepalive to allow the request to outlive the page
          await fetch(url, { method: 'DELETE', keepalive: true, mode: 'cors' });
        } catch (e) {
          // Ignore errors during unload
        }
      } catch { }
    };

    // Expose imperative deletion
    sendDeleteNowRef.current = () => sendDelete();

    if (DELETE_ON_UNLOAD) {
      const onUnload = () => {
        try {
          isUnloadingRef.current = true;
          void sendDelete();
        } catch { }
      };
      window.addEventListener('beforeunload', onUnload);
      window.addEventListener('pagehide', onUnload, { capture: true });
      return () => {
        window.removeEventListener('beforeunload', onUnload);
        window.removeEventListener('pagehide', onUnload, { capture: true } as any);
      };
    }

    return () => { };
  }, [DELETE_ON_UNLOAD]);
}

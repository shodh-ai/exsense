import { useEffect } from 'react';

interface UseSessionCleanupArgs {
  DELETE_ON_UNLOAD: boolean;
  isUnloadingRef: React.MutableRefObject<boolean>;
  sessionIdRef: React.MutableRefObject<string | null>;
  sessionStatusUrlRef: React.MutableRefObject<string | null>;
  sendDeleteNowRef: React.MutableRefObject<(() => Promise<void>) | null>;
  isConnected: boolean;
  roomName: string;
}

export function useSessionCleanup({
  DELETE_ON_UNLOAD,
  isUnloadingRef,
  sessionIdRef,
  sessionStatusUrlRef,
  sendDeleteNowRef,
  isConnected,
  roomName,
}: UseSessionCleanupArgs) {
  useEffect(() => {
    /**
     * Send DELETE request with optional force parameter.
     * force=true: Immediate cleanup (bypass grace period)
     * force=false: Graceful cleanup (respects grace period)
     */
    const sendDelete = async (force: boolean = false) => {
      try {
        let sessId = sessionIdRef.current;
        
        // Try to get session ID from status URL if not directly available
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
          
          // Fallback: Use roomName if it looks like a session ID
          if (!sessId && roomName && roomName.startsWith('sess-')) {
            sessId = roomName;
            sessionIdRef.current = roomName;
          }
          
          // Last resort: poll for session ID
          if (!sessId) {
            for (let i = 0; i < 10; i++) {
              await new Promise((resolve) => setTimeout(resolve, 200));
              sessId = sessionIdRef.current;
              if (sessId) break;
            }
          }
        }
        
        if (!sessId) {
          console.warn('[CLEANUP] No session ID available for deletion');
          return;
        }
        
        // Build URL with force parameter when needed
        const forceParam = force ? '?force=true' : '';
        const url = `/api/sessions/${sessId}${forceParam}`;
        
        console.log(`[CLEANUP] Sending DELETE request to ${url} (force=${force})`);
        
        try {
          await fetch(url, { 
            method: 'DELETE', 
            keepalive: true, 
            mode: 'cors',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          console.log('[CLEANUP] DELETE request sent successfully');
        } catch (fetchError) {
          console.warn('[CLEANUP] Fetch failed, trying sendBeacon:', fetchError);
          // Fallback to sendBeacon for page unload scenarios
          try {
            if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
              const blob = new Blob([JSON.stringify({ force })], { type: 'application/json' });
              const beaconUrl = `/api/sessions/${sessId}${forceParam}`;
              (navigator as any).sendBeacon(beaconUrl, blob);
              console.log('[CLEANUP] sendBeacon sent as fallback');
            }
          } catch (beaconError) {
            console.error('[CLEANUP] sendBeacon also failed:', beaconError);
          }
        }
      } catch (error) {
        console.error('[CLEANUP] Error in sendDelete:', error);
      }
    };

    // Expose imperative deletion with force=true (for "End Session" button)
    sendDeleteNowRef.current = () => sendDelete(true);

    // RESTORED: Graceful cleanup on browser close
    // This triggers the grace period, allowing quick reconnection
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      // Only trigger graceful delete if actually connected
      if (!isConnected) {
        console.log('[CLEANUP] Skipping graceful delete - not connected');
        return;
      }

      console.log('[CLEANUP] beforeunload triggered - initiating graceful delete');
      isUnloadingRef.current = true;
      
      // Send graceful delete (no force parameter = grace period active)
      await sendDelete(false);
    };

    const handlePageHide = async () => {
      // Only trigger graceful delete if actually connected
      if (!isConnected) {
        console.log('[CLEANUP] Skipping graceful delete - not connected');
        return;
      }

      console.log('[CLEANUP] pagehide triggered - initiating graceful delete');
      isUnloadingRef.current = true;
      
      // Send graceful delete with sendBeacon for reliability
      const sessId = sessionIdRef.current;
      if (sessId) {
        try {
          const url = `/api/sessions/${sessId}`;
          const blob = new Blob([JSON.stringify({ force: false })], { type: 'application/json' });
          if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
            (navigator as any).sendBeacon(url, blob);
            console.log('[CLEANUP] sendBeacon sent for graceful delete');
          }
        } catch (error) {
          console.error('[CLEANUP] Failed to send beacon:', error);
        }
      }
    };

    // Only add listeners when DELETE_ON_UNLOAD is true
    if (DELETE_ON_UNLOAD) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      window.addEventListener('pagehide', handlePageHide);
      console.log('[CLEANUP] Graceful cleanup listeners registered');
    }
    
    return () => {
      if (DELETE_ON_UNLOAD) {
        window.removeEventListener('beforeunload', handleBeforeUnload);
        window.removeEventListener('pagehide', handlePageHide);
        console.log('[CLEANUP] Cleanup listeners removed');
      }
    };
  }, [DELETE_ON_UNLOAD, isUnloadingRef, sessionIdRef, sessionStatusUrlRef, sendDeleteNowRef, isConnected, roomName]);
}
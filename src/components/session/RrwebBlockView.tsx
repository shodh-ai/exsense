'use client';

import React, { useEffect, useRef, useState } from 'react';

// Lazy import to avoid SSR issues; rrweb-player relies on DOM APIs
let ReplayerCtor: any = null;

export interface RrwebBlockViewProps {
  eventsUrl: string;
  startTime?: number;       // Optional: Start playback from this timestamp (ms)
  duration?: number;         // Optional: Auto-pause after this duration (ms)
}

const RrwebBlockView: React.FC<RrwebBlockViewProps> = ({ eventsUrl, startTime, duration }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let replayer: any | null = null;
    let cancelled = false;

    const setupReplayer = async (url: string) => {
      if (!containerRef.current) return;
      setIsLoading(true);
      setError(null);
      try {
        if (!ReplayerCtor) {
          const mod: any = await import('rrweb-player');
          ReplayerCtor = mod?.Replayer || mod?.default;
        }
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`Failed to fetch events: ${resp.status} ${resp.statusText}`);
        const events = await resp.json();
        if (!Array.isArray(events) || events.length === 0) {
          throw new Error('No events found in the provided data.');
        }
        if (cancelled) return;

        replayer = new ReplayerCtor({
          target: containerRef.current,
          props: {
            events,
          },
        });

        // Support precise timestamp-based playback for RAG-controlled demos
        if (startTime !== undefined && startTime > 0) {
          console.log(`[RrwebBlockView] Starting playback from ${startTime}ms (relative to recording start)`);

          // Start playing and immediately seek to the target time
          replayer.play();

          // Use goto to jump to specific timestamp (relative to recording start)
          // Wait a tick for player to initialize
          setTimeout(() => {
            try {
              console.log('[RrwebBlockView] Replayer methods:', Object.keys(replayer).filter(k => typeof replayer[k] === 'function'));

              if (typeof replayer.goto === 'function') {
                const beforeTime = replayer.getCurrentTime?.() || 'unknown';
                // goto() expects relative time in ms from start of recording
                replayer.goto(startTime);
                const afterTime = replayer.getCurrentTime?.() || 'unknown';
                console.log(`[RrwebBlockView] ✅ Seeked using goto()`);
                console.log(`[RrwebBlockView] Before: ${beforeTime}ms, After: ${afterTime}ms, Target: ${startTime}ms`);
              } else if (typeof replayer.setCurrentTime === 'function') {
                console.warn('[RrwebBlockView] goto not available, using setCurrentTime');
                replayer.setCurrentTime(startTime);
              } else {
                console.error('[RrwebBlockView] ❌ No seek method available on replayer!');
                console.error('[RrwebBlockView] Available methods:', Object.keys(replayer));
              }
            } catch (e) {
              console.error('[RrwebBlockView] ❌ Failed to seek:', e);
            }
          }, 100);

          // Auto-pause after duration if specified
          if (duration && duration > 0) {
            console.log(`[RrwebBlockView] Will auto-pause after ${duration}ms`);
            setTimeout(() => {
              try {
                replayer.pause();
                console.log(`[RrwebBlockView] Auto-paused after ${duration}ms`);
              } catch (e) {
                console.error('[RrwebBlockView] Failed to auto-pause:', e);
              }
            }, duration + 200); // Add buffer for seek time
          }
        } else {
          // Default: play from beginning
          replayer.play();
        }

        setIsLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        console.error('[RrwebBlockView] Failed to setup replayer:', e);
        const message = e instanceof Error ? e.message : 'Unknown error';
        setError(message);
        setIsLoading(false);
      }
    };

    if (eventsUrl && containerRef.current) {
      setupReplayer(eventsUrl);
    }

    return () => {
      cancelled = true;
      try { replayer?.destroy?.(); } catch {}
    };
  }, [eventsUrl]);

  if (!eventsUrl) return null;

  return (
    <div
      style={{
        width: '100%',
        minHeight: 360,
        backgroundColor: '#000',
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden'
      }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 360 }} />
      {isLoading && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: '#ccc',
          backgroundColor: 'rgba(0, 0, 0, 0.8)'
        }}>
          Loading Replay...
        </div>
      )}
      {error && (
        <div style={{ 
          position: 'absolute', 
          inset: 0, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          color: '#ff6b6b',
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 20,
          textAlign: 'center'
        }}>
          Error: {error}
        </div>
      )}
    </div>
  );
};

export default RrwebBlockView;

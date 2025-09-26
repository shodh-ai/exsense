'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '@/lib/store';

// Lazy import to avoid SSR issues; rrweb-player relies on DOM APIs
let ReplayerCtor: any = null;

export const RrwebPlayer: React.FC = () => {
  const replayUrl = useSessionStore((s) => s.replayEventsUrl);
  const hideReplay = useSessionStore((s) => s.hideReplay);

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
        replayer.play();
        setIsLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        console.error('[RrwebPlayer] Failed to setup replayer:', e);
        const message = e instanceof Error ? e.message : 'Unknown error';
        setError(message);
        setIsLoading(false);
      }
    };

    if (replayUrl && containerRef.current) {
      setupReplayer(replayUrl);
    }

    return () => {
      cancelled = true;
      try { replayer?.destroy?.(); } catch {}
    };
  }, [replayUrl]);

  if (!replayUrl) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        style={{
          position: 'relative',
          width: '90%',
          height: '90%',
          backgroundColor: '#fff',
          borderRadius: 8,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 10px 30px rgba(0,0,0,0.3)'
        }}
      >
        <div
          style={{
            padding: 10,
            backgroundColor: '#f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #ccc',
          }}
        >
          <h3 style={{ margin: 0, color: '#333' }}>Session Replay</h3>
          <button
            onClick={hideReplay}
            style={{
              padding: '8px 16px',
              cursor: 'pointer',
              border: 'none',
              borderRadius: 4,
              backgroundColor: '#e53e3e',
              color: '#fff',
            }}
          >
            Close
          </button>
        </div>
        <div ref={containerRef} style={{ flex: 1, position: 'relative' }}>
          {isLoading && (
            <p style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              Loading Replay...
            </p>
          )}
          {error && (
            <p style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'red' }}>
              Error: {error}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};


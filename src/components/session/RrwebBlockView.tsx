'use client';

import React, { useEffect, useRef, useState } from 'react';

// Lazy import to avoid SSR issues; rrweb-player relies on DOM APIs
let ReplayerCtor: any = null;

export interface RrwebBlockViewProps {
  eventsUrl: string;
}

const RrwebBlockView: React.FC<RrwebBlockViewProps> = ({ eventsUrl }) => {
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

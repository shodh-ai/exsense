'use client';

import React, { useEffect, useRef, useState } from 'react';
import 'rrweb-player/dist/style.css';

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

    const setup = async () => {
      if (!containerRef.current || !eventsUrl) return;
      setIsLoading(true);
      setError(null);
      try {
        if (!ReplayerCtor) {
          const mod: any = await import('rrweb-player');
          ReplayerCtor = mod?.Replayer || mod?.default;
        }
        const resp = await fetch(eventsUrl, { cache: 'no-store' });
        if (!resp.ok) throw new Error(`Failed to fetch events: ${resp.status} ${resp.statusText}`);
        const events = await resp.json();
        if (!Array.isArray(events) || events.length === 0) {
          throw new Error('No events found in the provided data.');
        }
        if (cancelled) return;
        replayer = new ReplayerCtor({
          target: containerRef.current,
          props: { events },
        });
        replayer.play();
        setIsLoading(false);
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : 'Unknown error';
        setError(msg);
        setIsLoading(false);
      }
    };

    setup();
    return () => { cancelled = true; try { replayer?.destroy?.(); } catch {} };
  }, [eventsUrl]);

  return (
    <div style={{ width: '100%', minHeight: 360, background: '#000', position: 'relative' }}>
      <div ref={containerRef} style={{ width: '100%', height: 360 }} />
      {isLoading && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc' }}>Loading replay…</div>
      )}
      {error && (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'tomato' }}>Error: {error}</div>
      )}
    </div>
  );
};

export default RrwebBlockView;

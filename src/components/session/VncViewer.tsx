"use client";
import { VncScreen, VncScreenHandle } from 'react-vnc';
import React, { useRef, useEffect, useState } from 'react';
// File: exsense/src/components/session/VncViewer.tsx
interface VncViewerProps {
  // e.g., "ws://your-server-ip:6901"
  url: string;
  // Report interactions to parent (optional to avoid breaking existing callers)
  onInteraction?: (interaction: { action: string; x: number; y: number }) => void;
  // Optional overlay to render above the VNC screen (no longer used for clicks)
  overlay?: React.ReactNode;
}
export default function VncViewer({ url, onInteraction, overlay }: VncViewerProps) {
  // Ref attached to the main container for coordinate calculations
  const vncContainerRef = useRef<HTMLDivElement>(null);
  // Ref to access underlying noVNC RFB instance for sanity-guard settings
  const vncRef = useRef<VncScreenHandle>(null);
  // Track latest clipboard text received from the remote VNC server
  const [remoteClip, setRemoteClip] = useState<string>("");
  // Store clipboard event handler for cleanup
  const clipHandlerRef = useRef<any>(null);
  // Parse resolution from env (e.g., "1280x720") with sane defaults
  const parseResolution = (res?: string) => {
    try {
      if (res && res.includes("x")) {
        const [wStr, hStr] = res.toLowerCase().split("x", 2);
        const w = Math.max(320, parseInt(wStr.trim(), 10));
        const h = Math.max(240, parseInt(hStr.trim(), 10));
        if (Number.isFinite(w) && Number.isFinite(h)) return { w, h };
      }
    } catch {}
    return { w: 1280, h: 720 };
  };
  const { w, h } = parseResolution(process.env.NEXT_PUBLIC_VNC_RESOLUTION);
  // Debug the resolved dimensions and env at runtime
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log('[VncViewer] Using resolution', { w, h, env: process.env.NEXT_PUBLIC_VNC_RESOLUTION });
  }, [w, h]);
  // Parent-level interaction handler
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!onInteraction) return;
    if (vncContainerRef.current) {
      const rect = vncContainerRef.current.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      console.log(`[VncViewer] Click detected. Reporting interaction.`);
      onInteraction({ action: 'click', x: Math.round(x), y: Math.round(y) });
    }
  };
  // Paste from system clipboard into remote VNC session
  const handlePasteFromSystem = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) {
        console.log('[VncViewer] System clipboard empty; nothing to paste.');
        return;
      }
      const rfb: any = vncRef.current?.rfb as any;
      if (rfb && typeof rfb.clipboardPasteFrom === 'function') {
        rfb.clipboardPasteFrom(text);
        console.log('[VncViewer] Sent system clipboard text to remote.');
      } else {
        console.warn('[VncViewer] RFB.clipboardPasteFrom unavailable.');
      }
    } catch (err) {
      console.warn('[VncViewer] Failed to read system clipboard or send to remote:', err);
    }
  };
  // Copy latest remote clipboard text into system clipboard
  const handleCopyFromVnc = async () => {
    try {
      if (!remoteClip) {
        console.log('[VncViewer] No remote clipboard text available to copy.');
        return;
      }
      await navigator.clipboard.writeText(remoteClip);
      console.log('[VncViewer] Copied remote clipboard text to system clipboard.');
    } catch (err) {
      console.warn('[VncViewer] Failed to write to system clipboard:', err);
    }
  };
  return (
    // Wrap in a relative container so overlay can be absolutely positioned
    <div
      ref={vncContainerRef}
      onClick={handleClick}
      className="w-full h-full flex items-center justify-center bg-transparent relative overflow-hidden"
    >
      <div
        className="relative shadow-2xl rounded-lg overflow-hidden border border-gray-700 bg-gray-900"
        style={{ width: `${w}px`, height: `${h}px` }}
      >
        <VncScreen
          ref={vncRef}
          url={url}
          // Fit remote desktop into container and clip overflow to avoid extra black areas
          scaleViewport={true}
          clipViewport={true}
          // Do NOT request remote desktop to resize; keep server at fixed resolution
          resizeSession={false}
          // Enable library-level debug logs for verification
          debug={true}
          background="#333333"
          style={{
            // Constrain the canvas to the exact remote resolution by default
            width: `${w}px`,
            height: `${h}px`,
            display: 'block',
          }}
          onConnect={() => {
            // eslint-disable-next-line no-console
            console.log('react-vnc: Connected.');
            // Extra runtime guard: ensure resizeSession is disabled on the underlying RFB
            const rfb = vncRef.current?.rfb;
            if (rfb) {
              rfb.resizeSession = false;
              // eslint-disable-next-line no-console
              console.log('[VncViewer] rfb.resizeSession enforced as', rfb.resizeSession);
              // Attach clipboard listener to receive remote clipboard updates
              const onClip = (e: any) => {
                const txt = e?.detail?.text ?? '';
                setRemoteClip(txt || '');
                // eslint-disable-next-line no-console
                console.log('[VncViewer] Received remote clipboard text:', txt);
              };
              clipHandlerRef.current = onClip;
              try {
                (rfb as any).addEventListener('clipboard', onClip);
              } catch (err) {
                // eslint-disable-next-line no-console
                console.warn('[VncViewer] Unable to attach clipboard listener:', err);
              }
            }
          }}
          onDisconnect={() => {
            console.log('react-vnc: Disconnected.');
            const rfb: any = vncRef.current?.rfb as any;
            const handler = clipHandlerRef.current;
            if (rfb && handler) {
              try {
                rfb.removeEventListener('clipboard', handler);
              } catch {}
            }
            clipHandlerRef.current = null;
            setRemoteClip('');
          }}
          // Must be interactive so forwarded clicks reach the VNC
          viewOnly={false}
        />
        {/* Overlay can still exist for other purposes; it no longer handles clicks */}
        {overlay}
        {/* Clipboard controls */}
        <div className="absolute top-2 right-2 z-10 flex gap-2">
          <button
            onClick={handlePasteFromSystem}
            className="px-2 py-1 text-xs rounded bg-blue-600 hover:bg-blue-700 text-white shadow"
            title="Paste from your system clipboard into the remote session"
          >
            Paste
          </button>
          <button
            onClick={handleCopyFromVnc}
            disabled={!remoteClip}
            className={`px-2 py-1 text-xs rounded shadow ${remoteClip ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-gray-600 text-gray-300 cursor-not-allowed'}`}
            title={remoteClip ? 'Copy remote clipboard to your system clipboard' : 'No remote clipboard text available'}
          >
            Copy
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";
import { VncScreen } from 'react-vnc';
import React, { useRef } from 'react';

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

  return (
    // Wrap in a relative container so overlay can be absolutely positioned
    <div
      ref={vncContainerRef}
      onClick={handleClick}
      className="w-full h-full flex items-center justify-center bg-transparent relative overflow-hidden"
    >
      <div className="relative shadow-2xl rounded-lg overflow-hidden border border-gray-700 bg-gray-900">
        <VncScreen
          url={url}
          scaleViewport={false}
          background="#333333"
          style={{
            width: '1280px',
            height: '720px',
            display: 'block',
          }}
          onConnect={() => console.log('react-vnc: Connected.')}
          onDisconnect={() => console.log('react-vnc: Disconnected.')}
          // Must be interactive so forwarded clicks reach the VNC
          viewOnly={false}
        />
        {/* Overlay can still exist for other purposes; it no longer handles clicks */}
        {overlay}
      </div>
    </div>
  );
}

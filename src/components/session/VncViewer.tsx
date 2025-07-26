"use client";
import { VncScreen } from 'react-vnc';

// File: exsense/src/components/session/VncViewer.tsx


interface VncViewerProps {
  // e.g., "ws://your-server-ip:6901"
  url: string;
}
export default function VncViewer({ url }: VncViewerProps) {
  return (
    <div className="w-full h-full flex items-center justify-center bg-transparent relative z-50 overflow-hidden">
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
          // Make VNC read-only - disable user interactions
          viewOnly={true}
        />
      </div>
    </div>
  );
}

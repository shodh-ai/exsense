"use client";

import { VncScreen } from 'react-vnc';

interface VncViewerProps {
  // e.g., "ws://your-server-ip:6901"
  url: string;
}

export default function VncViewer({ url }: VncViewerProps) {
  return (
    <VncScreen
      url={url}
      scaleViewport
      background="#333333"
      style={{
        width: '100%',
        height: '100%',
      }}
      onConnect={() => console.log('react-vnc: Connected.')}
      onDisconnect={() => console.log('react-vnc: Disconnected.')}
    />
  );
}
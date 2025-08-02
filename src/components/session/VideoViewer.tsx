import React from 'react';

// File: exsense/src/components/session/VideoViewer.tsx


interface VideoViewerProps {
  videoSrc?: string;
  className?: string;
}
export default function VideoViewer({ videoSrc, className }: VideoViewerProps) {
  return (
    <div className={`video-viewer ${className || ''}`} style={{ 
      position: 'relative',
      width: '100%', 
      height: '100%',
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center' 
    }}>
      <div style={{
        position: 'absolute',
        top: '45%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '80%',
        borderRadius: '10px',
        overflow: 'hidden',
        zIndex: 1
      }}>
        <iframe 
          loading="lazy" 
          title="Gumlet video player"
          src="https://play.gumlet.io/embed/6881f10a1a1f941d68258a13?background=false&autoplay=false&loop=false&disableControls=false"
          style={{
            border: 'none', 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            height: '100%', 
            width: '100%',
            borderRadius: '10px'
          }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
        />
      </div>
    </div>
  );
}

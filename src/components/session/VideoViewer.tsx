import React from 'react';
interface VideoViewerProps {
  videoSrc?: string;
  className?: string;
}
export default function VideoViewer({ videoSrc, className }: VideoViewerProps) {
  return (
    <div className={`video-viewer w-full h-full ${className || ''}`}>
      <div style={{position: 'relative', aspectRatio: '16/9', width: '100%', height: '100%'}}>
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
            width: '100%'
          }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
        />
      </div>
    </div>
  );
}
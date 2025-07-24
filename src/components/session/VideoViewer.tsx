import React from 'react';

interface VideoViewerProps {
  videoSrc?: string;
  className?: string;
}

export default function VideoViewer({ videoSrc, className }: VideoViewerProps) {
  return (
    <div className={`video-viewer ${className || ''}`}>
      {videoSrc ? (
        <video
          src={videoSrc}
          controls
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="flex items-center justify-center h-full bg-gray-200">
          <p>No video source available</p>
        </div>
      )}
    </div>
  );
}

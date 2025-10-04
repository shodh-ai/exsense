'use client';

import React from 'react';

export interface VideoBlockViewProps {
  videoUrl: string;
}

const VideoBlockView: React.FC<VideoBlockViewProps> = ({ videoUrl }) => {
  if (!videoUrl) return null;

  return (
    <div
      style={{
        width: '100%',
        minHeight: 360,
        backgroundColor: '#000',
        position: 'relative',
        borderRadius: 8,
        overflow: 'hidden',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: '100%',
        height: '100%',
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <iframe 
          loading="lazy" 
          title="Video player"
          src={videoUrl}
          style={{
            border: 'none', 
            position: 'absolute', 
            top: 0, 
            left: 0, 
            height: '100%', 
            width: '100%',
            borderRadius: 8
          }}
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen;"
        />
      </div>
    </div>
  );
};

export default VideoBlockView;

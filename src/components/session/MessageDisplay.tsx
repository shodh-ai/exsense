"use client";

import React, { useEffect, useRef } from 'react';

interface MessageDisplayProps {
  transcriptionMessages: string[];
  statusMessages: string[];
}

export default function MessageDisplay({ transcriptionMessages, statusMessages }: MessageDisplayProps) {
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (transcriptionRef.current) {
      transcriptionRef.current.scrollTop = transcriptionRef.current.scrollHeight;
    }
  }, [transcriptionMessages]);

  useEffect(() => {
    if (statusRef.current) {
      statusRef.current.scrollTop = statusRef.current.scrollHeight;
    }
  }, [statusMessages]);

  return (
    <div className="fixed bottom-4 right-4 w-96 max-w-sm bg-black/80 backdrop-blur-sm rounded-lg shadow-lg border border-white/20 text-white">
      <div className="p-3">
        <h3 className="text-sm font-semibold mb-2 text-[#566FE9]">Live Session</h3>
        
        {/* Status Messages */}
        <div className="mb-3">
          <h4 className="text-xs font-medium mb-1 text-green-400">Status</h4>
          <div
            ref={statusRef}
            className="max-h-20 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            {statusMessages.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No status updates yet...</p>
            ) : (
              statusMessages.map((message, index) => (
                <div key={index} className="text-xs py-1 text-green-300">
                  • {message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Transcription Messages */}
        <div>
          <h4 className="text-xs font-medium mb-1 text-blue-400">Transcription</h4>
          <div
            ref={transcriptionRef}
            className="max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
          >
            {transcriptionMessages.length === 0 ? (
              <p className="text-xs text-gray-400 italic">No transcriptions yet...</p>
            ) : (
              transcriptionMessages.map((message, index) => (
                <div key={index} className="text-xs py-1 border-b border-white/10 last:border-b-0">
                  {message}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

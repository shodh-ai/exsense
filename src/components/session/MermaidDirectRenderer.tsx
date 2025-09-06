"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';

const VISUALIZER_URL = process.env.NEXT_PUBLIC_VISUALIZER_URL || 'http://localhost:8080';

// This component now takes two callbacks: one for the final code, one for the status.
export interface MermaidDirectRendererProps {
  onMermaidCodeUpdate: (code: string) => void;
  onGenerationStatusChange: (status: 'idle' | 'streaming' | 'finished' | 'error') => void;
}

const MermaidDirectRenderer: React.FC<MermaidDirectRendererProps> = ({ onMermaidCodeUpdate, onGenerationStatusChange }) => {
  const [prompt, setPrompt] = useState('A flowchart explaining photosynthesis');
  const [status, setStatus] = useState<'idle' | 'streaming' | 'finished' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  
  const abortControllerRef = useRef<AbortController | null>(null);

  // Inform the parent component of any status change.
  useEffect(() => {
    onGenerationStatusChange(status);
  }, [status, onGenerationStatusChange]);

  const startStreamingVisualization = useCallback(async () => {
    if (status === 'streaming') {
      abortControllerRef.current?.abort();
      setStatus('idle');
      return;
    }

    setError(null);
    onMermaidCodeUpdate(''); // Clear the previous diagram
    setStatus('streaming');
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${VISUALIZER_URL}/generate-diagram-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text_to_visualize: prompt,
          topic_context: "General knowledge test visualization",
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error(`Visualizer service returned an error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      // Accumulate the entire response from the stream first.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulatedText += decoder.decode(value, { stream: true });
        // --- MODIFICATION: We no longer call the update function here ---
      }
      console.log("--- AI Generated Mermaid Syntax ---\n", accumulatedText);
      console.log("---------------------------------");
      // --- THE CRITICAL FIX ---
      // Only call the update function ONCE with the complete, final block of code.
      onMermaidCodeUpdate(accumulatedText);
      setStatus('finished');

    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Streaming failed:', err);
        setError(err.message);
        setStatus('error');
      } else {
        // If the user aborted, reset the status
        setStatus('idle');
      }
    }
  }, [prompt, status, onMermaidCodeUpdate]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.2)',
      zIndex: 1001,
      width: '350px',
      color: '#333',
      border: '1px solid #ddd',
    }}>
      <h3 style={{ marginTop: 0, borderBottom: '1px solid #ccc', paddingBottom: '8px' }}>Visualizer Test</h3>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Enter a prompt to visualize..."
        rows={4}
        style={{ width: '100%', boxSizing: 'border-box', marginBottom: '10px', padding: '5px' }}
      />
      <button 
        onClick={startStreamingVisualization}
        style={{ 
          width: '100%', 
          padding: '10px', 
          cursor: 'pointer',
          backgroundColor: status === 'streaming' ? '#ffc107' : '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}
      >
        {status === 'streaming' ? 'Stop Generation' : 'Generate Diagram'}
      </button>
      {status !== 'idle' && <p style={{ fontSize: '12px', marginTop: '10px' }}>Status: {status}</p>}
      {error && <p style={{ color: '#dc3545', fontSize: '12px' }}>Error: {error}</p>}
    </div>
  );
};

export default MermaidDirectRenderer;
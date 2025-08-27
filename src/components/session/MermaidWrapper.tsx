'use client';

import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidWrapperProps {
  diagramDefinition: string;
  onDiagramUpdate?: (definition: string) => void;
  className?: string;
}

export const MermaidWrapper: React.FC<MermaidWrapperProps> = ({
  diagramDefinition,
  onDiagramUpdate,
  className = ""
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize Mermaid
  useEffect(() => {
    if (!isInitialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'var(--font-plus-jakarta-sans), Plus Jakarta Sans, system-ui, -apple-system, sans-serif',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'cardinal'
        },
        sequence: {
          useMaxWidth: true,
          wrap: true
        }
      });
      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Render diagram when definition changes
  useEffect(() => {
    if (!isInitialized || !containerRef.current || !diagramDefinition.trim()) {
      return;
    }

    const renderDiagram = async () => {
      try {
        setError(null);
        const container = containerRef.current;
        if (!container) return;

        // Clear previous content
        container.innerHTML = '';

        // Generate unique ID for this diagram
        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        // Validate and render the diagram
        const isValid = await mermaid.parse(diagramDefinition);
        if (isValid) {
          const { svg } = await mermaid.render(diagramId, diagramDefinition);
          container.innerHTML = svg;
        } else {
          throw new Error('Invalid Mermaid syntax');
        }
      } catch (err) {
        console.error('Mermaid render error:', err);
        setError(`Diagram Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
        
        // Show fallback content
        if (containerRef.current) {
          containerRef.current.innerHTML = `
            <div style="padding: 20px; text-align: center; color: #666; border: 1px dashed #ccc; border-radius: 8px;">
              <p>Failed to render diagram</p>
              <small>${err instanceof Error ? err.message : 'Unknown error'}</small>
            </div>
          `;
        }
      }
    };

    renderDiagram();
  }, [isInitialized, diagramDefinition]);

  // Expose debug functions
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__mermaidDebug = {
        setDiagram: (definition: string) => {
          onDiagramUpdate?.(definition);
        },
        getCurrentDiagram: () => diagramDefinition,
        clearDiagram: () => {
          onDiagramUpdate?.('');
        },
        testDiagram: (definition: string) => {
          return mermaid.parse(definition);
        }
      };
    }
  }, [diagramDefinition, onDiagramUpdate]);

  return (
    <div className={`mermaid-wrapper ${className}`}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          {error}
        </div>
      )}
      <div 
        ref={containerRef}
        className="mermaid-container"
        style={{
          width: '100%',
          height: '100%',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}
      />
      {!diagramDefinition.trim() && !error && (
        <div className="flex items-center justify-center h-64 text-gray-500">
          <p>No diagram to display</p>
        </div>
      )}
    </div>
  );
};

export default MermaidWrapper;

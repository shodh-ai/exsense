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
    if (!isInitialized || !containerRef.current) {
        // If there's no diagram, ensure the container is empty
        if (!diagramDefinition.trim() && containerRef.current) {
            containerRef.current.innerHTML = '';
        }
        return;
    }

    const renderDiagram = async () => {
      try {
        setError(null);
        const container = containerRef.current;
        if (!container) return;

        container.innerHTML = '';

        const diagramId = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
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
    <div className={`mermaid-wrapper ${className}`} style={{ 
      height: '100%', 
      width: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden',
      // Ensure we stay within the canvas bounds with some padding
      padding: '6rem',
      boxSizing: 'border-box'
    }}>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm flex-shrink-0">
          {error}
        </div>
      )}
      <div 
        ref={containerRef}
        className="mermaid-container"
        style={{
          width: '100%',
          flex: '1 1 0',
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
          // Remove internal padding since wrapper now handles it
          padding: '0',
          boxSizing: 'border-box',
          // Ensure we don't exceed the available height
          maxHeight: '100%'
        }}
      />
      {!diagramDefinition.trim() && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-500 pointer-events-none">
          <p>No diagram to display</p>
        </div>
      )}
    </div>
  );
};

export default MermaidWrapper;
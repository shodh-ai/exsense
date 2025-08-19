import { useCallback, useState, useRef } from 'react';

export interface MermaidVisualizationHook {
  diagramDefinition: string;
  isStreaming: boolean;
  error: string | null;
  startVisualization: (text: string, topic?: string) => Promise<void>;
  clearDiagram: () => void;
  updateDiagram: (definition: string) => void;
}

export const useMermaidVisualization = (): MermaidVisualizationHook => {
  const [diagramDefinition, setDiagramDefinition] = useState<string>('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const clearDiagram = useCallback(() => {
    setDiagramDefinition('');
    setError(null);
  }, []);

  const updateDiagram = useCallback((definition: string) => {
    setDiagramDefinition(definition);
  }, []);

  const startVisualization = useCallback(async (text: string, topic: string = '') => {
    // Cancel any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    setIsStreaming(true);
    setError(null);
    setDiagramDefinition(''); // Clear previous diagram

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch('http://localhost:8002/generate-diagram-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_to_visualize: text,
          topic_context: topic,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let accumulatedText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          accumulatedText += chunk;
          
          // Update the diagram with accumulated text
          // This allows for real-time streaming of the diagram
          setDiagramDefinition(accumulatedText.trim());
        }
      } finally {
        reader.releaseLock();
      }

      // Final update with complete diagram
      setDiagramDefinition(accumulatedText.trim());

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('Visualization stream was aborted');
      } else {
        console.error('Visualization error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
        
        // Provide fallback diagram on error
        setDiagramDefinition(`flowchart TD
    Error[\"Generation Failed\"]
    Error --> Retry[\"Try Again\"]`);
      }
    } finally {
      setIsStreaming(false);
      abortControllerRef.current = null;
    }
  }, []);

  return {
    diagramDefinition,
    isStreaming,
    error,
    startVisualization,
    clearDiagram,
    updateDiagram,
  };
};

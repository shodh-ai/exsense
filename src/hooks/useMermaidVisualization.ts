import { useCallback, useState } from 'react';

export interface MermaidVisualizationHook {
  diagramDefinition: string;
  isGenerating: boolean; // Renamed from isStreaming
  error: string | null;
  startVisualization: (text: string, topic?: string) => Promise<void>;
  clearDiagram: () => void;
}

export const useMermaidVisualization = (): MermaidVisualizationHook => {
  const [diagramDefinition, setDiagramDefinition] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearDiagram = useCallback(() => {
    setDiagramDefinition('');
    setError(null);
  }, []);

  const startVisualization = useCallback(async (text: string, topic: string = '') => {
    setIsGenerating(true);
    setError(null);
    setDiagramDefinition('');

    try {
      const response = await fetch('http://localhost:8002/generate-mermaid-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text_to_visualize: text,
          topic_context: topic,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const mermaidText = await response.text();
      setDiagramDefinition(mermaidText.trim());
    } catch (err) {
      console.error('Visualization error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setDiagramDefinition(`flowchart TD\n    Error[\"Generation Failed\"]`);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return {
    diagramDefinition,
    isGenerating,
    error,
    startVisualization,
    clearDiagram,
  };
};
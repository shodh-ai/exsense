// File: exsense/src/hooks/useVisualActionExecutor.ts
// /src/hooks/useVisualActionExecutor.ts
import { useState, useCallback } from 'react';
import { exportToCanvas } from '@excalidraw/excalidraw';
// Assuming ExcalidrawAPI is defined elsewhere or using 'any'
type ExcalidrawAPIRefValue = unknown;
export interface ToolCommand {
  tool_name: string;
  parameters: Record<string, unknown>;
}
interface SkeletonElement {
  type: 'rectangle' | 'ellipse' | 'diamond' | 'text' | 'arrow' | 'line';
  x: number;
  y: number;
  width: number;
  height: number;
  text?: string;
  strokeColor?: string;
  backgroundColor?: string;
  fontSize?: number;
  connections?: { from: string; to: string }[];
}
interface CanvasMode {
  mode: 'ai_controlled' | 'student_controlled' | 'collaborative';
  allowManualControl: boolean;
  message?: string;
}
interface UseVisualActionExecutorReturn {
  executeCommand: (command: ToolCommand) => Promise<unknown>;
  canvasMode: CanvasMode;
  isGenerating: boolean;
  highlightedElements: string[];
  captureCanvasScreenshot: () => Promise<string | null>;
  generateVisualization: (prompt: string) => Promise<void>;
  highlightElements: (elementIds: string[]) => void;
  removeHighlighting: () => void;
  giveStudentControl: (message?: string) => void;
  takeAIControl: (message?: string) => void;
  getCanvasElements: () => unknown[];
  updateElements: (elements: unknown[]) => void;
}
// Helper function to calculate text dimensions
const calculateTextDimensions = (text: string, fontSize = 16) => {
  if (!text) return { width: 0, height: 0 };
  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  return {
    width: Math.max(maxLineLength * fontSize * 0.6, 50),
    height: lines.length * fontSize * 1.2
  };
};
// Generate unique ID for elements
const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
const useVisualActionExecutor = (excalidrawAPI: ExcalidrawAPIRefValue | null): UseVisualActionExecutorReturn => {
  const [canvasMode, setCanvasMode] = useState<CanvasMode>({
    mode: 'ai_controlled',
    allowManualControl: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState<string[]>([]);
  // Capture canvas screenshot for AI analysis
  const captureCanvasScreenshot = useCallback(async (): Promise<string | null> => {
    if (!excalidrawAPI) {
      console.warn('Excalidraw API not available for screenshot');
      return null;
    }
    try {
      const elements = (excalidrawAPI as any).getSceneElements();
      const appState = (excalidrawAPI as any).getAppState();
      
      const canvas = await exportToCanvas({
        elements,
        appState: {
          ...appState,
          exportBackground: true,
          viewBackgroundColor: '#ffffff'
        },
        files: (excalidrawAPI as any).getFiles(),
        getDimensions: () => ({ width: 800, height: 600 })
      });
      
      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing canvas screenshot:', error);
      return null;
    }
  }, [excalidrawAPI]);
  // Convert skeleton elements to Excalidraw format
  const convertSkeletonToExcalidrawElements = useCallback((skeletonElements: SkeletonElement[]) => {
    const elements: unknown[] = [];
    const elementMap = new Map<string, unknown>();
    // Create elements
    skeletonElements.forEach((skeleton, index) => {
      const id = generateId();
      let element: Record<string, unknown>;
      const baseElement = {
        id,
        x: skeleton.x,
        y: skeleton.y,
        width: skeleton.width,
        height: skeleton.height,
        angle: 0,
        strokeColor: skeleton.strokeColor || '#1e1e1e',
        backgroundColor: skeleton.backgroundColor || 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        groupIds: [],
        frameId: null,
        roundness: null,
        seed: Math.floor(Math.random() * 2147483647),
        versionNonce: Math.floor(Math.random() * 2147483647),
        isDeleted: false,
        boundElements: null,
        updated: 1,
        link: null,
        locked: false
      };
      switch (skeleton.type) {
        case 'rectangle':
          element = {
            ...baseElement,
            type: 'rectangle'
          };
          break;
        case 'ellipse':
          element = {
            ...baseElement,
            type: 'ellipse'
          };
          break;
        case 'diamond':
          element = {
            ...baseElement,
            type: 'diamond'
          };
          break;
        case 'text':
          const textDimensions = calculateTextDimensions(skeleton.text || '', skeleton.fontSize || 16);
          element = {
            ...baseElement,
            type: 'text',
            width: textDimensions.width,
            height: textDimensions.height,
            text: skeleton.text || '',
            fontSize: skeleton.fontSize || 16,
            fontFamily: 1,
            textAlign: 'left',
            verticalAlign: 'top',
            containerId: null,
            originalText: skeleton.text || '',
            lineHeight: 1.25
          };
          break;
        case 'arrow':
        case 'line':
          element = {
            ...baseElement,
            type: skeleton.type,
            points: [[0, 0], [skeleton.width, skeleton.height]],
            lastCommittedPoint: null,
            startBinding: null,
            endBinding: null,
            startArrowhead: null,
            endArrowhead: skeleton.type === 'arrow' ? 'arrow' : null
          };
          break;
        default:
          element = {
            ...baseElement,
            type: 'rectangle'
          };
      }
      elements.push(element);
      elementMap.set(`skeleton_${index}`, element);
    });
    return elements;
  }, []);
  // Generate AI visualization based on prompt
  const generateVisualization = useCallback(async (prompt: string) => {
    if (!excalidrawAPI) {
      console.warn('Excalidraw API not available for visualization generation');
      return;
    }
    setIsGenerating(true);
    
    try {
      // This would typically call your AI backend to generate skeleton elements
      // For now, we'll create a simple example based on the prompt
      const mockSkeletonElements: SkeletonElement[] = [
        {
          type: 'text',
          x: 100,
          y: 50,
          width: 200,
          height: 30,
          text: `Visualization: ${prompt}`,
          fontSize: 18,
          strokeColor: '#1e1e1e'
        },
        {
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 150,
          height: 100,
          strokeColor: '#1971c2',
          backgroundColor: '#e3f2fd'
        },
        {
          type: 'ellipse',
          x: 300,
          y: 100,
          width: 150,
          height: 100,
          strokeColor: '#d32f2f',
          backgroundColor: '#ffebee'
        },
        {
          type: 'arrow',
          x: 250,
          y: 150,
          width: 50,
          height: 0,
          strokeColor: '#2e7d32'
        }
      ];
      const excalidrawElements = convertSkeletonToExcalidrawElements(mockSkeletonElements);
      (excalidrawAPI as any).updateScene({ elements: excalidrawElements });
      
    } catch (error) {
      console.error('Error generating visualization:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [excalidrawAPI, convertSkeletonToExcalidrawElements]);
  // Highlight specific elements
  const highlightElements = useCallback((elementIds: string[]) => {
    if (!excalidrawAPI) return;
    setHighlightedElements(elementIds);
    
    // Update element styles to show highlighting
    const elements = (excalidrawAPI as any).getSceneElements();
    const updatedElements = elements.map((element: any) => {
      if (elementIds.includes(element.id)) {
        return {
          ...element,
          strokeColor: '#ff6b6b',
          strokeWidth: 4,
          backgroundColor: element.backgroundColor === 'transparent' ? '#ffe0e0' : element.backgroundColor
        };
      }
      return element;
    });
    
    (excalidrawAPI as any).updateScene({ elements: updatedElements });
  }, [excalidrawAPI]);
  // Remove highlighting from all elements
  const removeHighlighting = useCallback(() => {
    if (!excalidrawAPI || highlightedElements.length === 0) return;
    const elements = (excalidrawAPI as any).getSceneElements();
    const updatedElements = elements.map((element: any) => {
      if (highlightedElements.includes(element.id)) {
        return {
          ...element,
          strokeColor: '#1e1e1e',
          strokeWidth: 2,
          backgroundColor: element.backgroundColor === '#ffe0e0' ? 'transparent' : element.backgroundColor
        };
      }
      return element;
    });
    
    (excalidrawAPI as any).updateScene({ elements: updatedElements });
    setHighlightedElements([]);
  }, [excalidrawAPI, highlightedElements]);
  // Give control to student
  const giveStudentControl = useCallback((message?: string) => {
    setCanvasMode({
      mode: 'student_controlled',
      allowManualControl: true,
      message: message || 'You now have control of the canvas. Feel free to draw and modify elements!'
    });
    
    if (excalidrawAPI) {
      (excalidrawAPI as any).setActiveTool({ type: 'selection' });
    }
  }, [excalidrawAPI]);
  // Take AI control
  const takeAIControl = useCallback((message?: string) => {
    setCanvasMode({
      mode: 'ai_controlled',
      allowManualControl: false,
      message: message || 'AI has taken control of the canvas for demonstration.'
    });
  }, []);
  // Get current canvas elements
  const getCanvasElements = useCallback(() => {
    if (!excalidrawAPI) return [];
    return (excalidrawAPI as any).getSceneElements();
  }, [excalidrawAPI]);
  // Update canvas elements
  const updateElements = useCallback((elements: unknown[]) => {
    if (!excalidrawAPI) return;
    (excalidrawAPI as any).updateScene({ elements });
  }, [excalidrawAPI]);
  // Execute various commands
  const executeCommand = useCallback(async (command: ToolCommand): Promise<unknown> => {
    if (!excalidrawAPI) {
      console.warn("Excalidraw API not available, skipping command:", command);
      return null;
    }
    
    console.log("Executing command:", command.tool_name, command.parameters);
    
    switch (command.tool_name) {
      case 'clear_canvas':
        (excalidrawAPI as any).resetScene();
        break;
        
      case 'generate_visualization':
        await generateVisualization((command.parameters.prompt as string) || '');
        break;
        
      case 'highlight_elements':
        highlightElements((command.parameters.elementIds as string[]) || []);
        break;
        
      case 'remove_highlighting':
        removeHighlighting();
        break;
        
      case 'give_student_control':
        giveStudentControl(command.parameters.message as string);
        break;
        
      case 'take_ai_control':
        takeAIControl(command.parameters.message as string);
        break;
        
      case 'capture_screenshot':
        return await captureCanvasScreenshot();
        
      case 'get_canvas_elements':
        return getCanvasElements();
        
      case 'update_elements':
        updateElements((command.parameters.elements as unknown[]) || []);
        break;
        
      default:
        console.warn('Unknown command:', command.tool_name);
    }
    
    return null;
  }, [excalidrawAPI, generateVisualization, highlightElements, removeHighlighting, 
      giveStudentControl, takeAIControl, captureCanvasScreenshot, getCanvasElements, updateElements]);
  return {
    executeCommand,
    canvasMode,
    isGenerating,
    highlightedElements,
    captureCanvasScreenshot,
    generateVisualization,
    highlightElements,
    removeHighlighting,
    giveStudentControl,
    takeAIControl,
    getCanvasElements,
    updateElements
  };
};
export { useVisualActionExecutor };
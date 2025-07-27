import { useState, useEffect, useCallback } from 'react';

// File: exsense/src/hooks/useStudentInteractionSensor.ts


interface InteractionEvent {
  id: string;
  type: 'mouse_move' | 'click' | 'key_press' | 'scroll' | 'focus' | 'blur' | 'laser_point' | 'element_select' | 'canvas_draw';
  timestamp: number;
  data?: unknown;
}
// Removed unused interfaces LaserPointerEvent and CanvasInteraction
interface UseStudentInteractionSensorReturn {
  isActive: boolean;
  interactions: InteractionEvent[];
  isLaserActive: boolean;
  lastPointerPosition: { x: number; y: number } | null;
  pointedElement: unknown | null;
  startSensing: () => void;
  stopSensing: () => void;
  clearInteractions: () => void;
  toggleLaserPointer: () => void;
  setExcalidrawAPI: (api: unknown) => void;
  onElementPointed: (element: unknown, position: { x: number; y: number }) => void;
}
export function useStudentInteractionSensor(): UseStudentInteractionSensorReturn {
  const [isActive, setIsActive] = useState(false);
  const [interactions, setInteractions] = useState<InteractionEvent[]>([]);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [pointedElement, setPointedElement] = useState<unknown | null>(null);
  const [excalidrawAPI, setExcalidrawAPIState] = useState<unknown | null>(null);
  const addInteraction = useCallback((type: InteractionEvent['type'], data?: unknown) => {
    const interaction: InteractionEvent = {
      id: `interaction_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      timestamp: Date.now(),
      data,
    };
    
    setInteractions(prev => [...prev.slice(-99), interaction]); // Keep last 100 interactions
  }, []);
  const startSensing = useCallback(() => {
    setIsActive(true);
  }, []);
  const stopSensing = useCallback(() => {
    setIsActive(false);
  }, []);
  const clearInteractions = useCallback(() => {
    setInteractions([]);
  }, []);
  const toggleLaserPointer = useCallback(() => {
    setIsLaserActive(prev => {
      const newState = !prev;
      if (newState && excalidrawAPI) {
        // Activate laser pointer tool in Excalidraw
        (excalidrawAPI as any).setActiveTool({ type: 'laser' });
      } else if (excalidrawAPI) {
        // Deactivate laser pointer, return to selection tool
        (excalidrawAPI as any).setActiveTool({ type: 'selection' });
      }
      return newState;
    });
  }, [excalidrawAPI]);
  const setExcalidrawAPI = useCallback((api: unknown) => {
    setExcalidrawAPIState(api);
  }, []);
  const onElementPointed = useCallback((element: unknown, position: { x: number; y: number }) => {
    setPointedElement(element);
    setLastPointerPosition(position);
    
    addInteraction('laser_point', {
      position,
      element: {
        id: (element as any)?.id,
        type: (element as any)?.type,
        text: (element as any)?.text || (element as any)?.rawText,
        x: (element as any)?.x,
        y: (element as any)?.y,
        width: (element as any)?.width,
        height: (element as any)?.height
      }
    });
  }, [addInteraction]);
  // Enhanced element detection for canvas interactions
  const detectElementAtPosition = useCallback((x: number, y: number) => {
    if (!excalidrawAPI) return null;
    
    try {
      const elements = (excalidrawAPI as any).getSceneElements();
      const sceneCoords = (excalidrawAPI as any).getSceneCoordinatesFromPointer({ clientX: x, clientY: y });
      
      // Find element at position using similar logic to Excalidraw's implementation
      const elementAtPosition = elements.find((element: any) => {
        if (!element || element.isDeleted) return false;
        
        const { x: elX, y: elY, width, height, type } = element;
        
        switch (type) {
          case 'ellipse': {
            const centerX = elX + width / 2;
            const centerY = elY + height / 2;
            const a = width / 2;
            const b = height / 2;
            const dx = (sceneCoords.x - centerX) / a;
            const dy = (sceneCoords.y - centerY) / b;
            return (dx * dx + dy * dy) <= 1;
          }
          case 'diamond': {
            const diamondCenterX = elX + width / 2;
            const diamondCenterY = elY + height / 2;
            const rotatedX = Math.abs(sceneCoords.x - diamondCenterX) / (width / 2);
            const rotatedY = Math.abs(sceneCoords.y - diamondCenterY) / (height / 2);
            return (rotatedX + rotatedY) <= 1;
          }
          case 'text': {
            const padding = 5;
            return sceneCoords.x >= elX - padding && 
                   sceneCoords.x <= elX + width + padding && 
                   sceneCoords.y >= elY - padding && 
                   sceneCoords.y <= elY + height + padding;
          }
          default: {
            // Rectangle, arrow, line, etc.
            return sceneCoords.x >= elX && 
                   sceneCoords.x <= elX + width && 
                   sceneCoords.y >= elY && 
                   sceneCoords.y <= elY + height;
          }
        }
      });
      
      return elementAtPosition || null;
    } catch (error) {
      console.warn('Error detecting element at position:', error);
      return null;
    }
  }, [excalidrawAPI]);
  useEffect(() => {
    if (!isActive) return;
    const handleMouseMove = (e: MouseEvent) => {
      addInteraction('mouse_move', { x: e.clientX, y: e.clientY });
    };
    const handleClick = (e: MouseEvent) => {
      const clickData = { x: e.clientX, y: e.clientY, button: e.button };
      
      // If laser pointer is active, detect pointed element
      if (isLaserActive) {
        const element = detectElementAtPosition(e.clientX, e.clientY);
        if (element) {
          onElementPointed(element, { x: e.clientX, y: e.clientY });
        }
      }
      
      addInteraction('click', clickData);
    };
    const handleKeyPress = (e: KeyboardEvent) => {
      addInteraction('key_press', { key: e.key, code: e.code });
    };
    const handleScroll = () => {
      addInteraction('scroll', { scrollY: window.scrollY, scrollX: window.scrollX });
    };
    const handleFocus = () => {
      addInteraction('focus');
    };
    const handleBlur = () => {
      addInteraction('blur');
    };
    // Add event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('click', handleClick);
    document.addEventListener('keydown', handleKeyPress);
    document.addEventListener('scroll', handleScroll);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    // Cleanup
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('click', handleClick);
      document.removeEventListener('keydown', handleKeyPress);
      document.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [isActive, isLaserActive, addInteraction, detectElementAtPosition, onElementPointed]);
  return {
    isActive,
    interactions,
    isLaserActive,
    lastPointerPosition,
    pointedElement,
    startSensing,
    stopSensing,
    clearInteractions,
    toggleLaserPointer,
    setExcalidrawAPI,
    onElementPointed,
  };
}

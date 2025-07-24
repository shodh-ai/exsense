import { useState, useEffect, useCallback } from 'react';
interface InteractionEvent {
  id: string;
  type: 'mouse_move' | 'click' | 'key_press' | 'scroll' | 'focus' | 'blur' | 'laser_point' | 'element_select' | 'canvas_draw';
  timestamp: number;
  data?: any;
}
interface LaserPointerEvent {
  x: number;
  y: number;
  elementId?: string;
  elementType?: string;
  elementData?: any;
}
interface CanvasInteraction {
  type: 'draw' | 'select' | 'move' | 'resize' | 'delete';
  elementIds: string[];
  beforeState?: any;
  afterState?: any;
}
interface UseStudentInteractionSensorReturn {
  isActive: boolean;
  interactions: InteractionEvent[];
  isLaserActive: boolean;
  lastPointerPosition: { x: number; y: number } | null;
  pointedElement: any | null;
  startSensing: () => void;
  stopSensing: () => void;
  clearInteractions: () => void;
  toggleLaserPointer: () => void;
  setExcalidrawAPI: (api: any) => void;
  onElementPointed: (element: any, position: { x: number; y: number }) => void;
}
export function useStudentInteractionSensor(): UseStudentInteractionSensorReturn {
  const [isActive, setIsActive] = useState(false);
  const [interactions, setInteractions] = useState<InteractionEvent[]>([]);
  const [isLaserActive, setIsLaserActive] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState<{ x: number; y: number } | null>(null);
  const [pointedElement, setPointedElement] = useState<any | null>(null);
  const [excalidrawAPI, setExcalidrawAPIState] = useState<any | null>(null);
  const addInteraction = useCallback((type: InteractionEvent['type'], data?: any) => {
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
        excalidrawAPI.setActiveTool({ type: 'laser' });
      } else if (excalidrawAPI) {
        // Deactivate laser pointer, return to selection tool
        excalidrawAPI.setActiveTool({ type: 'selection' });
      }
      return newState;
    });
  }, [excalidrawAPI]);
  const setExcalidrawAPI = useCallback((api: any) => {
    setExcalidrawAPIState(api);
  }, []);
  const onElementPointed = useCallback((element: any, position: { x: number; y: number }) => {
    setPointedElement(element);
    setLastPointerPosition(position);
    
    addInteraction('laser_point', {
      position,
      element: {
        id: element?.id,
        type: element?.type,
        text: element?.text || element?.rawText,
        x: element?.x,
        y: element?.y,
        width: element?.width,
        height: element?.height
      }
    });
  }, [addInteraction]);
  // Enhanced element detection for canvas interactions
  const detectElementAtPosition = useCallback((x: number, y: number) => {
    if (!excalidrawAPI) return null;
    
    try {
      const elements = excalidrawAPI.getSceneElements();
      const sceneCoords = excalidrawAPI.getSceneCoordinatesFromPointer({ clientX: x, clientY: y });
      
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

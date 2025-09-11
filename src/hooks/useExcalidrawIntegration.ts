import { useState, useCallback, useEffect, useRef } from 'react';
import { useStudentInteractionSensor } from './useStudentInteractionSensor';
import { useVisualActionExecutor, ToolCommand } from './useVisualActionExecutor';
import { useSessionStore } from '@/lib/store';

declare global {
  interface Window {
    __excalidrawActions?: {
      getSceneElements: () => any[];
      highlightElements: (elementIds: string[]) => void;
      removeHighlighting: () => void;
      focusOnElements: (elementIds: string[]) => void;
    };
  }
}

interface CanvasMode {
  mode: 'ai_controlled' | 'student_controlled' | 'collaborative';
  allowManualControl: boolean;
  message?: string;
}

interface ChatMessage {
  type: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

interface UseExcalidrawIntegrationReturn {
  excalidrawAPI: any | null;
  canvasMode: CanvasMode;
  isGenerating: boolean;
  error: string | null;
  
  conversationHistory: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  
  isLaserActive: boolean;
  lastPointerPosition: { x: number; y: number } | null;
  pointedElement: any | null;
  
  highlightedElements: string[];
  
  setExcalidrawAPI: (api: any) => void;
  handlePointerUpdate: (payload: any) => void;
  handleChangeWithControl: (elements: any[], appState: any) => void;
  
  sendChatMessage: (message: string, image?: string | null) => Promise<void>;
  addMessageToHistory: (type: ChatMessage['type'], content: string) => void;
  
  toggleLaserPointer: () => void;
  giveStudentControl: (message?: string) => void;
  takeAIControl: (message?: string) => void;
  handleCanvasModeChange: (newMode: string, message?: string | null, allowManualAfter?: boolean) => void;
  
  generateVisualization: (prompt: string) => Promise<void>;
  captureCanvasScreenshot: () => Promise<string | null>;
  
  highlightElements: (elementIds: string[]) => void;
  removeHighlighting: () => void;
  getCanvasElements: () => any[];
  updateElements: (elements: any[]) => void;
  
  executeCommand: (command: ToolCommand) => Promise<any>;
  
  clearCanvas: () => void;
  dismissError: () => void;
  exportAsImage: () => Promise<void>;
}

export function useExcalidrawIntegration(): UseExcalidrawIntegrationReturn {
  const [excalidrawAPI, setExcalidrawAPIState] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([{
    type: 'system',
    content: "Hello! I'm your AI tutor. I have control of the canvas and will create visualizations for you. Click the 🔍 Laser Pointer button to activate it, then click on any element to ask questions about it! I'll give you drawing control when it's time for you to practice.",
    timestamp: Date.now()
  }]);

  const visualizationData = useSessionStore(state => state.visualizationData);
  const setVisualizationData = useSessionStore(state => state.setVisualizationData);
  
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isUpdatingRef = useRef(false);
  const preventLoopRef = useRef(false);
  // NEW: Add a flag to prevent clearing highlights during updates
  const preserveHighlightsRef = useRef(false);
  
  const lastAppStateRef = useRef<any>({});
  
  const interactionSensor = useStudentInteractionSensor();
  const visualActionExecutor = useVisualActionExecutor(excalidrawAPI);

  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

  const EXCAL_DEBUG = (() => {
    try {
      const envFlag = (process.env.REACT_APP_EXCAL_DEBUG === '1');
      const lsFlag = typeof window !== 'undefined' && window.localStorage && window.localStorage.getItem('EXCAL_DEBUG') === '1';
      return envFlag || lsFlag;
    } catch {
      return false;
    }
  })();

  const addMessageToHistory = useCallback((type: ChatMessage['type'], content: string) => {
    const message: ChatMessage = { type, content, timestamp: Date.now() };
    setConversationHistory(prev => [...prev, message]);
  }, []);

  const summarize = (e: any) => {
    if (!e) return { id: null, type: 'null' };
    const txt = typeof e.text === 'string' ? e.text : '';
    return {
      id: e.id,
      type: e.type,
      x: e.x, y: e.y, w: e.width, h: e.height,
      text: txt ? (txt.length > 40 ? txt.slice(0, 40) + '…' : txt) : undefined,
      points_len: Array.isArray(e.points) ? e.points.length : undefined,
      startBindingId: e.startBinding?.elementId,
      endBindingId: e.endBinding?.elementId,
      isDeleted: !!e.isDeleted,
    };
  };

// Fix for useExcalidrawIntegration.ts - highlightElements function

  const highlightElements = useCallback((elementIds: string[]) => {
    if (!elementIds || elementIds.length === 0) return;

    console.log("[HIGHLIGHT] Starting highlight process for elements:", elementIds);
    
    // Get current elements from store
    const currentElements = useSessionStore.getState().visualizationData;
    if (!currentElements || !Array.isArray(currentElements)) {
      console.warn("[HIGHLIGHT] No elements in store to highlight");
      return;
    }

    // Validate that the requested element IDs actually exist
    const validElementIds = elementIds.filter(id => 
      currentElements.some(el => el && el.id === id && !el.isDeleted)
    );
    
    if (validElementIds.length === 0) {
      console.warn("[HIGHLIGHT] None of the requested element IDs exist in current elements");
      console.warn("[HIGHLIGHT] Requested:", elementIds);
      console.warn("[HIGHLIGHT] Available IDs:", currentElements.map(el => el.id).slice(0, 10));
      return;
    }

    console.log("[HIGHLIGHT] Valid element IDs found:", validElementIds);

    // Update elements with highlight styles
    const updatedElements = currentElements.map(element => {
      if (validElementIds.includes(element.id)) {
        const customData = element.customData || {};
        
        // Store original style if not already stored
        if (!customData.originalStyle) {
          customData.originalStyle = {
            strokeColor: element.strokeColor,
            strokeWidth: element.strokeWidth,
            backgroundColor: element.backgroundColor,
            opacity: element.opacity,
          };
        }
        
        // Apply highlight styles
        return {
          ...element,
          strokeColor: "#FFD700", // Gold color
          strokeWidth: Math.max(element.strokeWidth ?? 2, 4),
          backgroundColor: "rgba(255, 215, 0, 0.25)", // Semi-transparent gold
          opacity: 100,
          customData: customData,
        };
      }
      return element;
    });

    // Update the store
    setVisualizationData(updatedElements);
    
    // CRITICAL FIX: Force immediate canvas update
    if (excalidrawAPI && excalidrawAPI.updateScene) {
      // Use a small delay to ensure store update has propagated
      setTimeout(() => {
        console.log("[HIGHLIGHT] Forcing canvas update with highlighted elements");
        
        try {
          // Get current app state to preserve view settings
          const currentAppState = excalidrawAPI.getAppState?.() || lastAppStateRef.current || {};
          
          // Update the scene with highlighted elements
          excalidrawAPI.updateScene({
            elements: updatedElements,
            appState: {
              ...currentAppState,
              // Ensure we don't accidentally reset the view
              selectedElementIds: {},
              editingElement: null,
            }
          });
          
          console.log("[HIGHLIGHT] Canvas updated successfully with", validElementIds.length, "highlighted elements");
          
          // Optional: Focus on highlighted elements
          if (excalidrawAPI.scrollToContent && updatedElements.length > 0) {
            const highlightedElements = updatedElements.filter(el => validElementIds.includes(el.id));
            if (highlightedElements.length > 0) {
              setTimeout(() => {
                excalidrawAPI.scrollToContent(highlightedElements, {
                  fitToContent: false,
                  animate: true,
                  duration: 300
                });
              }, 100);
            }
          }
          
        } catch (error) {
          console.error("[HIGHLIGHT] Error updating canvas:", error);
        }
      }, 50);
    } else {
      console.warn("[HIGHLIGHT] excalidrawAPI not available for canvas update");
    }

    console.log("[HIGHLIGHT] Highlights applied to", validElementIds.length, "elements:", validElementIds);

  }, [setVisualizationData, excalidrawAPI]);


// Also fix the removeHighlighting function:

const removeHighlighting = useCallback(() => {
  // Don't remove highlights if we're preserving them
  if (preserveHighlightsRef.current) {
    console.log("[HIGHLIGHT] Skipping highlight removal due to preserve flag");
    return;
  }

  const currentElements = useSessionStore.getState().visualizationData;
  if (!currentElements || !Array.isArray(currentElements)) return;

  const elementsToRestore = currentElements.filter(el => el.customData?.originalStyle);
  if (elementsToRestore.length === 0) {
    console.log("[HIGHLIGHT] No highlighted elements to restore");
    return;
  }

  console.log("[HIGHLIGHT] Removing highlights from", elementsToRestore.length, "elements");

  const updatedElements = currentElements.map(element => {
    if (element.customData?.originalStyle) {
      const { originalStyle, ...restCustomData } = element.customData;
      
      return {
        ...element,
        ...originalStyle, // Restore original colors/styles
        customData: Object.keys(restCustomData).length > 0 ? restCustomData : null,
      };
    }
    return element;
  });
  
  setVisualizationData(updatedElements);
  
  // CRITICAL FIX: Force canvas update for highlight removal too
  if (excalidrawAPI && excalidrawAPI.updateScene) {
    setTimeout(() => {
      console.log("[HIGHLIGHT] Forcing canvas update to remove highlights");
      
      try {
        const currentAppState = excalidrawAPI.getAppState?.() || lastAppStateRef.current || {};
        
        excalidrawAPI.updateScene({
          elements: updatedElements,
          appState: {
            ...currentAppState,
            selectedElementIds: {},
            editingElement: null,
          }
        });
        
        console.log("[HIGHLIGHT] Highlights successfully removed from canvas");
      } catch (error) {
        console.error("[HIGHLIGHT] Error removing highlights from canvas:", error);
      }
    }, 50);
  }

}, [setVisualizationData, excalidrawAPI]);

  const focusOnElements = useCallback((elementIds: string[]) => {
    if (!excalidrawAPI || !elementIds || elementIds.length === 0) return;
    try {
      const allElements = excalidrawAPI.getSceneElements() || [];
      const elementsToFocusOn = allElements.filter((el: any) => el && !el.isDeleted && elementIds.includes(el.id));
      
      if (elementsToFocusOn.length > 0 && excalidrawAPI.scrollToContent) {
        console.log(`Focusing on ${elementsToFocusOn.length} elements:`, elementIds);
        excalidrawAPI.scrollToContent(elementsToFocusOn, {
          fitToContent: true,
          animate: true,
          duration: 500,
        });
      }
    } catch (error) {
      console.error("Failed to focus on elements:", error);
    }
  }, [excalidrawAPI]);

  useEffect(() => {
    if (excalidrawAPI) {
      window.__excalidrawActions = {
        getSceneElements: () => useSessionStore.getState().visualizationData || [],
        highlightElements: highlightElements,
        removeHighlighting: removeHighlighting,
        focusOnElements: focusOnElements,
      };
    }
    return () => {
      delete window.__excalidrawActions;
    };
  }, [excalidrawAPI, highlightElements, removeHighlighting, focusOnElements]);

  const setExcalidrawAPI = useCallback((api: any) => {
    if (api && api !== excalidrawAPI) {
      console.log('Setting new Excalidraw API');
      setExcalidrawAPIState(api);
    }
  }, [excalidrawAPI]);

  useEffect(() => {
    if (excalidrawAPI && interactionSensor.setExcalidrawAPI) {
      console.log('Updating interaction sensor with API');
      interactionSensor.setExcalidrawAPI(excalidrawAPI);
    }
  }, [excalidrawAPI]);

  const handleChangeWithControl = useCallback((newElements: readonly any[], appState: any) => {
    const currentStoreData = useSessionStore.getState().visualizationData;
    if (JSON.stringify(newElements) !== JSON.stringify(currentStoreData)) {
      setVisualizationData(newElements as any[]);
    }
    
    lastAppStateRef.current = appState;

  }, [setVisualizationData]);

  const handlePointerUpdate = useCallback((payload: any) => {
    if (!excalidrawAPI || isUpdatingRef.current) return;
    
    const { pointer, button } = payload;
    const { x, y } = pointer;
    
    const elements = visualizationData || [];
    
    if (interactionSensor.isLaserActive && button === 'down') {
      const sceneCoords = { x, y };
      
      const elementAtPosition = elements.find(element => {
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
          
          case 'text': {
            const padding = 5;
            return sceneCoords.x >= elX - padding && 
                   sceneCoords.x <= elX + width + padding && 
                   sceneCoords.y >= elY - padding && 
                   sceneCoords.y <= elY + height + padding;
          }
          
          default:
            return sceneCoords.x >= elX && 
                   sceneCoords.x <= elX + width && 
                   sceneCoords.y >= elY && 
                   sceneCoords.y <= elY + height;
        }
      });
      
      if (elementAtPosition) {
        highlightElements([elementAtPosition.id]);
        
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        
        highlightTimeoutRef.current = setTimeout(() => {
          removeHighlighting();
        }, 3000);
        
        interactionSensor.onElementPointed(elementAtPosition, sceneCoords);
        
        const elementInfo = `Element pointed: ${elementAtPosition.type}${elementAtPosition.text ? ` ("${elementAtPosition.text}")` : ''}`;
        addMessageToHistory('system', `🎯 ${elementInfo}`);
      }
    }
  }, [excalidrawAPI, visualizationData, interactionSensor, highlightElements, removeHighlighting, addMessageToHistory]);

  const handleCanvasModeChange = useCallback((newMode: string, message: string | null = null, allowManualAfter: boolean = false) => {
    if (isUpdatingRef.current) return;
    
    visualActionExecutor.executeCommand({
      tool_name: newMode === 'student_controlled' ? 'give_student_control' : 'take_ai_control',
      parameters: { message }
    });
    
    if (message) {
      addMessageToHistory('system', message);
    }
  }, [visualActionExecutor, addMessageToHistory]);

  const sendChatMessage = useCallback(async (message: string, image: string | null = null) => {
    if (!message.trim() || isUpdatingRef.current) return;

    const userMessage = message.trim();
    if (!image) {
      addMessageToHistory('user', userMessage);
      setChatInput("");
    }
    
    visualActionExecutor.setIsGenerating(true);
    setError(null);

    const elements = visualizationData || [];

    const context = {
      conversationHistory: conversationHistory.slice(-10),
      currentCanvas: { elements: elements, elementCount: elements.length },
      pointerData: interactionSensor.lastPointerPosition && interactionSensor.pointedElement ? {
        position: interactionSensor.lastPointerPosition,
        element: {
          id: interactionSensor.pointedElement.id,
          type: interactionSensor.pointedElement.type,
          x: interactionSensor.pointedElement.x,
          y: interactionSensor.pointedElement.y,
          width: interactionSensor.pointedElement.width,
          height: interactionSensor.pointedElement.height,
          text: interactionSensor.pointedElement.text || null
        },
        isPointing: true
      } : null,
      userMessage,
      canvasImage: image,
      canvasMode: visualActionExecutor.canvasMode.mode
    };

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(context)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Response received:', data);

      if (data.action === 'request_screenshot') {
        addMessageToHistory('assistant', data.message || "I'm taking a screenshot now.");
        const screenshot = await visualActionExecutor.captureCanvasScreenshot();
        if (screenshot) {
          return sendChatMessage(userMessage, screenshot);
        } else {
          addMessageToHistory('system', 'Sorry, I could not capture the canvas image.');
          visualActionExecutor.setIsGenerating(false);
          return;
        }
      }
      
      addMessageToHistory('assistant', data.message);
      
      if (data.action === 'change_canvas_mode') {
        const { mode, reason } = data;
        if (mode === 'student_controlled') {
          handleCanvasModeChange('student_controlled', reason || '🎨 You now have control of the canvas!');
        } else if (mode === 'ai_controlled') {
          handleCanvasModeChange('ai_controlled', reason || '🤖 AI has taken control of the canvas.');
        }
      } else if (data.action === 'modify_elements' && data.modifications && excalidrawAPI) {
        await visualActionExecutor.handleElementModifications(data.modifications);
      } else if (data.action === 'highlight_elements' && data.highlightedElements && excalidrawAPI) {
        await visualActionExecutor.handleElementHighlighting(data.highlightedElements);
      } else if ((data.action === 'update_canvas' || data.updateCanvas) && data.elements && Array.isArray(data.elements)) {
        console.log('Processing canvas update');
        
        try {
          const excalidrawElements = await visualActionExecutor.prepareElementsWithFiles(data.elements);
          
          if (excalidrawAPI && excalidrawElements.length > 0) {
            isUpdatingRef.current = true;
            
            setTimeout(() => {
              if (!isUpdatingRef.current) return;
              
              const currentAppState = excalidrawAPI.getAppState?.() || lastAppStateRef.current;
              excalidrawAPI.updateScene({
                elements: excalidrawElements,
                appState: { 
                  ...currentAppState,
                  selectedElementIds: {},
                  editingElement: null,
                  editingGroupId: null,
                  viewModeEnabled: visualActionExecutor.canvasMode.mode === 'ai_controlled' && !interactionSensor.isLaserActive
                }
              });
              
              setTimeout(() => {
                if (excalidrawElements.length > 0 && excalidrawAPI.scrollToContent) {
                  excalidrawAPI.scrollToContent(excalidrawElements, { 
                    fitToContent: true, 
                    animate: true 
                  });
                }
                
                setTimeout(() => {
                  isUpdatingRef.current = false;
                }, 100);
              }, 500);
            }, 100);
          }
        } catch (conversionError) {
          console.error('Error converting elements:', conversionError);
          setError('Failed to convert AI response to diagram elements');
        }
      }

    } catch (error) {
      console.error('Error sending chat message:', error);
      setError((error as Error).message || 'Failed to send message');
      addMessageToHistory('system', `Error: ${(error as Error).message || 'Failed to send message'}`);
    }

    visualActionExecutor.setIsGenerating(false);
  }, [conversationHistory, visualizationData, lastAppStateRef, visualActionExecutor, interactionSensor, addMessageToHistory, API_BASE_URL, excalidrawAPI, handleCanvasModeChange]);

  const toggleLaserPointer = useCallback(() => {
    if (!excalidrawAPI || isUpdatingRef.current) return;
    
    const wasActive = interactionSensor.isLaserActive;
    interactionSensor.toggleLaserPointer();
    
    setTimeout(() => {
      if (excalidrawAPI && !isUpdatingRef.current) {
        const toolType = wasActive ? 'selection' : 'laser';
        excalidrawAPI.setActiveTool({ type: toolType });
        
        const message = wasActive 
          ? '🔍 Laser pointer deactivated.' 
          : '🔍 Laser pointer activated! Click on elements to ask questions.';
        addMessageToHistory('system', message);
      }
    }, 100);
  }, [excalidrawAPI, interactionSensor, addMessageToHistory]);

  const giveStudentControl = useCallback((message?: string) => {
    handleCanvasModeChange('student_controlled', message);
  }, [handleCanvasModeChange]);

  const takeAIControl = useCallback((message?: string) => {
    handleCanvasModeChange('ai_controlled', message);
  }, [handleCanvasModeChange]);

  const generateVisualization = useCallback(async (prompt: string) => {
    try {
      await visualActionExecutor.generateVisualization(prompt);
      addMessageToHistory('system', `🎨 Generated visualization: "${prompt}"`);
    } catch (error) {
      console.error('Error generating visualization:', error);
      setError('Failed to generate visualization.');
      addMessageToHistory('system', 'Error: Failed to generate visualization.');
    }
  }, [visualActionExecutor, addMessageToHistory]);

  const exportAsImage = useCallback(async () => {
    if (!excalidrawAPI) return;
    
    try {
      const canvas = await visualActionExecutor.captureCanvasScreenshot();
      if (canvas) {
        const link = document.createElement('a');
        link.download = `excalidraw-diagram-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = canvas;
        link.click();
      }
    } catch (error) {
      console.error('Error exporting image:', error);
      setError('Failed to export image.');
    }
  }, [excalidrawAPI, visualActionExecutor]);

  const clearCanvas = useCallback(() => {
    setVisualizationData([]);
    setError(null);
    addMessageToHistory('system', '🗑️ Canvas cleared.');
  }, [setVisualizationData, addMessageToHistory]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  const updateElements = useCallback((elements: any[]) => { 
    setVisualizationData(elements);
  }, [setVisualizationData]);

  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (excalidrawAPI && visualizationData && !isUpdatingRef.current) {
      const currentCanvasElements = excalidrawAPI.getSceneElements?.() || [];
      
      // Compare elements more carefully
      const canvasElementIds = new Set(currentCanvasElements.map((el: { id: string }) => el.id));
      const storeElementIds = new Set(visualizationData.map((el: { id: string }) => el.id));
      
      const needsUpdate = 
        canvasElementIds.size !== storeElementIds.size ||
        !Array.from(storeElementIds).every(id => canvasElementIds.has(id)) ||
        visualizationData.some((storeEl: { id: string; strokeColor: any; strokeWidth: any; backgroundColor: any; }) => {
          const canvasEl = currentCanvasElements.find((el: { id: string; strokeColor: any; strokeWidth: any; backgroundColor: any; }) => el.id === storeEl.id);
          return canvasEl && (
            canvasEl.strokeColor !== storeEl.strokeColor ||
            canvasEl.strokeWidth !== storeEl.strokeWidth ||
            canvasEl.backgroundColor !== storeEl.backgroundColor
          );
        });
      
      if (needsUpdate) {
        console.log("[CANVAS-SYNC] Updating canvas with store data");
        isUpdatingRef.current = true;
        
        excalidrawAPI.updateScene({
          elements: visualizationData,
          appState: excalidrawAPI.getAppState?.() || {}
        });
        
        setTimeout(() => {
          isUpdatingRef.current = false;
        }, 200);
      }
    }
  }, [visualizationData, excalidrawAPI]);

  useEffect(() => {
    if (visualizationData && excalidrawAPI && !isUpdatingRef.current) {
      if (EXCAL_DEBUG) {
        const sampleIn = visualizationData.slice(0, 5).map(summarize);
        console.log(`[EXCALIDRAW-INTEGRATION] Processing ${visualizationData.length} elements from store`, sampleIn);
      }

      try {
        isUpdatingRef.current = true;
        setTimeout(() => {
          (async () => {
            try {
              const dataToProcess = visualizationData || [];
              const prepared = await visualActionExecutor.prepareElementsWithFiles(dataToProcess);
              
              if (EXCAL_DEBUG) {
                const samplePrepared = prepared.slice(0, 5).map(summarize);
                console.log('[EXCALIDRAW-INTEGRATION] Prepared elements sample:', samplePrepared);
              }

              const normalizeStreamArrows = (els: any[]) => {
                const rectDist2 = (px: number, py: number, rx: number, ry: number, rw: number, rh: number) => {
                  let dx = 0; if (px < rx) dx = rx - px; else if (px > rx + rw) dx = px - (rx + rw);
                  let dy = 0; if (py < ry) dy = ry - py; else if (py > ry + rh) dy = py - (ry + rh);
                  return dx * dx + dy * dy;
                };
                const shapes = els.filter((e) => e && !e.isDeleted && ["rectangle","ellipse","diamond","image"].includes(e.type));
                const THRESH2 = 64 * 64;
                const nearestShape = (px: number, py: number) => {
                  let best: any = null; let bestD2 = Infinity;
                  for (const s of shapes) {
                    const d2 = rectDist2(px, py, Number(s.x||0), Number(s.y||0), Number(s.width||0), Number(s.height||0));
                    if (d2 < bestD2) { bestD2 = d2; best = s; }
                  }
                  return (best && bestD2 <= THRESH2) ? best : null;
                };
                return els.map((e) => {
                  if (!e || e.isDeleted) return e;
                  if (e.type !== 'arrow' && e.type !== 'line') return e;
                  let points: any[] | null = null;
                  if (Array.isArray(e.points)) {
                    const filtered = e.points.filter(
                      (p: any) => Array.isArray(p) && p.length === 2 && p.every((n: any) => typeof n === 'number' && !Number.isNaN(n))
                    );
                    if (filtered.length >= 2) {
                      points = filtered.map((p: any) => [Number(p[0]) || 0, Number(p[1]) || 0]);
                    }
                  }
                  if (!points) {
                    const dx = Math.round(Number(e.width ?? 100));
                    const dy = Math.round(Number(e.height ?? 0));
                    points = [[0, 0], [dx, dy]];
                  }
                  let startBinding = e.startBinding || null;
                  let endBinding = e.endBinding || null;
                  if (e.type === 'arrow') {
                    const p0 = points[0];
                    const p1 = points[points.length - 1];
                    const baseX = Math.round(Number(e.x||0));
                    const baseY = Math.round(Number(e.y||0));
                    const sx = baseX + Number(p0?.[0]||0);
                    const sy = baseY + Number(p0?.[1]||0);
                    const ex = baseX + Number(p1?.[0]||0);
                    const ey = baseY + Number(p1?.[1]||0);
                    if (!startBinding) {
                      const s = nearestShape(sx, sy);
                      if (s?.id) startBinding = { elementId: s.id, focus: 0.5, gap: 1 };
                    }
                    if (!endBinding) {
                      const s = nearestShape(ex, ey);
                      if (s?.id) endBinding = { elementId: s.id, focus: 0.5, gap: 1 };
                    }
                  }
                  return { ...e, points, startBinding, endBinding };
                });
              };

              const safeElements = normalizeStreamArrows(prepared);
              if (EXCAL_DEBUG) {
                const sampleSafe = safeElements.slice(0, 5).map(summarize);
                const counts: Record<string, number> = {};
                for (const el of safeElements) counts[el.type] = (counts[el.type] || 0) + 1;
                console.log('[EXCALIDRAW-INTEGRATION] Normalized elements:', { counts, sample: sampleSafe });
              }

              if (safeElements.length > 0) {
                const currentAppState = excalidrawAPI.getAppState?.() || lastAppStateRef.current;
                if (EXCAL_DEBUG) {
                  console.log('[EXCALIDRAW-INTEGRATION] Calling updateScene with elements=', safeElements.length);
                }
                excalidrawAPI.updateScene({ 
                  elements: safeElements,
                  appState: { ...currentAppState }
                });
                if (EXCAL_DEBUG) {
                  try {
                    const sceneEls = excalidrawAPI.getSceneElements?.() || [];
                    console.log('[EXCALIDRAW-INTEGRATION] Scene updated. Scene element count=', sceneEls.length);
                  } catch {}
                }
              } else if (EXCAL_DEBUG) {
                console.log('[EXCALIDRAW-INTEGRATION] Skipping update: empty batch received, keeping previous scene');
              }

              setTimeout(() => {
                try {
                  const els = excalidrawAPI.getSceneElements?.() || safeElements;
                  if (els.length > 0 && excalidrawAPI.scrollToContent) {
                    excalidrawAPI.scrollToContent(els, { fitToContent: true, animate: true });
                  }
                } catch {}
              }, 100);

              if (EXCAL_DEBUG) {
                console.log('[EXCALIDRAW-INTEGRATION] ✅ Visualization rendered successfully');
              }

            } catch (error) {
              console.error('[EXCALIDRAW-INTEGRATION] ❌ Error rendering visualization:', error);
            } finally {
              isUpdatingRef.current = false;
            }
          })();
        }, 50);

      } catch (error) {
        console.error('[EXCALIDRAW-INTEGRATION] ❌ Error processing visualization data:', error);
        isUpdatingRef.current = false;
      }
    }
  }, [visualizationData, excalidrawAPI, lastAppStateRef, visualActionExecutor]);

  return {
    excalidrawAPI,
    canvasMode: visualActionExecutor.canvasMode,
    isGenerating: visualActionExecutor.isGenerating,
    error,
    
    conversationHistory,
    chatInput,
    setChatInput,
    
    isLaserActive: interactionSensor.isLaserActive,
    lastPointerPosition: interactionSensor.lastPointerPosition,
    pointedElement: interactionSensor.pointedElement,
    
    highlightedElements: visualActionExecutor.highlightedElements,
    
    setExcalidrawAPI,
    handlePointerUpdate,
    handleChangeWithControl,
    
    sendChatMessage,
    addMessageToHistory,
    
    toggleLaserPointer,
    giveStudentControl,
    takeAIControl,
    handleCanvasModeChange,
    
    generateVisualization,
    captureCanvasScreenshot: visualActionExecutor.captureCanvasScreenshot,
    
    highlightElements,
    removeHighlighting,
    getCanvasElements: () => useSessionStore.getState().visualizationData || [],
    updateElements,
    
    executeCommand: visualActionExecutor.executeCommand,
    
    clearCanvas,
    dismissError,
    exportAsImage
  };
}
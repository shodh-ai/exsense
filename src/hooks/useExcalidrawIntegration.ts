import { useState, useCallback, useEffect, useRef } from 'react';
import { useStudentInteractionSensor } from './useStudentInteractionSensor';
import { useVisualActionExecutor, ToolCommand } from './useVisualActionExecutor';
import { useSessionStore } from '@/lib/store';

// Enhanced interfaces for the unified integration
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
  // Core state
  excalidrawAPI: any | null;
  canvasMode: CanvasMode;
  isGenerating: boolean;
  error: string | null;
  elements: any[];
  appState: any;
  
  // Chat functionality
  conversationHistory: ChatMessage[];
  chatInput: string;
  setChatInput: (input: string) => void;
  
  // Laser pointer functionality
  isLaserActive: boolean;
  lastPointerPosition: { x: number; y: number } | null;
  pointedElement: any | null;
  
  // Element highlighting
  highlightedElements: string[];
  
  // Core functions
  setExcalidrawAPI: (api: any) => void;
  handlePointerUpdate: (payload: any) => void;
  handleChangeWithControl: (elements: any[], appState: any) => void;
  
  // Chat functions
  sendChatMessage: (message: string, image?: string | null) => Promise<void>;
  addMessageToHistory: (type: ChatMessage['type'], content: string) => void;
  
  // Canvas control functions
  toggleLaserPointer: () => void;
  giveStudentControl: (message?: string) => void;
  takeAIControl: (message?: string) => void;
  handleCanvasModeChange: (newMode: string, message?: string | null, allowManualAfter?: boolean) => void;
  
  // AI visualization functions
  generateVisualization: (prompt: string) => Promise<void>;
  captureCanvasScreenshot: () => Promise<string | null>;
  
  // Element manipulation
  highlightElements: (elementIds: string[]) => void;
  removeHighlighting: () => void;
  getCanvasElements: () => any[];
  updateElements: (elements: any[]) => void;
  
  // Command execution
  executeCommand: (command: ToolCommand) => Promise<any>;
  
  // Utility functions
  clearCanvas: () => void;
  dismissError: () => void;
  exportAsImage: () => Promise<void>;
}

export function useExcalidrawIntegration(): UseExcalidrawIntegrationReturn {
  // Core state
  const [excalidrawAPI, setExcalidrawAPIState] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([{
    type: 'system',
    content: "Hello! I'm your AI tutor. I have control of the canvas and will create visualizations for you. Click the 📍 Laser Pointer button to activate it, then click on any element to ask questions about it! I'll give you drawing control when it's time for you to practice.",
    timestamp: Date.now()
  }]);
  const [elements, setElements] = useState<any[]>([]);
  const [appState, setAppState] = useState<any>({});


  // CRITICAL FIX: Use refs to prevent infinite loops
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  const preventLoopRef = useRef(false);
  const lastElementsRef = useRef<any[]>([]);
  const lastAppStateRef = useRef<any>({});
  
  // Initialize the component hooks
  const interactionSensor = useStudentInteractionSensor();
  const visualActionExecutor = useVisualActionExecutor(excalidrawAPI);
  
  // API configuration
  const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001';

  // CRITICAL FIX: Memoize the setExcalidrawAPI to prevent recreation
  const setExcalidrawAPI = useCallback((api: any) => {
    if (api && api !== excalidrawAPI) {
      console.log('Setting new Excalidraw API');
      setExcalidrawAPIState(api);
    }
  }, [excalidrawAPI]);

  // CRITICAL FIX: Set APIs only when they actually change
  useEffect(() => {
    if (excalidrawAPI && interactionSensor.setExcalidrawAPI) {
      console.log('Updating interaction sensor with API');
      interactionSensor.setExcalidrawAPI(excalidrawAPI);
    }
  }, [excalidrawAPI]); // Remove interactionSensor from dependencies to prevent loops

  // CRITICAL FIX: Completely rewrite onChange to prevent loops
  const handleChangeWithControl = useCallback((newElements: any[], newAppState: any) => {
    // CRITICAL: Prevent recursive calls during updates
    if (isUpdatingRef.current || preventLoopRef.current) {
      return;
    }

    // CRITICAL: Deep comparison to prevent unnecessary updates
    const elementsChanged = JSON.stringify(newElements) !== JSON.stringify(lastElementsRef.current);
    const appStateChanged = JSON.stringify(newAppState) !== JSON.stringify(lastAppStateRef.current);

    if (!elementsChanged && !appStateChanged) {
      return;
    }

    // Update refs immediately
    lastElementsRef.current = newElements;
    lastAppStateRef.current = newAppState;

    // Update state
    setElements(newElements);
    setAppState(newAppState);

    // CRITICAL: Use a flag to prevent immediate re-entry
    preventLoopRef.current = true;
    
    // Clear the flag after React has processed the update
    setTimeout(() => {
      preventLoopRef.current = false;
    }, 0);

    // Only handle tool enforcement for specific scenarios
    const isAIMode = visualActionExecutor.canvasMode.mode === 'ai_controlled';
    const currentTool = newAppState.activeTool?.type;
    
    if (isAIMode && excalidrawAPI) {
      // Only enforce tools if there's an actual problem
      const shouldHaveLaser = interactionSensor.isLaserActive;
      const hasCorrectTool = shouldHaveLaser ? currentTool === 'laser' : (currentTool === 'selection' || currentTool === 'hand');
      
      if (!hasCorrectTool && !isUpdatingRef.current) {
        // Use a longer timeout to prevent rapid tool switching
        setTimeout(() => {
          if (excalidrawAPI && !isUpdatingRef.current && visualActionExecutor.canvasMode.mode === 'ai_controlled') {
            isUpdatingRef.current = true;
            const targetTool = interactionSensor.isLaserActive ? 'laser' : 'selection';
            console.log(`Correcting tool to: ${targetTool}`);
            excalidrawAPI.setActiveTool({ type: targetTool });
            
            setTimeout(() => {
              isUpdatingRef.current = false;
            }, 200);
          }
        }, 300);
      }
    }
  }, []); // CRITICAL: Empty dependency array to prevent recreation

  // CRITICAL FIX: Simplify pointer update handling
  const handlePointerUpdate = useCallback((payload: any) => {
    if (!excalidrawAPI || isUpdatingRef.current) return;
    
    const { pointer, button } = payload;
    const { x, y } = pointer;
    
    // Only handle laser pointer clicks
    if (interactionSensor.isLaserActive && button === 'down') {
      const sceneCoords = { x, y };
      
      const elementAtPosition = elements.find(element => {
        if (!element || element.isDeleted) return false;
        
        const { x: elX, y: elY, width, height, type } = element;
        
        // Simple hit detection
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
        // Highlight temporarily
        visualActionExecutor.highlightElements([elementAtPosition.id]);
        
        if (highlightTimeoutRef.current) {
          clearTimeout(highlightTimeoutRef.current);
        }
        
        highlightTimeoutRef.current = setTimeout(() => {
          visualActionExecutor.removeHighlighting();
        }, 3000);
        
        // Notify sensor
        interactionSensor.onElementPointed(elementAtPosition, sceneCoords);
        
        // Add message
        const elementInfo = `Element pointed: ${elementAtPosition.type}${elementAtPosition.text ? ` ("${elementAtPosition.text}")` : ''}`;
        addMessageToHistory('system', `🎯 ${elementInfo}`);
      }
    }
  }, [excalidrawAPI, elements, interactionSensor, visualActionExecutor]);

  // CRITICAL FIX: Memoize addMessageToHistory
  const addMessageToHistory = useCallback((type: ChatMessage['type'], content: string) => {
    const message: ChatMessage = { type, content, timestamp: Date.now() };
    setConversationHistory(prev => [...prev, message]);
  }, []);

  // CRITICAL FIX: Simplify mode change handling
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

  // CRITICAL FIX: Simplify chat message sending
  const sendChatMessage = useCallback(async (message: string, image: string | null = null) => {
    if (!message.trim() || isUpdatingRef.current) return;

    const userMessage = message.trim();
    if (!image) {
      addMessageToHistory('user', userMessage);
      setChatInput("");
    }
    
    visualActionExecutor.setIsGenerating(true);
    setError(null);

    // Build context without causing re-renders
    const context = {
      conversationHistory: conversationHistory.slice(-10),
      currentCanvas: { elements, elementCount: elements.length },
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
      
      // Handle different actions
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
              if (!isUpdatingRef.current) return; // Safety check
              
              const currentAppState = excalidrawAPI.getAppState?.() || appState;
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
  }, [conversationHistory, elements, appState, visualActionExecutor, interactionSensor, addMessageToHistory, API_BASE_URL, excalidrawAPI, handleCanvasModeChange]);

  // CRITICAL FIX: Simplify laser pointer toggle
  const toggleLaserPointer = useCallback(() => {
    if (!excalidrawAPI || isUpdatingRef.current) return;
    
    const wasActive = interactionSensor.isLaserActive;
    interactionSensor.toggleLaserPointer();
    
    // Set tool after state change
    setTimeout(() => {
      if (excalidrawAPI && !isUpdatingRef.current) {
        const toolType = wasActive ? 'selection' : 'laser';
        excalidrawAPI.setActiveTool({ type: toolType });
        
        const message = wasActive 
          ? '📍 Laser pointer deactivated.' 
          : '📍 Laser pointer activated! Click on elements to ask questions.';
        addMessageToHistory('system', message);
      }
    }, 100);
  }, [excalidrawAPI, interactionSensor, addMessageToHistory]);

  // Simplified control functions
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
    if (excalidrawAPI && !isUpdatingRef.current) {
      const currentAppState = excalidrawAPI.getAppState?.() || appState;
      excalidrawAPI.updateScene({ 
        elements: [], 
        appState: { 
          ...currentAppState, 
          viewModeEnabled: visualActionExecutor.canvasMode.mode === 'ai_controlled' && !interactionSensor.isLaserActive
        } 
      });
      setElements([]);
      setError(null);
      addMessageToHistory('system', '🗑️ Canvas cleared.');
    }
  }, [excalidrawAPI, appState, visualActionExecutor, interactionSensor, addMessageToHistory]);

  const dismissError = useCallback(() => {
    setError(null);
  }, []);

  // CRITICAL FIX: Remove the problematic useEffect that was causing loops
  // Only handle cleanup
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  // Store-based visualization data listener (from memory fix)
  const visualizationData = useSessionStore(state => state.visualizationData);
  const setVisualizationData = useSessionStore(state => state.setVisualizationData);
  const EXCAL_DEBUG = false;
  
  useEffect(() => {
    if (visualizationData && excalidrawAPI && !isUpdatingRef.current) {
      if (EXCAL_DEBUG) {
        console.log(`[EXCALIDRAW-INTEGRATION] Processing ${visualizationData.length} elements from store`);
      }
      
      try {
        isUpdatingRef.current = true;
        
        // Small delay for smooth rendering
        setTimeout(() => {
          (async () => {
            try {
              // Use image-aware converter that also loads files into Excalidraw
              const excalidrawElements = await visualActionExecutor.prepareElementsWithFiles(visualizationData);
              if (EXCAL_DEBUG) {
                console.log(`[EXCALIDRAW-INTEGRATION] Prepared ${excalidrawElements.length} Excalidraw elements (image-aware)`);
              }

              // Replace canvas with current visualization batch to avoid duplicates during streaming
              // Guard: do not clear scene on empty batches (prevents flicker/blank)
              if (excalidrawElements.length > 0) {
                const currentAppState = excalidrawAPI.getAppState?.() || appState;
                excalidrawAPI.updateScene({ 
                  elements: excalidrawElements,
                  appState: {
                    ...currentAppState
                  }
                });
              } else if (EXCAL_DEBUG) {
                console.log('[EXCALIDRAW-INTEGRATION] Skipping update: empty batch received, keeping previous scene');
              }

              try {
                const files = excalidrawAPI.getFiles?.() || {};
                const fileKeys = Object.keys(files);
                const sceneEls = excalidrawAPI.getSceneElements?.() || [];
                if (EXCAL_DEBUG || fileKeys.length === 0 || sceneEls.length === 0) {
                  console.log('[EXCALIDRAW-INTEGRATION] Files in scene:', fileKeys);
                  console.log('[EXCALIDRAW-INTEGRATION] Scene element count after update:', sceneEls.length);
                }
              } catch {}

              // Scroll to content if supported
              setTimeout(() => {
                try {
                  const els = excalidrawAPI.getSceneElements?.() || excalidrawElements;
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
              // Do not clear visualizationData here; streaming appends cumulatively.
            }
          })();
        }, 50);
        
      } catch (error) {
        console.error('[EXCALIDRAW-INTEGRATION] ❌ Error processing visualization data:', error);
        isUpdatingRef.current = false;
      }
    }
  }, [visualizationData, excalidrawAPI, appState, setVisualizationData, visualActionExecutor]);

  return {
    // Core state
    excalidrawAPI,
    canvasMode: visualActionExecutor.canvasMode,
    isGenerating: visualActionExecutor.isGenerating,
    error,
    elements,
    appState,
    
    // Chat functionality
    conversationHistory,
    chatInput,
    setChatInput,
    
    // Laser pointer functionality
    isLaserActive: interactionSensor.isLaserActive,
    lastPointerPosition: interactionSensor.lastPointerPosition,
    pointedElement: interactionSensor.pointedElement,
    
    // Element highlighting
    highlightedElements: visualActionExecutor.highlightedElements,
    
    // Core functions
    setExcalidrawAPI,
    handlePointerUpdate,
    handleChangeWithControl,
    
    // Chat functions
    sendChatMessage,
    addMessageToHistory,
    
    // Canvas control functions
    toggleLaserPointer,
    giveStudentControl,
    takeAIControl,
    handleCanvasModeChange,
    
    // AI visualization functions
    generateVisualization,
    captureCanvasScreenshot: visualActionExecutor.captureCanvasScreenshot,
    
    // Element manipulation
    highlightElements: visualActionExecutor.highlightElements,
    removeHighlighting: visualActionExecutor.removeHighlighting,
    getCanvasElements: visualActionExecutor.getCanvasElements,
    updateElements: visualActionExecutor.updateElements,
    
    // Command execution
    executeCommand: visualActionExecutor.executeCommand,
    
    // Utility functions
    clearCanvas,
    dismissError,
    exportAsImage
  };
}
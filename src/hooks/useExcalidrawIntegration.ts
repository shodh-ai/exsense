import { useState, useCallback, useEffect, useRef } from 'react';
import { useStudentInteractionSensor } from './useStudentInteractionSensor';
import { useVisualActionExecutor, ToolCommand } from './useVisualActionExecutor';

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
  
  // Chat functions
  sendChatMessage: (message: string, image?: string | null) => Promise<void>;
  addMessageToHistory: (type: ChatMessage['type'], content: string) => void;
  
  // Canvas control functions
  toggleLaserPointer: () => void;
  giveStudentControl: (message?: string) => void;
  takeAIControl: (message?: string) => void;
  
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
}

export function useExcalidrawIntegration(): UseExcalidrawIntegrationReturn {
  // Core state
  const [excalidrawAPI, setExcalidrawAPIState] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [conversationHistory, setConversationHistory] = useState<ChatMessage[]>([]);
  
  // Timeout refs for highlighting
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Initialize the component hooks
  const interactionSensor = useStudentInteractionSensor();
  const visualActionExecutor = useVisualActionExecutor(excalidrawAPI);
  
  // Set the Excalidraw API for both hooks when it changes
  useEffect(() => {
    if (excalidrawAPI) {
      interactionSensor.setExcalidrawAPI(excalidrawAPI);
    }
  }, [excalidrawAPI, interactionSensor]);
  
  // Enhanced setExcalidrawAPI that updates both hooks
  const setExcalidrawAPI = useCallback((api: any) => {
    if (api && api !== excalidrawAPI) {
      setExcalidrawAPIState(api);
      interactionSensor.setExcalidrawAPI(api);
    }
  }, [excalidrawAPI, interactionSensor]);
  
  // Enhanced pointer update handling with element detection
  const handlePointerUpdate = useCallback((payload: any) => {
    if (!excalidrawAPI) return;
    
    const { pointer, button } = payload;
    const { x, y } = pointer;
    
    // Handle laser pointer functionality in both AI and student modes
    if (interactionSensor.isLaserActive && button === 'down') {
      try {
        const sceneCoords = excalidrawAPI.getSceneCoordinatesFromPointer?.({ clientX: x, clientY: y });
        
        if (sceneCoords) {
          const elements = excalidrawAPI.getSceneElements() || [];
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
          
          if (elementAtPosition) {
            // Temporarily highlight the pointed element
            visualActionExecutor.highlightElements([elementAtPosition.id]);
            
            // Clear previous timeout
            if (highlightTimeoutRef.current) {
              clearTimeout(highlightTimeoutRef.current);
            }
            
            // Auto-remove highlighting after 3 seconds
            highlightTimeoutRef.current = setTimeout(() => {
              visualActionExecutor.removeHighlighting();
            }, 3000);
            
            // Notify interaction sensor
            interactionSensor.onElementPointed(elementAtPosition, sceneCoords);
            
            // Add contextual message about the pointed element
            const elementInfo = `Element pointed: ${elementAtPosition.type}${elementAtPosition.text ? ` ("${elementAtPosition.text}")` : ''} at position (${Math.round(elementAtPosition.x)}, ${Math.round(elementAtPosition.y)})`;
            addMessageToHistory('system', `🎯 ${elementInfo}`);
          }
        }
      } catch (error) {
        console.warn('Error handling pointer update:', error);
      }
    }
  }, [excalidrawAPI, interactionSensor, visualActionExecutor]);
  
  // Enhanced chat message handling
  const addMessageToHistory = useCallback((type: ChatMessage['type'], content: string) => {
    const message: ChatMessage = { type, content, timestamp: Date.now() };
    setConversationHistory(prev => [...prev, message]);
  }, []);
  
  // Enhanced chat message sending with screenshot capability
  const sendChatMessage = useCallback(async (message: string, image: string | null = null) => {
    if (!message.trim()) return;
    
    try {
      // Add user message to history
      addMessageToHistory('user', message);
      
      // Set generating state
      visualActionExecutor.executeCommand({ tool_name: 'set_generating', parameters: { generating: true } });
      
      // Prepare request data
      const requestData: any = {
        message,
        conversation_history: conversationHistory,
        canvas_elements: visualActionExecutor.getCanvasElements(),
        canvas_mode: visualActionExecutor.canvasMode,
        pointed_element: interactionSensor.pointedElement,
        last_interactions: interactionSensor.interactions.slice(-10) // Last 10 interactions
      };
      
      // Include screenshot if provided or if AI needs to analyze canvas
      if (image || message.toLowerCase().includes('see') || message.toLowerCase().includes('look') || message.toLowerCase().includes('check')) {
        const screenshot = image || await visualActionExecutor.captureCanvasScreenshot();
        if (screenshot) {
          requestData.canvas_screenshot = screenshot;
        }
      }
      
      // TODO: Replace with actual API call to your backend
      // For now, simulate AI response
      setTimeout(() => {
        const aiResponse = `I understand you want: "${message}". I can see the current canvas state and will help you accordingly.`;
        addMessageToHistory('assistant', aiResponse);
        visualActionExecutor.executeCommand({ tool_name: 'set_generating', parameters: { generating: false } });
      }, 1000);
      
    } catch (error) {
      console.error('Error sending chat message:', error);
      setError('Failed to send message. Please try again.');
      addMessageToHistory('system', 'Error: Failed to send message. Please try again.');
      visualActionExecutor.executeCommand({ tool_name: 'set_generating', parameters: { generating: false } });
    }
  }, [conversationHistory, visualActionExecutor, interactionSensor, addMessageToHistory]);
  
  // Enhanced laser pointer toggle with proper tool switching
  const toggleLaserPointer = useCallback(() => {
    if (!excalidrawAPI) return;
    
    const newLaserState = !interactionSensor.isLaserActive;
    
    // Toggle the interaction sensor laser state
    interactionSensor.toggleLaserPointer();
    
    // Set appropriate tool in Excalidraw
    if (newLaserState) {
      excalidrawAPI.setActiveTool({ type: 'laser' });
      addMessageToHistory('system', '🎯 Laser pointer activated! Click on elements to ask questions about them.');
    } else {
      excalidrawAPI.setActiveTool({ type: 'selection' });
      addMessageToHistory('system', '🎯 Laser pointer deactivated.');
      // Clear any highlighting when deactivating laser
      visualActionExecutor.removeHighlighting();
    }
  }, [excalidrawAPI, interactionSensor, visualActionExecutor, addMessageToHistory]);
  
  // Enhanced canvas control functions
  const giveStudentControl = useCallback((message?: string) => {
    visualActionExecutor.giveStudentControl(message);
    const controlMessage = message || 'You now have control of the canvas! Feel free to draw and modify elements.';
    addMessageToHistory('system', `🎨 ${controlMessage}`);
  }, [visualActionExecutor, addMessageToHistory]);
  
  const takeAIControl = useCallback((message?: string) => {
    visualActionExecutor.takeAIControl(message);
    const controlMessage = message || 'AI has taken control of the canvas for demonstration.';
    addMessageToHistory('system', `🤖 ${controlMessage}`);
  }, [visualActionExecutor, addMessageToHistory]);
  
  // Enhanced visualization generation
  const generateVisualization = useCallback(async (prompt: string) => {
    try {
      await visualActionExecutor.generateVisualization(prompt);
      addMessageToHistory('system', `🎨 Generated visualization: "${prompt}"`);
    } catch (error) {
      console.error('Error generating visualization:', error);
      setError('Failed to generate visualization. Please try again.');
      addMessageToHistory('system', 'Error: Failed to generate visualization.');
    }
  }, [visualActionExecutor, addMessageToHistory]);
  
  // Utility functions
  const clearCanvas = useCallback(() => {
    if (excalidrawAPI) {
      excalidrawAPI.resetScene();
      addMessageToHistory('system', '🗑️ Canvas cleared.');
    }
  }, [excalidrawAPI, addMessageToHistory]);
  
  const dismissError = useCallback(() => {
    setError(null);
  }, []);
  
  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);
  
  return {
    // Core state
    excalidrawAPI,
    canvasMode: visualActionExecutor.canvasMode,
    isGenerating: visualActionExecutor.isGenerating,
    error,
    
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
    
    // Chat functions
    sendChatMessage,
    addMessageToHistory,
    
    // Canvas control functions
    toggleLaserPointer,
    giveStudentControl,
    takeAIControl,
    
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
    dismissError
  };
}
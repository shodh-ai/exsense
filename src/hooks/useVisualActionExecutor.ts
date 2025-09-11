import { useState, useCallback, useRef } from 'react';
import { exportToCanvas } from '@excalidraw/excalidraw';
import { convertSkeletonToExcalidrawElements, type SkeletonElement } from './convertSkeletonToExcalidrawElements';

import type {
  ExcalidrawElement,
  ExcalidrawBindableElement,
  PointBinding
} from "@excalidraw/excalidraw/element/types";

type ExcalidrawAPIRefValue = any;

export interface ToolCommand {
  tool_name: string;
  parameters: Record<string, any>;
}

interface CanvasMode {
  mode: 'ai_controlled' | 'student_controlled' | 'collaborative';
  allowManualControl: boolean;
  message?: string;
}

interface UseVisualActionExecutorReturn {
  executeCommand: (command: ToolCommand) => Promise<any>;
  canvasMode: CanvasMode;
  isGenerating: boolean;
  highlightedElements: string[];
  captureCanvasScreenshot: () => Promise<string | null>;
  generateVisualization: (prompt: string) => Promise<void>;
  highlightElements: (elementIds: string[]) => void;
  removeHighlighting: () => void;
  giveStudentControl: (message?: string) => void;
  takeAIControl: (message?: string) => void;
  getCanvasElements: () => any[];
  updateElements: (elements: any[]) => void;
  handleElementModifications: (modifications: any[]) => Promise<void>;
  handleElementHighlighting: (highlightedElements: any[]) => Promise<void>;
  convertSkeletonToExcalidrawElements: (skeletonElements: SkeletonElement[]) => any[];
  prepareElementsWithFiles: (skeletonElements: SkeletonElement[]) => Promise<any[]>;
  setIsGenerating: (generating: boolean) => void;
  clearHighlightingOnNewInteraction: () => void;
}

const calculateTextDimensions = (text: string, fontSize = 16) => {
  if (!text) return { width: 0, height: 0 };
  const lines = text.split('\n');
  const maxLineLength = Math.max(...lines.map(line => line.length));
  return {
    width: Math.max(maxLineLength * fontSize * 0.6, 50),
    height: lines.length * fontSize * 1.2
  };
};

const generateId = () => `element_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const useVisualActionExecutor = (excalidrawAPI: ExcalidrawAPIRefValue | null): UseVisualActionExecutorReturn => {
  const [canvasMode, setCanvasMode] = useState<CanvasMode>({
    mode: 'ai_controlled',
    allowManualControl: false
  });
  const [isGenerating, setIsGenerating] = useState(false);
  const [highlightedElements, setHighlightedElements] = useState<string[]>([]);
  const [elements, setElements] = useState<any[]>([]);
  const [appState, setAppState] = useState<any>({});

  const isUpdatingRef = useRef(false);
  const activeHighlightIdsRef = useRef<Set<string>>(new Set());

  const captureCanvasScreenshot = useCallback(async (): Promise<string | null> => {
    if (!excalidrawAPI) {
      console.warn('Excalidraw API not available for screenshot');
      return null;
    }

    try {
      const currentElements = excalidrawAPI.getSceneElements();
      const currentAppState = excalidrawAPI.getAppState();

      if (currentElements.filter((el: any) => !el.isDeleted).length === 0) {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 768;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        return canvas.toDataURL('image/png');
      }

      const canvas = await exportToCanvas({
        elements: currentElements.filter((el: any) => !el.isDeleted),
        appState: {
          ...currentAppState,
          exportBackground: false,
          viewBackgroundColor: (currentAppState && (currentAppState as any).viewBackgroundColor) ?? 'transparent'
        },
        files: excalidrawAPI.getFiles?.() || null,
        exportPadding: 20,
        maxWidthOrHeight: 1024
      });

      return canvas.toDataURL('image/png');
    } catch (error) {
      console.error('Error capturing canvas screenshot:', error);
      return null;
    }
  }, [excalidrawAPI]);

  const fetchAsDataURL = useCallback(async (url: string): Promise<{ dataURL: string; mimeType: string } | null> => {
    const toDataURL = async (res: Response) => {
      const blob = await res.blob();
      const mimeType = blob.type || 'image/png';
      return await new Promise<{ dataURL: string; mimeType: string }>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve({ dataURL: reader.result as string, mimeType });
        reader.readAsDataURL(blob);
      });
    };

    try {
      const res = await fetch(url, { mode: 'cors' });
      if (res.ok) {
        return await toDataURL(res);
      }
    } catch (e) {
      console.warn('[prepareElementsWithFiles] Direct image fetch failed, will try proxy:', url, e);
    }

    try {
      const proxied = `http://localhost:8002/proxy-image?url=${encodeURIComponent(url)}`;
      const res2 = await fetch(proxied, { mode: 'cors' });
      if (!res2.ok) return null;
      return await toDataURL(res2);
    } catch (e2) {
      console.warn('[prepareElementsWithFiles] Proxy image fetch failed:', url, e2);
      return null;
    }
  }, []);

  const normalizeSkeletons = useCallback((skeletons: SkeletonElement[]): SkeletonElement[] => {
    const genId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    return skeletons.map((s) => {
      const id = s.id || genId();
      if (s.type === 'image') {
        return { ...s, id, fileId: s.fileId || id };
      }
      return { ...s, id };
    });
  }, []);

  const prepareElementsWithFiles = useCallback(async (skeletonElements: SkeletonElement[]): Promise<any[]> => {
    const normalized = normalizeSkeletons(skeletonElements);
    const files: Record<string, any> = {};

    const imageSkels = normalized.filter((s) => s.type === 'image' && !!s.imageUrl);
    await Promise.all(
      imageSkels.map(async (img) => {
        const fileId = img.fileId as string;
        const fetched = await fetchAsDataURL(img.imageUrl as string);
        if (fetched && fileId) {
          files[fileId] = {
            id: fileId,
            dataURL: fetched.dataURL,
            mimeType: fetched.mimeType,
            created: Date.now(),
            name: `image-${fileId}`,
          };
        }
      })
    );

    if (excalidrawAPI && Object.keys(files).length > 0 && typeof excalidrawAPI.addFiles === 'function') {
      try {
        excalidrawAPI.addFiles(files);
      } catch (e) {
        console.warn('addFiles failed:', e);
      }
    }

    const raw = convertSkeletonToExcalidrawElements(normalized);
    const fixed = raw.map((e: any) => {
      if (!e) return null;
      const out: any = { ...e };
      if (out.x == null || Number.isNaN(out.x)) out.x = 0;
      if (out.y == null || Number.isNaN(out.y)) out.y = 0;
      if (typeof out.width !== 'number' || Number.isNaN(out.width)) out.width = 1;
      if (typeof out.height !== 'number' || Number.isNaN(out.height)) out.height = 1;
      if (!Array.isArray(out.groupIds)) out.groupIds = [];
      if (!Array.isArray(out.boundElements)) out.boundElements = [];
      if (out.type === 'text') {
        if (typeof out.text !== 'string') out.text = '';
        if (typeof out.fontSize !== 'number' || Number.isNaN(out.fontSize)) out.fontSize = 16;
        if (typeof out.lineHeight !== 'number' || Number.isNaN(out.lineHeight)) out.lineHeight = 1.2;
        if (typeof out.baseline !== 'number' || Number.isNaN(out.baseline)) out.baseline = Math.round(out.fontSize);
      }
      if (out.type === 'arrow' || out.type === 'line') {
        if (!Array.isArray(out.points) || out.points.length < 2) {
          const w = out.width || 100;
          const h = out.height || 100;
          out.points = [[0, 0], [w, h]];
        } else {
          out.points = out.points
            .filter((p: any) => Array.isArray(p) && p.length === 2 && p.every((n: any) => typeof n === 'number' && !Number.isNaN(n)));
          if (out.points.length < 2) {
            const w = out.width || 100;
            const h = out.height || 100;
            out.points = [[0, 0], [w, h]];
          }
        }
      }
      if (out.isDeleted) out.isDeleted = false;
      if (out.opacity == null) out.opacity = 100;
      if (out.strokeWidth == null) out.strokeWidth = 2;
      if (!out.strokeColor) out.strokeColor = '#1e1e1e';
      return out;
    }).filter((e: any) => e && typeof e === 'object');
    return fixed;
  }, [excalidrawAPI, fetchAsDataURL, normalizeSkeletons]);

  const calculateConnectionPoints = useCallback((fromElement: any, toElement: any) => {
    const fromCenterX = fromElement.x + fromElement.width / 2;
    const fromCenterY = fromElement.y + fromElement.height / 2;
    const toCenterX = toElement.x + toElement.width / 2;
    const toCenterY = toElement.y + toElement.height / 2;

    const dx = toCenterX - fromCenterX;
    const dy = toCenterY - fromCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance === 0) return { startX: fromCenterX, startY: fromCenterY, endX: toCenterX, endY: toCenterY };

    const normalizedDx = dx / distance;
    const normalizedDy = dy / distance;

    let startX, startY, endX, endY;

    if (fromElement.type === 'ellipse') {
      const a = fromElement.width / 2;
      const b = fromElement.height / 2;
      const t = Math.sqrt((a * a) / (normalizedDx * normalizedDx + (a * a * normalizedDy * normalizedDy) / (b * b)));
      startX = fromCenterX + normalizedDx * t;
      startY = fromCenterY + normalizedDy * t * (a / b);
    } else {
      const halfWidth = fromElement.width / 2;
      const halfHeight = fromElement.height / 2;

      if (Math.abs(normalizedDx) > Math.abs(normalizedDy)) {
        startX = fromCenterX + (normalizedDx > 0 ? halfWidth : -halfWidth);
        startY = fromCenterY + normalizedDy * (halfWidth / Math.abs(normalizedDx));
      } else {
        startX = fromCenterX + normalizedDx * (halfHeight / Math.abs(normalizedDy));
        startY = fromCenterY + (normalizedDy > 0 ? halfHeight : -halfHeight);
      }
    }

    const reverseNormalizedDx = -normalizedDx;
    const reverseNormalizedDy = -normalizedDy;

    if (toElement.type === 'ellipse') {
      const a = toElement.width / 2;
      const b = toElement.height / 2;
      const t = Math.sqrt((a * a) / (reverseNormalizedDx * reverseNormalizedDx + (a * a * reverseNormalizedDy * reverseNormalizedDy) / (b * b)));
      endX = toCenterX + reverseNormalizedDx * t;
      endY = toCenterY + reverseNormalizedDy * t * (a / b);
    } else {
      const halfWidth = toElement.width / 2;
      const halfHeight = toElement.height / 2;

      if (Math.abs(reverseNormalizedDx) > Math.abs(reverseNormalizedDy)) {
        endX = toCenterX + (reverseNormalizedDx > 0 ? halfWidth : -halfWidth);
        endY = toCenterY + reverseNormalizedDy * (halfWidth / Math.abs(reverseNormalizedDx));
      } else {
        endX = toCenterX + reverseNormalizedDx * (halfHeight / Math.abs(reverseNormalizedDy));
        endY = toCenterY + (reverseNormalizedDy > 0 ? halfHeight : -halfHeight);
      }
    }

    return { startX, startY, endX, endY };
  }, []);

  const handleElementModifications = useCallback(async (modifications: any[]) => {
    if (!excalidrawAPI || !modifications || modifications.length === 0 || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    try {
      const currentElements = excalidrawAPI.getSceneElements();
      let updatedElements = [...currentElements];

      modifications.forEach(modification => {
        const { elementId, changes, action } = modification;

        if (action === 'update') {
          const elementIndex = updatedElements.findIndex(el => el.id === elementId);
          if (elementIndex !== -1) {
            updatedElements[elementIndex] = {
              ...updatedElements[elementIndex],
              ...changes,
              updated: Date.now()
            };
          }
        } else if (action === 'delete') {
          const elementIndex = updatedElements.findIndex(el => el.id === elementId);
          if (elementIndex !== -1) {
            updatedElements[elementIndex] = {
              ...updatedElements[elementIndex],
              isDeleted: true,
              updated: Date.now()
            };
          }
        } else if (action === 'add') {
          const newElement = {
            id: `modified_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type: changes.type || 'rectangle',
            x: changes.x || 100,
            y: changes.y || 100,
            width: changes.width || 120,
            height: changes.height || 60,
            angle: 0,
            strokeColor: changes.strokeColor || "#1e1e1e",
            backgroundColor: changes.backgroundColor || "transparent",
            fillStyle: "solid",
            strokeWidth: changes.strokeWidth || 2,
            strokeStyle: "solid",
            roughness: 1,
            opacity: 100,
            groupIds: [],
            frameId: null,
            roundness: changes.type === 'rectangle' ? { type: 3, value: 8 } : null,
            boundElements: null,
            updated: Date.now(),
            link: null,
            locked: false,
            isDeleted: false,
            customData: null,
            versionNonce: Math.floor(Math.random() * 1000000),
            seed: Math.floor(Math.random() * 2147483647),
            ...changes
          };

          if (changes.type === 'text') {
            newElement.text = changes.text || 'Text';
            newElement.fontSize = changes.fontSize || 16;
            newElement.fontFamily = 1;
            newElement.textAlign = "center";
            newElement.verticalAlign = "middle";
            newElement.containerId = null;
            newElement.originalText = changes.text || 'Text';
            newElement.lineHeight = 1.25;
            newElement.baseline = Math.round((changes.fontSize || 16) * 0.9);
          }

          updatedElements.push(newElement);
        }
      });

      excalidrawAPI.updateScene({
        elements: updatedElements,
        appState: {
          ...excalidrawAPI.getAppState(),
          selectedElementIds: {},
          editingElement: null,
          editingGroupId: null
        }
      });
    } finally {
      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }
  }, [excalidrawAPI]);

  const handleElementHighlighting = useCallback(async (highlightedElementsData: any[]) => {
    if (!excalidrawAPI || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    try {
        const currentElements = excalidrawAPI.getSceneElements();
        const elementIdsToHighlight = new Set(highlightedElementsData.map(h => h.elementId));

        const updatedElements = currentElements.map((element: any) => {
            if (elementIdsToHighlight.has(element.id)) {
                const originalStyle = element.customData?.originalStyle || {
                    strokeColor: element.strokeColor,
                    strokeWidth: element.strokeWidth,
                    backgroundColor: element.backgroundColor,
                    opacity: element.opacity,
                };
                
                activeHighlightIdsRef.current.add(element.id);

                return {
                    ...element,
                    strokeColor: "#FFD700",
                    strokeWidth: Math.max(element.strokeWidth, 4),
                    backgroundColor: "rgba(255, 215, 0, 0.2)",
                    opacity: 100,
                    customData: {
                        ...(element.customData || {}),
                        originalStyle: originalStyle,
                    },
                    updated: Date.now()
                };
            }
            return element;
        });

        excalidrawAPI.updateScene({ elements: updatedElements });
        console.log('[useVisualActionExecutor] Applied persistent highlighting to elements:', Array.from(elementIdsToHighlight));

    } finally {
        isUpdatingRef.current = false;
    }
  }, [excalidrawAPI]);

  const generateVisualization = useCallback(async (prompt: string) => {
    if (!excalidrawAPI) {
      console.warn('Excalidraw API not available for visualization generation');
      return;
    }
    setIsGenerating(true);

    try {
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

      setTimeout(() => {
        const currentAppState = excalidrawAPI.getAppState?.() || {};
        excalidrawAPI.updateScene({
          elements: excalidrawElements,
          appState: {
            ...currentAppState,
            selectedElementIds: {},
            editingElement: null,
            editingGroupId: null
          }
        });

        setTimeout(() => {
          if (excalidrawElements.length > 0) {
            excalidrawAPI.scrollToContent(excalidrawElements, {
              fitToContent: true,
              animate: true
            });
          }
        }, 500);
      }, 100);

    } catch (error) {
      console.error('Error generating visualization:', error);
    } finally {
      setIsGenerating(false);
    }
  }, [excalidrawAPI, convertSkeletonToExcalidrawElements]);

  const highlightElements = useCallback((elementIds: string[]) => {
    if (!excalidrawAPI) return;
    setHighlightedElements(elementIds);
    const highlightData = elementIds.map(id => ({ elementId: id }));
    handleElementHighlighting(highlightData);
  }, [excalidrawAPI, handleElementHighlighting]);

  const removeHighlighting = useCallback(() => {
    if (!excalidrawAPI || isUpdatingRef.current || activeHighlightIdsRef.current.size === 0) return;

    isUpdatingRef.current = true;

    try {
        const currentElements = excalidrawAPI.getSceneElements();
        const updatedElements = currentElements.map((element: any) => {
            if (element.customData?.originalStyle) {
                const { originalStyle, ...restCustomData } = element.customData;
                return {
                    ...element,
                    ...originalStyle,
                    customData: Object.keys(restCustomData).length > 0 ? restCustomData : null,
                    updated: Date.now()
                };
            }
            return element;
        });
        
        excalidrawAPI.updateScene({ elements: updatedElements });
        
        console.log('[useVisualActionExecutor] Cleared highlighting from elements:', Array.from(activeHighlightIdsRef.current));
        activeHighlightIdsRef.current.clear();
        setHighlightedElements([]);
        
    } finally {
        isUpdatingRef.current = false;
    }
  }, [excalidrawAPI]);

  const clearHighlightingOnNewInteraction = useCallback(() => {
    if (activeHighlightIdsRef.current.size > 0) {
      console.log('[useVisualActionExecutor] Clearing highlights due to new interaction');
      removeHighlighting();
    }
  }, [removeHighlighting]);

  const giveStudentControl = useCallback((message?: string) => {
    setCanvasMode({
      mode: 'student_controlled',
      allowManualControl: true,
      message: message || 'You now have control of the canvas. Feel free to draw and modify elements!'
    });

    if (excalidrawAPI) {
      excalidrawAPI.setActiveTool({ type: 'selection' });
    }
  }, [excalidrawAPI]);

  const takeAIControl = useCallback((message?: string) => {
    setCanvasMode({
      mode: 'ai_controlled',
      allowManualControl: false,
      message: message || 'AI has taken control of the canvas for demonstration.'
    });
  }, []);

  const getCanvasElements = useCallback(() => {
    if (!excalidrawAPI) return [];
    return excalidrawAPI.getSceneElements();
  }, [excalidrawAPI]);

  const updateElements = useCallback((newElements: any[]) => {
    if (!excalidrawAPI || isUpdatingRef.current) return;

    isUpdatingRef.current = true;

    setTimeout(() => {
      excalidrawAPI.updateScene({
        elements: newElements,
        appState: {
          ...excalidrawAPI.getAppState(),
          selectedElementIds: {},
          editingElement: null,
          editingGroupId: null
        }
      });

      setTimeout(() => {
        isUpdatingRef.current = false;
      }, 100);
    }, 50);
  }, [excalidrawAPI]);

  const executeCommand = useCallback(async (command: ToolCommand): Promise<any> => {
    if (!excalidrawAPI) {
      console.warn("Excalidraw API not available, skipping command:", command);
      return null;
    }

    console.log("Executing command:", command.tool_name, command.parameters);

    switch (command.tool_name) {
      case 'clear_canvas':
        excalidrawAPI.resetScene();
        break;

      case 'generate_visualization':
        await generateVisualization(command.parameters.prompt || '');
        break;

      case 'highlight_elements':
        highlightElements(command.parameters.elementIds || []);
        break;

      case 'remove_highlighting':
        removeHighlighting();
        break;

      case 'give_student_control':
        giveStudentControl(command.parameters.message);
        break;

      case 'take_ai_control':
        takeAIControl(command.parameters.message);
        break;

      case 'capture_screenshot':
        return await captureCanvasScreenshot();

      case 'get_canvas_elements':
        return getCanvasElements();

      case 'update_elements':
        updateElements(command.parameters.elements || []);
        break;

      case 'modify_elements':
        await handleElementModifications(command.parameters.modifications || []);
        break;

      case 'highlight_elements_advanced':
        await handleElementHighlighting(command.parameters.highlightedElements || []);
        break;

      case 'set_generating':
        setIsGenerating(command.parameters.generating || false);
        break;

      default:
        console.warn('Unknown command:', command.tool_name);
    }

    return null;
  }, [excalidrawAPI, generateVisualization, highlightElements, removeHighlighting,
      giveStudentControl, takeAIControl, captureCanvasScreenshot, getCanvasElements,
      updateElements, handleElementModifications, handleElementHighlighting]);

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
    updateElements,
    handleElementModifications,
    handleElementHighlighting,
    convertSkeletonToExcalidrawElements,
    prepareElementsWithFiles,
    setIsGenerating,
    clearHighlightingOnNewInteraction
  };
};

export { useVisualActionExecutor, type SkeletonElement };
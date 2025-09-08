"use client";

// Dynamically import Excalidraw to ensure no SSR issues
const Excalidraw = dynamic(async () => (await import("@excalidraw/excalidraw")).Excalidraw, {
  ssr: false,
  loading: () => <div style={{ height: "100%", width: "100%" }}>Loading whiteboard…</div>,
});

import React, { useCallback, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import "@excalidraw/excalidraw/index.css";
import { useSessionStore } from "@/lib/store";
import { useExcalidrawIntegration } from "@/hooks/useExcalidrawIntegration";
import type { NormalizedZoomValue } from "@excalidraw/excalidraw/types";

declare global {
  interface Window {
    __excalidrawDebug?: {
      toggleLaserPointer: () => void;
      captureCanvasScreenshot: () => Promise<string>;
      highlightElements: (elementIds: string[]) => void;
      removeHighlighting: () => void;
      giveStudentControl: () => void;
      takeAIControl: () => void;
      getSceneElements: () => any[];
      getFiles?: () => Record<string, any>;
      getAppState?: () => any;
      scrollToContent?: (elements: any[], opts?: { fitToContent?: boolean; animate?: boolean }) => void;
      centerOnAll?: () => void;
      clearCanvas: () => void;
      sendMessage: (message: string) => void;
      setElements: (elements: any[]) => void;
      updateScene: (scene: { elements?: any[], appState?: any }) => void;
      convertSkeletonToExcalidraw: (skeletonElements: any[]) => any[];
    };
    __convertMermaidToExcalidrawWithColors?: (skeletonElements: any[], mermaidSyntax: string) => any[];
    __enhancedConvertSkeletonToExcalidraw?: (skeletonElements: any[], mermaidSyntax: string) => any[];
  }
}

const ExcalidrawWrapper = () => {
  const excalidrawAPIFromStore = useSessionStore(state => state.excalidrawAPI);
  const setExcalidrawAPIToStore = useSessionStore(state => state.setExcalidrawAPI);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Use the unified integration hook
  const {
    excalidrawAPI,
    setExcalidrawAPI,
    handlePointerUpdate,
    toggleLaserPointer,
    captureCanvasScreenshot,
    highlightElements,
    removeHighlighting,
    giveStudentControl,
    takeAIControl,
    clearCanvas,
    sendChatMessage,
    updateElements,
    handleChangeWithControl
  } = useExcalidrawIntegration();

  // Sync with session store
  useEffect(() => {
    if (excalidrawAPI && excalidrawAPI !== excalidrawAPIFromStore) {
      setExcalidrawAPIToStore(excalidrawAPI);
    }
  }, [excalidrawAPI, excalidrawAPIFromStore, setExcalidrawAPIToStore]);

  // Helper function to ensure valid hex colors
  const normalizeColor = (color?: string): string => {
    if (!color) return '#1e1e1e';
    
    // If it's already a valid hex color, return it
    if (color.match(/^#[0-9A-Fa-f]{6}$/)) {
      return color;
    }
    
    // If it's a 3-char hex, expand it
    if (color.match(/^#[0-9A-Fa-f]{3}$/)) {
      return color.replace(/^#(.)(.)(.)$/, '#$1$1$2$2$3$3');
    }
    
    // Common color name mappings for Mermaid compatibility
    const colorMap: { [key: string]: string } = {
      'transparent': '#00000000',
      'black': '#000000',
      'white': '#ffffff',
      'red': '#ff0000',
      'green': '#00ff00',
      'blue': '#0000ff',
      'yellow': '#ffff00',
      'orange': '#ffa500',
      'purple': '#800080',
      'pink': '#ffc0cb',
      'gray': '#808080',
      'grey': '#808080'
    };
    
    return colorMap[color.toLowerCase()] || '#1e1e1e';
  };

  // Helper function to determine text color based on background
  const getContrastingTextColor = (backgroundColor: string): string => {
    // Remove alpha channel for calculation
    const hex = backgroundColor.replace(/^#/, '').slice(0, 6);
    
    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return black for light backgrounds, white for dark backgrounds
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Improved text dimension calculation using canvas measurements
  const getTextDimensions = (text: string, fontSize: number = 16, fontFamily: number = 1): { width: number; height: number } => {
    if (!text || text.trim() === '') return { width: 20, height: fontSize * 1.25 };
    
    // Create a temporary canvas for accurate text measurement
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    
    if (!context) {
      // Fallback calculation
      const lines = text.split('\n');
      const avgCharWidth = fontSize * 0.6;
      const maxLineLength = Math.max(...lines.map(line => line.length));
      return {
        width: Math.max(maxLineLength * avgCharWidth, 20),
        height: lines.length * fontSize * 1.25
      };
    }
    
    // Set font properties similar to Excalidraw's font rendering
    const fontWeight = 'normal';
    const fontStyle = 'normal';
    
    // Map Excalidraw font families to actual fonts
    const fontFamilyMap: { [key: number]: string } = {
      1: 'Virgil, Segoe UI Emoji', // Hand-drawn
      2: 'Helvetica, Segoe UI Emoji', // Normal
      3: 'Cascadia, Segoe UI Emoji', // Code
      4: 'Virgil, Segoe UI Emoji' // Default fallback
    };
    
    const fontFamilyName = fontFamilyMap[fontFamily] || fontFamilyMap[1];
    context.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamilyName}`;
    
    const lines = text.split('\n');
    const lineHeight = fontSize * 1.25;
    
    // Measure each line and find the maximum width
    let maxWidth = 0;
    lines.forEach(line => {
      const lineWidth = context.measureText(line.trim()).width;
      maxWidth = Math.max(maxWidth, lineWidth);
    });
    
    // Add some padding for better visual appearance
    const padding = fontSize * 0.2;
    
    return {
      width: Math.max(maxWidth + padding * 2, 20),
      height: Math.max(lines.length * lineHeight + padding, fontSize * 1.25)
    };
  };

  // Expose debug functions and color parser
  useEffect(() => {
    if (excalidrawAPI) {
      // Add the complete color parser to window
      window.__convertMermaidToExcalidrawWithColors = (skeletonElements: any[], mermaidSyntax: string) => {
        // Inline color parser implementation
        const parseComplete = (syntax: string) => {
          const classDefinitions = new Map<string, { [key: string]: string }>();
          const nodeClassAssignments = new Map();
          const linkStyles = new Map();
          
          const lines = syntax.split('\n').map((line: string) => line.trim()).filter((line: string) => line);
          
          for (const line of lines) {
            // Parse classDef
            const classDefMatch = line.match(/classDef\s+(\w+)\s+(.+)/);
            if (classDefMatch) {
              const [, className, styleString] = classDefMatch;
              const styles: { [key: string]: string } = {};
              const parts = styleString.split(',').map((s: string) => s.trim());
              for (const part of parts) {
                const colonIndex = part.indexOf(':');
                if (colonIndex > 0) {
                  const key = part.substring(0, colonIndex).trim();
                  const value = part.substring(colonIndex + 1).trim();
                  styles[key] = value;
                }
              }
              classDefinitions.set(className, styles);
            }
            
            // Parse class assignments
            const classMatch = line.match(/class\s+([A-Za-z0-9_,\s]+)\s+(\w+)/);
            if (classMatch) {
              const [, nodeIds, className] = classMatch;
              const nodes = nodeIds.split(/[,\\s]+/).filter((id: string) => id.trim());
              for (const nodeId of nodes) {
                const cleanNodeId = nodeId.trim().replace(/;$/, '');
                nodeClassAssignments.set(cleanNodeId, className);
              }
            }
            
            // Parse linkStyle
            const linkStyleMatch = line.match(/linkStyle\s+(\d+)\s+(.+)/);
            if (linkStyleMatch) {
              const [, linkIndex, styleString] = linkStyleMatch;
              const styles: { [key: string]: string } = {};
              const parts = styleString.split(',').map((s: string) => s.trim());
              for (const part of parts) {
                const colonIndex = part.indexOf(':');
                if (colonIndex > 0) {
                  const key = part.substring(0, colonIndex).trim();
                  const value = part.substring(colonIndex + 1).trim();
                  styles[key] = value;
                }
              }
              linkStyles.set(parseInt(linkIndex), styles);
            }
          }
          
          return { classDefinitions, nodeClassAssignments, linkStyles };
        };
        
        const { classDefinitions, nodeClassAssignments, linkStyles } = parseComplete(mermaidSyntax);
        let linkIndex = 0;
        
        return skeletonElements.map((element: any, elementIndex: number) => {
          const isLink = element.type === 'arrow' || element.type === 'line';
          let appliedStyles: { [key: string]: any } = {};
          
          if (isLink) {
            appliedStyles = linkStyles.get(linkIndex) || {};
            linkIndex++;
          } else {
            const className = nodeClassAssignments.get(element.id);
            if (className && classDefinitions.has(className)) {
              appliedStyles = classDefinitions.get(className) || {};
            }
          }
          
          const backgroundColor = normalizeColor(appliedStyles.fill || element.backgroundColor || '#ffffff');
          const strokeColor = normalizeColor(appliedStyles.stroke || element.strokeColor || '#000000');
          const strokeWidth = parseFloat(appliedStyles['stroke-width']) || element.strokeWidth || 2;
          const textColor = appliedStyles.color ? normalizeColor(appliedStyles.color) : getContrastingTextColor(backgroundColor);
          
          return {
            ...element,
            strokeColor: isLink ? strokeColor : strokeColor,
            backgroundColor: element.type === 'text' ? 'transparent' : backgroundColor,
            strokeWidth: strokeWidth,
            // For text elements, use textColor as strokeColor
            ...(element.type === 'text' && { strokeColor: textColor })
          };
        });
      };

      window.__excalidrawDebug = {
        ...(window.__excalidrawDebug || {}),
        toggleLaserPointer: () => toggleLaserPointer(),
        captureCanvasScreenshot: async () => {
          const screenshot = await captureCanvasScreenshot();
          console.log('Canvas screenshot captured');
          return screenshot || 'No screenshot available';
        },
        highlightElements: (elementIds: string[]) => {
          highlightElements(elementIds);
        },
        removeHighlighting: () => {
          removeHighlighting();
        },
        giveStudentControl: () => {
          giveStudentControl('Debug: Student control activated');
        },
        takeAIControl: () => {
          takeAIControl('Debug: AI control activated');
        },
        getSceneElements: () => excalidrawAPI.getSceneElements?.(),
        getAppState: () => excalidrawAPI.getAppState?.(),
        scrollToContent: excalidrawAPI.scrollToContent?.bind(excalidrawAPI),
        centerOnAll: () => {
          try {
            const els = excalidrawAPI.getSceneElements?.() || [];
            if (els.length && excalidrawAPI.scrollToContent) {
              excalidrawAPI.scrollToContent(els, { fitToContent: true, animate: true });
            }
          } catch {}
        },
        clearCanvas: () => clearCanvas(),
        sendMessage: (message: string) => sendChatMessage(message),
        setElements: (elements: any[]) => updateElements(elements),
        updateScene: (scene: { elements?: any[], appState?: any }) => {
          excalidrawAPI.updateScene?.(scene);
        },
        convertSkeletonToExcalidraw: (skeletonElements: any[], mermaidSyntax?: string) => {
          // Enhanced implementation with Mermaid color parsing
          if (mermaidSyntax && window.__convertMermaidToExcalidrawWithColors) {
            // Use the enhanced converter that parses Mermaid colors
            return window.__convertMermaidToExcalidrawWithColors(skeletonElements, mermaidSyntax);
          }
          
          // Fallback to basic conversion
          return skeletonElements.map((element, index) => {
            // Normalize colors from Mermaid format
            const fillColor = normalizeColor(element.backgroundColor || element.fill);
            const strokeColor = normalizeColor(element.strokeColor || element.stroke);
            const textColor = element.color ? normalizeColor(element.color) : getContrastingTextColor(fillColor);
            
            const baseElement = {
              id: `element_${Date.now()}_${index}`,
              type: element.type || 'rectangle',
              x: element.x || 0,
              y: element.y || 0,
              angle: 0,
              strokeColor: strokeColor,
              backgroundColor: fillColor,
              fillStyle: element.fillStyle || 'solid',
              strokeWidth: element.strokeWidth || 2,
              strokeStyle: element.strokeStyle || 'solid',
              roughness: element.roughness || 1,
              opacity: element.opacity || 100,
              groupIds: [],
              frameId: null,
              boundElements: null,
              updated: Date.now(),
              link: null,
              locked: false,
              isDeleted: false,
              customData: null,
              versionNonce: Math.floor(Math.random() * 1000000),
              seed: Math.floor(Math.random() * 2147483647)
            };

            // Handle different element types with their specific properties
            switch (element.type) {
              case 'line':
              case 'arrow':
                return {
                  ...baseElement,
                  width: 0,
                  height: 0,
                  points: element.points || [[0, 0], [element.width || 100, element.height || 0]],
                  lastCommittedPoint: null,
                  startBinding: null,
                  endBinding: null,
                  startArrowhead: element.type === 'arrow' ? 'arrow' : null,
                  endArrowhead: element.type === 'arrow' ? 'arrow' : null
                };
              
              case 'text':
                const text = element.text || '';
                const fontSize = element.fontSize || 16;
                const fontFamily = element.fontFamily || 1;
                const lineHeight = element.lineHeight || 1.25;
                
                // Use accurate text dimensions
                const textDimensions = getTextDimensions(text, fontSize, fontFamily);
                
                return {
                  ...baseElement,
                  strokeColor: textColor, // Use calculated contrast color for text
                  backgroundColor: 'transparent', // Text background should be transparent
                  width: element.width || textDimensions.width,
                  height: element.height || textDimensions.height,
                  text: text,
                  fontSize: fontSize,
                  fontFamily: fontFamily,
                  textAlign: element.textAlign || 'left',
                  verticalAlign: element.verticalAlign || 'top',
                  containerId: null,
                  originalText: text,
                  autoResize: true,
                  lineHeight: lineHeight,
                  baseline: Math.round(fontSize * 0.8)
                };
              
              case 'ellipse':
                return {
                  ...baseElement,
                  width: element.width || 120,
                  height: element.height || 120
                };
              
              case 'diamond':
                // Convert diamond to a diamond-shaped polygon or use freedraw
                return {
                  ...baseElement,
                  type: 'freedraw',
                  width: element.width || 120,
                  height: element.height || 120,
                  points: [
                    [60, 0],   // top
                    [120, 60], // right
                    [60, 120], // bottom
                    [0, 60],   // left
                    [60, 0]    // close
                  ].map(([x, y]) => [x - 60, y - 60]), // Center the diamond
                  pressures: []
                };
              
              case 'rectangle':
              default:
                return {
                  ...baseElement,
                  width: element.width || 120,
                  height: element.height || 60,
                  roundness: element.roundness || (element.rounded ? { type: 3, value: 8 } : null)
                };
            }
          });
        }
      };
    }
    
    return () => {
      // Cleanup
      delete window.__excalidrawDebug;
    };
  }, [excalidrawAPI, toggleLaserPointer, getTextDimensions]);

  // Handle Excalidraw API initialization
  const handleExcalidrawAPI = useCallback((api: any) => {
    if (api && api !== excalidrawAPI) {
      setExcalidrawAPI(api);
      // Expose useful debug helpers on window for quick diagnostics
      try {
        (window as any).__excalidrawDebug = {
          ...(window as any).__excalidrawDebug,
          getSceneElements: api.getSceneElements?.bind(api),
          getFiles: api.getFiles?.bind(api),
          updateScene: api.updateScene?.bind(api),
          scrollToContent: api.scrollToContent?.bind(api),
          getAppState: api.getAppState?.bind(api),
          centerOnAll: () => {
            try {
              const els = api.getSceneElements?.() || [];
              if (els.length && api.scrollToContent) {
                api.scrollToContent(els, { fitToContent: true, animate: true });
              }
            } catch {}
          },
        };
      } catch {}
    }
  }, [excalidrawAPI, setExcalidrawAPI]);

  // --- Plan rendering helpers (images via Google CSE and colorful rounded boxes)
  type WhiteboardPlan = {
    images?: Array<{ query: string; x?: number; y?: number; width?: number; height?: number }>;
    boxes?: Array<{ text?: string; color?: string; stroke?: string; x: number; y: number; width: number; height: number; fontSize?: number }>;
    arrows?: Array<{ from: { x: number; y: number }; to: { x: number; y: number }; color?: string; width?: number }>; // coordinate-based
  };

  const palette = [
    "#FDE68A", // amber-200
    "#A7F3D0", // emerald-200
    "#BFDBFE", // blue-200
    "#FBCFE8", // pink-200
    "#DDD6FE", // violet-200
    "#C7D2FE", // indigo-200
  ];

  const makeId = () => `el_${Date.now()}_${Math.random().toString(36).slice(2)}`;

  const insertElements = (elements: any[]) => {
    if (!excalidrawAPI) return;
    const prev = excalidrawAPI.getSceneElements?.() || [];
    excalidrawAPI.updateScene?.({ elements: [...prev, ...elements] });
  };

  const addImageByQuery = async (query: string, x = 0, y = 0, width = 480, height = 320) => {
    if (!excalidrawAPI) return;
    try {
      const res = await fetch('/api/images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, safe: 'active', num: 1, imgType: 'photo' }) });
      if (!res.ok) return;
      const data = await res.json();
      const fileId = `file_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const file = {
        id: fileId,
        dataURL: data.dataURL,
        mimeType: data.mimeType || 'image/jpeg',
        created: Date.now(),
      };
      excalidrawAPI.addFiles?.([file as any]);
      const imgEl = {
        id: makeId(),
        type: 'image',
        x, y,
        width, height,
        angle: 0,
        strokeColor: '#00000000',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 0,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        isDeleted: false,
        fileId,
        status: 'saved',
        scale: [1, 1],
        crop: null,
        versionNonce: Math.floor(Math.random() * 1000000),
        seed: Math.floor(Math.random() * 2147483647),
      };
      insertElements([imgEl]);
    } catch {}
  };

  const addRoundedBox = (opts: { x: number; y: number; width: number; height: number; text?: string; color?: string; stroke?: string; fontSize?: number }, idx = 0) => {
    const { x, y, width, height, text, fontSize = 18 } = opts;
    
    // Normalize colors
    const backgroundColor = normalizeColor(opts.color || palette[idx % palette.length]);
    const strokeColor = normalizeColor(opts.stroke || '#1f2937');
    const textColor = text ? getContrastingTextColor(backgroundColor) : '#000000';
    
    const rect = {
      id: makeId(),
      type: 'rectangle',
      x, y, width, height,
      angle: 0,
      strokeColor: strokeColor,
      backgroundColor: backgroundColor,
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      roundness: { type: 3, value: 12 },
      groupIds: [],
      frameId: null,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      isDeleted: false,
      versionNonce: Math.floor(Math.random() * 1000000),
      seed: Math.floor(Math.random() * 2147483647),
    };
    
    const elements: any[] = [rect];
    
    if (text) {
      // Use accurate text dimensions for positioning and sizing
      const textDimensions = getTextDimensions(text, fontSize, 1);
      
      // Center the text within the rectangle
      const textX = x + (width - textDimensions.width) / 2;
      const textY = y + (height - textDimensions.height) / 2;
      
      // Create text element with proper contrast color and accurate sizing
      const textEl = {
        id: makeId(),
        type: 'text',
        x: Math.max(textX, x + 5), // Ensure minimum padding from left edge
        y: Math.max(textY, y + 5), // Ensure minimum padding from top edge
        angle: 0,
        strokeColor: textColor, // Use contrasting color
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        groupIds: [],
        frameId: null,
        boundElements: null,
        updated: Date.now(),
        link: null,
        locked: false,
        isDeleted: false,
        text: text,
        fontSize: fontSize,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: text,
        autoResize: true,
        lineHeight: 1.25,
        width: textDimensions.width,
        height: textDimensions.height,
        versionNonce: Math.floor(Math.random() * 1000000),
        seed: Math.floor(Math.random() * 2147483647),
      };
      elements.push(textEl);
    }
    
    insertElements(elements);
  };

  const addArrow = (opts: { from: { x: number; y: number }; to: { x: number; y: number }; color?: string; width?: number }) => {
    const { from, to, width } = opts;
    const color = normalizeColor(opts.color || '#111827');
    const dx = (to.x - from.x) || 0;
    const dy = (to.y - from.y) || 0;
    const arrow = {
      id: makeId(),
      type: 'arrow',
      x: from.x,
      y: from.y,
      width: 0,
      height: 0,
      angle: 0,
      strokeColor: color,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: width ?? 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      groupIds: [],
      frameId: null,
      boundElements: null,
      updated: Date.now(),
      link: null,
      locked: false,
      isDeleted: false,
      points: [ [0, 0], [dx, dy] ],
      lastCommittedPoint: null,
      startBinding: null,
      endBinding: null,
      startArrowhead: 'arrow',
      endArrowhead: 'arrow',
      elbowed: false,
      versionNonce: Math.floor(Math.random() * 1000000),
      seed: Math.floor(Math.random() * 2147483647),
    } as any;
    insertElements([arrow]);
  };

  const insertPlan = async (plan: WhiteboardPlan) => {
    // Hide-and-fit: fade out container to avoid visual jump
    const container = containerRef.current;
    if (container) {
      try { container.style.opacity = '0'; } catch {}
    }

    const tasks: Promise<any>[] = [];
    plan.images?.forEach((img) => {
      tasks.push(addImageByQuery(img.query, img.x ?? 0, img.y ?? 0, img.width ?? 480, img.height ?? 320) as any);
    });
    // Insert boxes immediately with proper colors
    plan.boxes?.forEach((box, i) => addRoundedBox(box, i));
    // Wait for images so arrows can be drawn on top
    await Promise.allSettled(tasks);
    // Now insert arrows last for correct z-order
    plan.arrows?.forEach((a) => addArrow(a));
    // Scroll after insertion to keep content in view without changing zoom
    try {
      const els = excalidrawAPI?.getSceneElements?.() || [];
      if (els.length && excalidrawAPI?.scrollToContent) {
        // Keep zoom 1:1 and only scroll to content
        excalidrawAPI.updateScene?.({ appState: { zoom: { value: 1 } } });
        excalidrawAPI.scrollToContent(els, { fitToContent: false, animate: false });
      }
    } catch {}

    // Restore visibility on next frame to ensure layout is settled
    requestAnimationFrame(() => {
      if (container) {
        try { container.style.opacity = '1'; } catch {}
      }
    });
  };

  // Expose plan insertion for LLM pipeline / manual testing
  useEffect(() => {
    if (!excalidrawAPI) return;
    (window as any).__excalidrawInsertPlan = async (plan: WhiteboardPlan) => insertPlan(plan);
    (window as any).__excalidrawSetViewportSize = (w: number, h: number) => {
      const el = containerRef.current;
      if (!el) return;
      if (Number.isFinite(w)) el.style.width = `${w}px`;
      if (Number.isFinite(h)) el.style.height = `${h}px`;
      // Refit after size change on next frame
      requestAnimationFrame(() => {
        try {
          const els = excalidrawAPI.getSceneElements?.() || [];
          if (els.length && excalidrawAPI.scrollToContent) {
            excalidrawAPI.updateScene?.({ appState: { zoom: { value: 1 } } });
            excalidrawAPI.scrollToContent(els, { fitToContent: false, animate: false });
          }
        } catch {}
      });
    };
    return () => {
      try { delete (window as any).__excalidrawInsertPlan; } catch {}
      try { delete (window as any).__excalidrawSetViewportSize; } catch {}
    };
  }, [excalidrawAPI]);

  return (
    <div 
      ref={containerRef} 
      className="excalidraw-scrollable" 
      style={{ 
        position: 'relative', 
        height: '100%', 
        width: '100%', 
        zIndex: 20, 
        backgroundColor: 'transparent', 
        transition: 'opacity 80ms ease',
        overflow: 'auto'
      }}
    >
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        renderTopRightUI={() => null}
        UIOptions={{
          canvasActions: {
            changeViewBackgroundColor: false,
            clearCanvas: false,
            export: false,
            loadScene: false,
            saveToActiveFile: false,
            toggleTheme: false,
            saveAsImage: false,
          },
          tools: {
            image: false,
          },
        }}
        viewModeEnabled={false}
        zenModeEnabled={false}
        gridModeEnabled={false}
        initialData={{
          appState: {
            viewBackgroundColor: 'transparent',
            scrollX: 0,
            scrollY: 0,
            zoom: { value: 1 as NormalizedZoomValue }
          }
        }}
      />
      <style jsx global>{`
        .excalidraw-scrollable .layer-ui__wrapper__top-right { display: none !important; }
        .excalidraw-scrollable .layer-ui__wrapper__top-left { display: none !important; }
        .excalidraw-scrollable .sidebar-trigger { display: none !important; }
        .excalidraw-scrollable .App-toolbar-container { display: none !important; }
        .excalidraw-scrollable .App-bottom-bar { display: none !important; }
        .excalidraw-scrollable .help-icon { display: none !important; }
        .excalidraw-scrollable .fixed-zen-mode-transition,
        .excalidraw-scrollable .zen-mode-transition { display: none !important; }
        .excalidraw-scrollable .layer-ui__wrapper { display: none !important; }
      `}</style>
    </div>
  );
};

export default ExcalidrawWrapper;
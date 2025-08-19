"use client";

import React, { useCallback, useEffect, useRef } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useSessionStore } from "@/lib/store";
import { useExcalidrawIntegration } from "@/hooks/useExcalidrawIntegration";

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

  // Removed scroll position reset to allow programmatic scrolling (scrollToContent)

  // Sync with session store
  useEffect(() => {
    if (excalidrawAPI && excalidrawAPI !== excalidrawAPIFromStore) {
      setExcalidrawAPIToStore(excalidrawAPI);
    }
  }, [excalidrawAPI, excalidrawAPIFromStore, setExcalidrawAPIToStore]);

  // Expose debug functions to window (merge instead of overwrite)
  useEffect(() => {
    if (excalidrawAPI) {
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
        convertSkeletonToExcalidraw: (skeletonElements: any[]) => {
          // Enhanced implementation for skeleton to Excalidraw conversion with proper element type handling
          return skeletonElements.map((element, index) => {
            const baseElement = {
              id: `element_${Date.now()}_${index}`,
              type: element.type || 'rectangle',
              x: element.x || 0,
              y: element.y || 0,
              angle: 0,
              strokeColor: element.strokeColor || '#1e1e1e',
              backgroundColor: element.backgroundColor || 'transparent',
              fillStyle: 'solid',
              strokeWidth: element.strokeWidth || 2,
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
                return {
                  ...baseElement,
                  width: element.width || 120,
                  height: element.height || 25,
                  text: element.text || '',
                  fontSize: element.fontSize || 16,
                  fontFamily: 1,
                  textAlign: 'center',
                  verticalAlign: 'middle',
                  containerId: null,
                  originalText: element.text || '',
                  lineHeight: 1.25,
                  baseline: Math.round((element.fontSize || 16) * 0.9)
                };
              
              case 'ellipse':
                return {
                  ...baseElement,
                  width: element.width || 120,
                  height: element.height || 120
                };
              
              case 'rectangle':
              default:
                return {
                  ...baseElement,
                  width: element.width || 120,
                  height: element.height || 60,
                  roundness: { type: 3, value: 8 }
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
  }, [excalidrawAPI, toggleLaserPointer]);

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
  
  // Removed handleCanvasChange which prevented scrolling

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
    const { x, y, width, height, text, color, stroke, fontSize } = opts;
    const rect = {
      id: makeId(),
      type: 'rectangle',
      x, y, width, height,
      angle: 0,
      strokeColor: stroke || '#1f2937',
      backgroundColor: color || palette[idx % palette.length],
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
      const textEl = {
        id: makeId(),
        type: 'text',
        x: x + 16,
        y: y + (height / 2) - (fontSize ? fontSize / 2 : 10),
        width: Math.max(80, width - 32),
        height: fontSize ? fontSize + 8 : 24,
        angle: 0,
        strokeColor: '#111827',
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
        text,
        fontSize: fontSize || 18,
        fontFamily: 1,
        textAlign: 'center',
        verticalAlign: 'middle',
        containerId: rect.id,
        originalText: text,
        autoResize: false,
        lineHeight: 1.25,
        versionNonce: Math.floor(Math.random() * 1000000),
        seed: Math.floor(Math.random() * 2147483647),
      };
      elements.push(textEl);
    }
    insertElements(elements);
  };

  const addArrow = (opts: { from: { x: number; y: number }; to: { x: number; y: number }; color?: string; width?: number }) => {
    const { from, to, color, width } = opts;
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
      strokeColor: color || '#111827',
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
    // Insert boxes immediately
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


  // Ensure scene fits and leaves a small margin so text isn't clipped at edges
  useEffect(() => {
    if (!excalidrawAPI) return;

    const didInitialFitRef = { current: false } as React.MutableRefObject<boolean>;
    const fittingRef = { current: false } as React.MutableRefObject<boolean>;

    const fit = (force = false) => {
      if (fittingRef.current) return;
      try {
        fittingRef.current = true;
        const els = excalidrawAPI.getSceneElements?.() || [];
        if (els.length && excalidrawAPI.scrollToContent) {
          // Keep zoom 1 and only scroll when needed; avoid scaling content
          if (force || !didInitialFitRef.current) {
            excalidrawAPI.updateScene?.({ appState: { zoom: { value: 1 } } });
            excalidrawAPI.scrollToContent(els, { fitToContent: false, animate: false });
            didInitialFitRef.current = true;
          }
        }
      } catch {}
      finally {
        fittingRef.current = false;
      }
    };

    // run after layout paints to get accurate container size
    const raf = requestAnimationFrame(() => fit(true));

    const onResize = () => fit(true);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(raf);
    };
  }, [excalidrawAPI]);

  return (
    <div ref={containerRef} className="excalidraw-no-ui" style={{ position: 'relative', height: '100%', width: '100%', zIndex: 20, backgroundColor: 'transparent', transition: 'opacity 80ms ease' }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        onPointerUpdate={handlePointerUpdate}
        renderTopRightUI={() => null} // This will remove the "Library" button
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
        viewModeEnabled={true}
        zenModeEnabled={false}
        gridModeEnabled={false}
        initialData={{
          appState: {
            viewBackgroundColor: 'transparent',
            // Set initial scroll position to 0,0
            scrollX: 0,
            scrollY: 0,
          }
        }}
      />
      {/* Scoped UI suppression for control panel: hide main menu, toolbar, and library trigger */}
      <style jsx global>{`
        .excalidraw-no-ui .layer-ui__wrapper__top-right { display: none !important; }
        .excalidraw-no-ui .layer-ui__wrapper__top-left { display: none !important; }
        .excalidraw-no-ui .sidebar-trigger { display: none !important; }
        .excalidraw-no-ui .App-toolbar-container { display: none !important; }
        .excalidraw-no-ui .App-bottom-bar { display: none !important; }
        .excalidraw-no-ui .help-icon { display: none !important; }
        .excalidraw-no-ui .fixed-zen-mode-transition,
        .excalidraw-no-ui .zen-mode-transition { display: none !important; }
        /* Fallback: hide the entire UI overlay layer if any remnants remain */
        .excalidraw-no-ui .layer-ui__wrapper { display: none !important; }
      `}</style>
    </div>
  );
};

export default ExcalidrawWrapper;
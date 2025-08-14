"use client";

import React, { useCallback, useEffect, useRef } from "react"; // Import useRef
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

  // Ref to prevent infinite loops when resetting scroll position
  const isRestoringPosition = useRef(false);

  // Sync with session store
  useEffect(() => {
    if (excalidrawAPI && excalidrawAPI !== excalidrawAPIFromStore) {
      setExcalidrawAPIToStore(excalidrawAPI);
    }
  }, [excalidrawAPI, excalidrawAPIFromStore, setExcalidrawAPIToStore]);

  // Expose debug functions to window
  useEffect(() => {
    if (excalidrawAPI) {
      window.__excalidrawDebug = {
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
        getSceneElements: () => excalidrawAPI.getSceneElements(),
        clearCanvas: () => clearCanvas(),
        sendMessage: (message: string) => sendChatMessage(message),
        setElements: (elements: any[]) => updateElements(elements),
        updateScene: (scene: { elements?: any[], appState?: any }) => {
          excalidrawAPI.updateScene(scene);
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
    }
  }, [excalidrawAPI, setExcalidrawAPI]);
  
  // This function will be called whenever the canvas changes.
  // We use it to detect and prevent scrolling.
  const handleCanvasChange = useCallback((elements: any, appState: any) => {
    if (isRestoringPosition.current) {
      return;
    }

    if (excalidrawAPI && (appState.scrollX !== 0 || appState.scrollY !== 0)) {
      isRestoringPosition.current = true;
      excalidrawAPI.updateScene({
        elements,
        appState: {
          ...appState,
          scrollX: 0,
          scrollY: 0,
        },
      });
      // Use setTimeout to reset the flag after the update has processed
      setTimeout(() => {
        isRestoringPosition.current = false;
      }, 0);
    }
  }, [excalidrawAPI]);


  return (
    <div style={{ height: '100vh', width: '100%', zIndex: 10, backgroundColor: 'transparent' }}>
      <Excalidraw
        excalidrawAPI={handleExcalidrawAPI}
        onPointerUpdate={handlePointerUpdate}
        onChange={handleCanvasChange} // Add the change handler to prevent scrolling
        renderTopRightUI={() => null} // This will remove the "Library" button
        UIOptions={{
          // This hides the hand tool from the toolbar
          tools: {
            hand: false,
          },
        }}
        viewModeEnabled={false}
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
    </div>
  );
};

export default ExcalidrawWrapper;